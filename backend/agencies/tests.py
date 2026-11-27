"""
Permission tests for the agencies API.
"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Agency, APIKey

User = get_user_model()

PASSWORD = 'Str0ng!Passw0rd'


def agency_payload(response):
    """AgencySerializer is a GeoJSON feature; fields live under 'properties'."""
    return response.data.get('properties', response.data)


class AgencyPermissionTests(APITestCase):

    def setUp(self):
        self.agency_a = Agency.objects.create(name='Agency A', api_key='external-secret-a')
        self.agency_b = Agency.objects.create(name='Agency B', api_key='external-secret-b')
        APIKey.objects.create(agency=self.agency_a, name='Key A', key='a' * 64)

        self.agency_user_a = User.objects.create_user(
            username='agency_a', email='a@example.com', password=PASSWORD,
            user_type='agency', agency=self.agency_a,
        )
        self.regular = User.objects.create_user(
            username='regular', email='r@example.com', password=PASSWORD
        )
        self.staff = User.objects.create_user(
            username='staff', email='s@example.com', password=PASSWORD, is_staff=True
        )

    def url(self, agency):
        return f'/api/agencies/agencies/{agency.pk}/'

    def test_agency_user_cannot_edit_another_agency(self):
        self.client.force_authenticate(self.agency_user_a)
        response = self.client.patch(self.url(self.agency_b), {'name': 'Hijacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.agency_b.refresh_from_db()
        self.assertEqual(self.agency_b.name, 'Agency B')

    def test_agency_user_can_edit_own_agency_but_not_status(self):
        self.client.force_authenticate(self.agency_user_a)
        response = self.client.patch(
            self.url(self.agency_a), {'name': 'Agency A2', 'status': 'approved'}, format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.agency_a.refresh_from_db()
        self.assertEqual(self.agency_a.name, 'Agency A2')
        self.assertEqual(self.agency_a.status, 'pending')

    def test_agency_user_cannot_delete_agencies(self):
        self.client.force_authenticate(self.agency_user_a)
        for agency in (self.agency_a, self.agency_b):
            response = self.client.delete(self.url(agency))
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Agency.objects.count(), 2)

    def test_agency_user_cannot_approve_itself(self):
        self.client.force_authenticate(self.agency_user_a)
        response = self.client.post(f'{self.url(self.agency_a)}approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_edit_agency(self):
        self.client.force_authenticate(self.regular)
        response = self.client.patch(self.url(self.agency_a), {'name': 'X'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_delete_agency(self):
        self.client.force_authenticate(self.staff)
        response = self.client.delete(self.url(self.agency_b))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_agency_detail_does_not_expose_credentials(self):
        self.client.force_authenticate(self.regular)
        response = self.client.get(self.url(self.agency_a))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = agency_payload(response)
        for field in ('api_key', 'api_keys', 'import_logs'):
            self.assertNotIn(field, data)
        self.assertNotIn('external-secret-a', str(response.content))
        self.assertNotIn('a' * 64, str(response.content))

    def test_owner_still_gets_api_keys_from_owner_endpoint(self):
        self.client.force_authenticate(self.agency_user_a)
        response = self.client.get(f'{self.url(self.agency_a)}api_keys/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['key'], 'a' * 64)

    def test_other_users_cannot_read_api_keys_endpoint(self):
        self.client.force_authenticate(self.regular)
        response = self.client.get(f'{self.url(self.agency_a)}api_keys/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
