"""
Tests for alert matching and notification delivery.
"""
from datetime import time, timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.core import mail
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from agencies.models import Agency
from crimes.models import Crime, CrimeCategory

from . import services
from .models import Alert, AlertNotification, NotificationPreference
from .tasks import send_notification_digests

User = get_user_model()
PASSWORD = 'Str0ng!Passw0rd'

# Nairobi CBD and a point about 1.1 km east of it
CBD = Point(36.8219, -1.2864, srid=4326)
NEAR = Point(36.8319, -1.2864, srid=4326)
FAR = Point(36.9500, -1.2864, srid=4326)  # about 14 km away


class AlertTestMixin:

    def setUp(self):
        self.agency = Agency.objects.create(name='Nairobi Police')
        self.theft = CrimeCategory.objects.create(name='Theft', severity_level=4)
        self.assault = CrimeCategory.objects.create(name='Assault', severity_level=7)
        self.user = User.objects.create_user(
            username='watcher', email='watcher@example.com', password=PASSWORD
        )
        self.alert = Alert.objects.create(
            user=self.user, name='Home', location=CBD, radius=2, time_window=48,
            notification_methods={'email': True},
        )
        self.counter = 0

    def make_crime(self, location=NEAR, category=None, days_ago=0, **extra):
        self.counter += 1
        when = timezone.localtime() - timedelta(days=days_ago)
        with self.captureOnCommitCallbacks(execute=True):
            return Crime.objects.create(
                case_number=f'CASE-{self.counter}', category=category or self.theft,
                description='Test crime', date=when.date(), time=time(0, 0),
                location=location, block_address='Moi Avenue', agency=self.agency, **extra,
            )

    def in_app(self):
        return AlertNotification.objects.filter(user=self.user, notification_type='in_app')

    def emails(self):
        return AlertNotification.objects.filter(user=self.user, notification_type='email')


class AlertMatchingTests(AlertTestMixin, TestCase):

    def test_new_crime_in_radius_creates_in_app_and_email(self):
        crime = self.make_crime()
        self.assertEqual(self.in_app().count(), 1)
        note = self.in_app().get()
        self.assertEqual(note.crime_data['crime_id'], crime.id)
        self.assertEqual(note.status, 'sent')
        self.assertEqual(self.emails().get().status, 'sent')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['watcher@example.com'])
        self.assertIn('Theft', mail.outbox[0].subject)
        self.alert.refresh_from_db()
        self.assertEqual(self.alert.total_notifications, 1)
        self.assertIsNotNone(self.alert.last_notified)

    def test_crime_outside_radius_is_ignored(self):
        self.make_crime(location=FAR)
        self.assertFalse(AlertNotification.objects.exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_crime_type_filter(self):
        self.alert.crime_types.add(self.assault)
        self.make_crime(category=self.theft)
        self.assertFalse(self.in_app().exists())
        self.make_crime(category=self.assault)
        self.assertEqual(self.in_app().count(), 1)

    def test_old_crime_outside_time_window_is_ignored(self):
        self.make_crime(days_ago=10)
        self.assertFalse(AlertNotification.objects.exists())

    def test_inactive_alert_and_unfounded_crime_are_ignored(self):
        self.make_crime(status='unfounded')
        self.assertFalse(AlertNotification.objects.exists())
        self.alert.is_active = False
        self.alert.save()
        self.make_crime()
        self.assertFalse(AlertNotification.objects.exists())

    def test_updating_a_crime_does_not_notify_again(self):
        crime = self.make_crime()
        with self.captureOnCommitCallbacks(execute=True):
            crime.description = 'Updated'
            crime.save()
        self.assertEqual(self.in_app().count(), 1)
        # Re-running the matcher for the same crime is also a no-op
        services.process_new_crime(crime)
        self.assertEqual(self.in_app().count(), 1)

    def test_email_opt_out_keeps_in_app(self):
        self.alert.notification_methods = {'email': False}
        self.alert.save()
        self.make_crime()
        self.assertEqual(self.in_app().count(), 1)
        self.assertFalse(self.emails().exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_min_severity_preference(self):
        NotificationPreference.objects.create(user=self.user, min_severity=5)
        self.make_crime(category=self.theft)  # severity 4
        self.assertFalse(AlertNotification.objects.exists())
        self.make_crime(category=self.assault)  # severity 7
        self.assertEqual(self.in_app().count(), 1)

    def test_smtp_failure_marks_email_failed(self):
        with mock.patch('crime_alerts.services.send_mail', side_effect=OSError('smtp down')):
            self.make_crime()
        email = self.emails().get()
        self.assertEqual(email.status, 'failed')
        self.assertIn('smtp down', email.error_message)
        self.assertEqual(self.in_app().count(), 1)


class DigestTests(AlertTestMixin, TestCase):

    def test_daily_digest_waits_then_sends_one_email(self):
        NotificationPreference.objects.create(user=self.user, frequency='daily')
        self.make_crime()
        self.make_crime()
        self.assertEqual(self.emails().filter(status='pending').count(), 2)
        self.assertEqual(len(mail.outbox), 0)

        send_notification_digests()  # too early
        self.assertEqual(len(mail.outbox), 0)

        self.emails().update(created_at=timezone.now() - timedelta(days=2))
        send_notification_digests()
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('2 new crime alert', mail.outbox[0].subject)
        self.assertEqual(self.emails().filter(status='sent').count(), 2)

    def test_quiet_hours_hold_email(self):
        start = (timezone.localtime() - timedelta(hours=1)).time()
        end = (timezone.localtime() + timedelta(hours=1)).time()
        NotificationPreference.objects.create(
            user=self.user, quiet_hours_start=start, quiet_hours_end=end
        )
        self.make_crime()
        self.assertEqual(self.emails().get().status, 'pending')
        self.assertEqual(len(mail.outbox), 0)


class NotificationApiTests(AlertTestMixin, APITestCase):

    def test_list_hides_email_rows_and_mark_all_read(self):
        self.make_crime()
        self.client.force_authenticate(self.user)
        response = self.client.get('/api/alerts/notifications/')
        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['notification_type'], 'in_app')

        response = self.client.post('/api/alerts/notifications/mark_all_as_read/')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(self.in_app().get().status, 'read')
        self.assertEqual(self.emails().get().status, 'sent')

    def test_other_users_cannot_see_notifications(self):
        self.make_crime()
        other = User.objects.create_user(username='other', email='o@example.com', password=PASSWORD)
        self.client.force_authenticate(other)
        response = self.client.get('/api/alerts/notifications/')
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)
