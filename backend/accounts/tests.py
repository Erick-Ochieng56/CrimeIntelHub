"""
Permission and auth regression tests for the accounts app.
"""
from unittest import mock

from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

PASSWORD = 'Str0ng!Passw0rd'


class ProfilePrivilegeTests(APITestCase):
    """A user must not be able to grant themselves admin or agency rights."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='regular', email='regular@example.com', password=PASSWORD
        )
        self.client.force_authenticate(self.user)

    def test_cannot_promote_self_to_admin_via_profile(self):
        response = self.client.patch('/api/auth/profile/', {'user_type': 'admin'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.user_type, 'user')
        self.assertFalse(self.user.is_staff)

    def test_cannot_promote_self_to_agency_via_profile(self):
        self.client.patch('/api/auth/profile/', {'user_type': 'agency'}, format='json')
        self.user.refresh_from_db()
        self.assertEqual(self.user.user_type, 'user')

    def test_profile_still_updates_normal_fields(self):
        response = self.client.patch('/api/auth/profile/', {'first_name': 'Erick'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Erick')

    def test_regular_user_cannot_use_admin_user_management(self):
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminPermissionTests(APITestCase):
    """Admin rights come from is_staff/is_superuser, not from user_type."""

    def test_user_type_admin_without_staff_is_not_admin(self):
        fake_admin = User.objects.create_user(
            username='fakeadmin', email='fake@example.com', password=PASSWORD, user_type='admin'
        )
        self.client.force_authenticate(fake_admin)
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_is_admin(self):
        staff = User.objects.create_user(
            username='staff', email='staff@example.com', password=PASSWORD, is_staff=True
        )
        self.client.force_authenticate(staff)
        response = self.client.get('/api/auth/admin/users/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_promotion_sets_staff_flag(self):
        staff = User.objects.create_user(
            username='staff', email='staff@example.com', password=PASSWORD, is_staff=True
        )
        target = User.objects.create_user(
            username='target', email='target@example.com', password=PASSWORD
        )
        self.client.force_authenticate(staff)
        response = self.client.patch(
            f'/api/auth/admin/users/{target.pk}/', {'user_type': 'admin'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target.refresh_from_db()
        self.assertEqual(target.user_type, 'admin')
        self.assertTrue(target.is_staff)


class PasswordResetRequestTests(APITestCase):

    def test_email_is_url_encoded_in_reset_link(self):
        User.objects.create_user(username='plus', email='a+b@example.com', password=PASSWORD)
        response = self.client.post(
            '/api/auth/password-reset-request/', {'email': 'a+b@example.com'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('email=a%2Bb%40example.com', mail.outbox[0].body)

    def test_mail_failure_returns_same_generic_response(self):
        User.objects.create_user(username='known', email='known@example.com', password=PASSWORD)
        unknown = self.client.post(
            '/api/auth/password-reset-request/', {'email': 'nobody@example.com'}, format='json'
        )
        with mock.patch('accounts.views.send_mail', side_effect=OSError('smtp down')):
            known = self.client.post(
                '/api/auth/password-reset-request/', {'email': 'known@example.com'}, format='json'
            )
        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data, unknown.data)


class FrontendErrorLogTests(APITestCase):

    def test_accepts_small_payload(self):
        response = self.client.post('/api/errors/log', {'message': 'boom'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_oversized_payload(self):
        response = self.client.post('/api/errors/log', {'message': 'x' * 30000}, format='json')
        self.assertEqual(response.status_code, 413)
