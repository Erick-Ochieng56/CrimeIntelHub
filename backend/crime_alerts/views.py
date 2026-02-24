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
from django.db.models import Q
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['severity', 'districts', 'neighborhoods', 'crime_types']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'start_time', 'end_time']
    ordering = ['-start_time']
    
    @action(detail=False, methods=['get'])
    def by_location(self, request):
        """Get public safety alerts for a specific location."""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5)  # Default 5km
        
        if not lat or not lng:
            return Response(
                {"error": "Latitude and longitude are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            point = Point(float(lng), float(lat), srid=4326)
            radius = float(radius)
            
            # Filter active alerts that contain the point or are within radius
            queryset = self.get_queryset().filter(
                Q(area__contains=point) | 
                Q(area__distance_lte=(point, D(km=radius)))
            ).distinct()
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {"error": "Invalid latitude, longitude, or radius."},
                status=status.HTTP_400_BAD_REQUEST
            )