"""
URL configuration for crime_alerts app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, AlertNotificationViewSet, NotificationPreferenceViewSet, PublicSafetyAlertViewSet

app_name = 'crime_alerts'

router = DefaultRouter()
router.register('alerts', AlertViewSet, basename='alert')
router.register('notifications', AlertNotificationViewSet, basename='notification')
router.register('preferences', NotificationPreferenceViewSet, basename='preference')
router.register('public-alerts', PublicSafetyAlertViewSet, basename='public-alert')

urlpatterns = [
    path('', include(router.urls)),
    # For future custom non-ViewSet endpoints
]