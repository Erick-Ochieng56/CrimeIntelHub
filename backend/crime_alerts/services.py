"""
Alert matching and notification delivery.

Flow: a new Crime is saved -> crime_alerts.signals queues match_crime_alerts ->
find_matching_alerts() picks the active alerts it satisfies -> notify_alert()
creates an in-app AlertNotification and, if the user wants email, an email
AlertNotification that is sent right away or held for a digest.
"""
import logging
from datetime import datetime, time as dt_time, timedelta

from django.conf import settings
from django.contrib.gis.db.models.functions import Distance
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import Alert, AlertNotification, NotificationPreference

logger = logging.getLogger(__name__)

IN_APP = 'in_app'
EMAIL = 'email'

# How long notifications wait before a digest email goes out
DIGEST_INTERVALS = {
    'hourly': timedelta(hours=1),
    'daily': timedelta(days=1),
    'weekly': timedelta(weeks=1),
}


def crime_occurred_at(crime):
    """Aware datetime for when the crime happened (midnight if no time)."""
    naive = datetime.combine(crime.date, crime.time or dt_time.min)
    return timezone.make_aware(naive, timezone.get_default_timezone())


def find_matching_alerts(crime):
    """Return active alerts whose area, crime types and time window match the crime."""
    if crime.location is None or crime.status not in crime.PUBLIC_VISIBLE_STATUSES:
        return []

    candidates = (
        Alert.objects.filter(is_active=True, user__is_active=True)
        .annotate(distance=Distance('location', crime.location))
        # Geography distance is in metres, alert radius is in kilometres
        .filter(distance__lte=F('radius') * 1000)
        .select_related('user')
        .prefetch_related('crime_types', 'districts', 'neighborhoods')
    )

    occurred = crime_occurred_at(crime)
    now = timezone.now()
    matches = []
    for alert in candidates:
        if occurred < now - timedelta(hours=alert.time_window):
            continue  # too old for this alert (e.g. historical imports)
        type_ids = {c.id for c in alert.crime_types.all()}
        if type_ids and crime.category_id not in type_ids:
            continue
        district_ids = {d.id for d in alert.districts.all()}
        if district_ids and crime.district_id not in district_ids:
            continue
        neighborhood_ids = {n.id for n in alert.neighborhoods.all()}
        if neighborhood_ids and crime.neighborhood_id not in neighborhood_ids:
            continue
        matches.append(alert)
    return matches


def _preferences(user):
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    return prefs


def _passes_preferences(prefs, crime):
    severity = getattr(crime.category, 'severity_level', None) or 0
    if severity < (prefs.min_severity or 1):
        return False
    type_prefs = prefs.crime_type_preferences or {}
    name = (crime.category.name or '').strip()
    for key in (name, name.lower()):
        if key in type_prefs and type_prefs[key] is False:
            return False
    return True


def in_quiet_hours(prefs, at=None):
    start, end = prefs.quiet_hours_start, prefs.quiet_hours_end
    if not start or not end or start == end:
        return False
    now = timezone.localtime(at or timezone.now()).time()
    if start < end:
        return start <= now < end
    return now >= start or now < end  # window crosses midnight


def _email_wanted(alert, prefs):
    methods = alert.notification_methods or {}
    return bool(methods.get('email', True)) and prefs.email_enabled and bool(alert.user.email)


def _daily_email_cap_reached(user, prefs):
    since = timezone.now() - timedelta(days=1)
    sent = AlertNotification.objects.filter(
        user=user, notification_type=EMAIL, status='sent', sent_at__gte=since
    ).count()
    return sent >= (prefs.max_daily_notifications or 0)


def crime_payload(crime, alert):
    return {
        'crime_id': crime.id,
        'case_number': crime.case_number,
        'category': crime.category.name,
        'date': crime.date.isoformat(),
        'time': crime.time.isoformat() if crime.time else None,
        'block_address': crime.block_address,
        'latitude': crime.location.y if crime.location else None,
        'longitude': crime.location.x if crime.location else None,
        'distance_km': round(alert.distance.km, 2) if getattr(alert, 'distance', None) else None,
    }


