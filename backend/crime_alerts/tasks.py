"""Celery tasks for crime alerts."""
import logging

from celery import shared_task
from django.contrib.auth import get_user_model

from . import services
from .models import AlertNotification, NotificationPreference

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def match_crime_alerts(crime_id):
    """Match a newly created crime against user alerts and send notifications."""
    from crimes.models import Crime

    crime = Crime.objects.select_related('category').filter(pk=crime_id).first()
    if crime is None:
        return 0
    return len(services.process_new_crime(crime))


@shared_task(ignore_result=True)
def deliver_email_notification(notification_id):
    """Send one pending email notification. Failures are recorded on the row."""
    notification = (
        AlertNotification.objects.select_related('user')
        .filter(pk=notification_id, status='pending').first()
    )
    if notification is None:
        return False
    return services.send_email_notification(notification)


@shared_task(ignore_result=True)
def send_notification_digests():
    """Send digest emails (hourly/daily/weekly users, or mail held in quiet hours)."""
    User = get_user_model()
    user_ids = (
        AlertNotification.objects.filter(notification_type=services.EMAIL, status='pending')
        .values_list('user_id', flat=True).distinct()
    )
    sent = 0
    for user in User.objects.filter(id__in=list(user_ids)):
        prefs, _ = NotificationPreference.objects.get_or_create(user=user)
        due = services.due_digest_notifications(user, prefs)
        if not due:
            continue
        if len(due) == 1:
            sent += int(services.send_email_notification(due[0]))
        else:
            sent += int(services.send_digest(user, due))
    return sent
