from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertViewSet, SavedLocationViewSet, AlertNotificationViewSet

router = DefaultRouter()
router.register(r'', AlertViewSet, basename='alert')
router.register(r'locations', SavedLocationViewSet, basename='saved-location')
router.register(r'notifications', AlertNotificationViewSet, basename='alert-notification')

urlpatterns = [
    path('', include(router.urls)),
]
