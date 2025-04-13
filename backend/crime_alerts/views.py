"""
Views for the crime_alerts app.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.utils import timezone
from .models import Alert, AlertNotification, NotificationPreference, PublicSafetyAlert
from .serializers import AlertSerializer, AlertNotificationSerializer, NotificationPreferenceSerializer, PublicSafetyAlertSerializer

class AlertViewSet(viewsets.ModelViewSet):
    """API endpoint for user alerts."""
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active', 'crime_types']
    search_fields = ['name', 'location']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Alert.objects.none()
        
        """Return alerts for the current user."""
        return Alert.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new alert for the current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of an alert."""
        alert = self.get_object()
        alert.is_active = not alert.is_active
        alert.save()
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
        return Response({"status": "success", "is_active": alert.is_active})

class AlertNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for alert notifications."""
    serializer_class = AlertNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'notification_type']
    ordering_fields = ['created_at', 'sent_at', 'read_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return AlertNotification.objects.none()
        
        """Return notifications for the current user."""
        return AlertNotification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        if notification.status != 'read':
            notification.status = 'read'
            notification.read_at = timezone.now()
            notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
        return Response({"status": "success"})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read."""
        unread = AlertNotification.objects.filter(
            user=self.request.user,
            status__in=['sent', 'pending']
        )
        now = timezone.now()
        for notification in unread:
            notification.status = 'read'
            notification.read_at = now
        
        AlertNotification.objects.bulk_update(unread, ['status', 'read_at'])
        return Response({"status": "success", "count": unread.count()})

class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """API endpoint for notification preferences."""
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        
        """Get or create notification preferences for the current user."""
        obj, created = NotificationPreference.objects.get_or_create(user=self.request.user)
        return obj
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return NotificationPreference.objects.none()
        
        """Return preference for the current user."""
        return NotificationPreference.objects.filter(user=self.request.user)

class PublicSafetyAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for public safety alerts."""
    queryset = PublicSafetyAlert.objects.filter(is_active=True)
    serializer_class = PublicSafetyAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['severity', 'districts', 'neighborhoods', 'crime_types']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'start_time', 'end_time']
    ordering = ['-start_time']
    
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get public safety alerts for a specific location."""
        # Implement this later
        return Response({"detail": "Not implemented yet"}, status=status.HTTP_501_NOT_IMPLEMENTED)