def notify_alert(alert, crime):
    """
    Create the notifications for one alert/crime match.
    Returns the list of AlertNotification rows created (empty if skipped).
    """
    if AlertNotification.objects.filter(
        alert=alert, notification_type=IN_APP, crime_data__crime_id=crime.id
    ).exists():
        return []  # already notified for this crime

    prefs = _preferences(alert.user)
    if not _passes_preferences(prefs, crime):
        return []

    data = crime_payload(crime, alert)
    title = f"{crime.category.name} reported near '{alert.name}'"
    distance = f" ({data['distance_km']} km away)" if data['distance_km'] is not None else ''
    message = (
        f"A {crime.category.name.lower()} was reported at {crime.block_address}{distance} "
        f"on {crime.date.isoformat()}. Case number: {crime.case_number}."
    )
    now = timezone.now()
    created = [
        AlertNotification.objects.create(
            alert=alert, user=alert.user, title=title, message=message,
            crime_data=data, notification_type=IN_APP, status='sent', sent_at=now,
        )
    ]

    if _email_wanted(alert, prefs):
        email = AlertNotification.objects.create(
            alert=alert, user=alert.user, title=title, message=message,
            crime_data=data, notification_type=EMAIL, status='pending',
        )
        created.append(email)
        immediate = prefs.frequency == 'immediately' and not in_quiet_hours(prefs)
        if immediate:
            from .tasks import deliver_email_notification
            transaction.on_commit(lambda: deliver_email_notification.delay(email.id))
        # Otherwise it stays pending and send_notification_digests picks it up

    Alert.objects.filter(pk=alert.pk).update(
        total_notifications=F('total_notifications') + 1, last_notified=now
    )
    return created


def process_new_crime(crime):
    """Match a crime against all alerts and notify. Returns notifications created."""
    created = []
    for alert in find_matching_alerts(crime):
        try:
            created.extend(notify_alert(alert, crime))
        except Exception:  # one bad alert must not stop the others
            logger.exception('Failed to notify alert %s for crime %s', alert.pk, crime.pk)
    return created


def _alert_link():
    return f"{settings.FRONTEND_URL.rstrip('/')}/alerts"


def send_email_notification(notification):
    """Send one pending email notification now. Returns True if sent."""
    prefs = _preferences(notification.user)
    if _daily_email_cap_reached(notification.user, prefs):
        notification.status = 'failed'
        notification.error_message = 'Daily email limit reached'
        notification.save(update_fields=['status', 'error_message'])
        return False
    body = (
        f"{notification.message}\n\n"
        f"View your alerts: {_alert_link()}\n\n"
        "You get this email because you created a crime alert on CrimeIntelHub. "
        "You can change or turn off alert emails in your notification settings."
    )
    try:
        send_mail(
            subject=notification.title,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[notification.user.email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception('Alert email %s could not be sent', notification.pk)
        notification.status = 'failed'
        notification.error_message = str(exc)[:1000]
        notification.save(update_fields=['status', 'error_message'])
        return False
    notification.status = 'sent'
    notification.sent_at = timezone.now()
    notification.error_message = None
    notification.save(update_fields=['status', 'sent_at', 'error_message'])
    return True


def send_digest(user, notifications):
    """Send one email that summarises several pending notifications."""
    notifications = list(notifications)
    if not notifications:
        return False
    prefs = _preferences(user)
    if _daily_email_cap_reached(user, prefs):
        return False
    lines = [f"- {n.title}: {n.message}" for n in notifications]
    body = (
        f"You have {len(notifications)} new crime alert(s):\n\n" + "\n".join(lines) +
        f"\n\nView your alerts: {_alert_link()}\n\n"
        "You can change how often you get these emails in your notification settings."
    )
    ids = [n.id for n in notifications]
    try:
        send_mail(
            subject=f"CrimeIntelHub: {len(notifications)} new crime alert(s)",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.exception('Alert digest for user %s could not be sent', user.pk)
        AlertNotification.objects.filter(id__in=ids).update(
            status='failed', error_message=str(exc)[:1000]
        )
        return False
    AlertNotification.objects.filter(id__in=ids).update(
        status='sent', sent_at=timezone.now(), error_message=None
    )
    return True


def due_digest_notifications(user, prefs, now=None):
    """Pending email notifications for this user that should go out now."""
    now = now or timezone.now()
    pending = AlertNotification.objects.filter(
        user=user, notification_type=EMAIL, status='pending'
    ).order_by('created_at')
    oldest = pending.first()
    if oldest is None or in_quiet_hours(prefs, now):
        return []
    interval = DIGEST_INTERVALS.get(prefs.frequency, timedelta(0))
    if now - oldest.created_at < interval:
        return []
    return list(pending)
