"""
Tests for the maps app.
"""
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse

from .views import RouteProxyThrottle


class RouteProxyThrottleTests(TestCase):

    def setUp(self):
        cache.clear()

    def test_public_route_proxy_is_rate_limited(self):
        url = reverse('maps:map-route')
        with mock.patch.object(RouteProxyThrottle, 'THROTTLE_RATES', {'routing': '2/min'}):
            # Missing params give 400, but each call still counts towards the limit
            self.assertEqual(self.client.get(url).status_code, 400)
            self.assertEqual(self.client.get(url).status_code, 400)
            self.assertEqual(self.client.get(url).status_code, 429)
