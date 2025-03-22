from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.utils import timezone
from django.db.models import Q
import logging

from .models import Alert, AlertNotification, SavedLocation
from .serializers import (
    AlertSerializer, AlertDetailSerializer, AlertNotificationSerializer,
    SavedLocationSerializer, AlertCrimeSerializer
)
from crimes.models import Crime

logger = logging.getLogger(__name__)


class AlertViewSet(viewsets.ModelViewSet):
    """API endpoint for alerts."""
    
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return alerts for the current user."""
        return Alert.objects.filter(user=self.request.user).order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return AlertDetailSerializer
        return AlertSerializer
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        """Toggle the active status of an alert."""
        alert = self.get_object()
        alert.is_active = not alert.is_active
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_notification_methods(self, request, pk=None):
        """Update notification methods for an alert."""
        alert = self.get_object()
        
        notification_methods = request.data.get('notification_methods')
        if not notification_methods:
            return Response(
                {'error': 'notification_methods is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        alert.notification_methods = notification_methods
        alert.save()
        
        serializer = self.get_serializer(alert)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def crimes(self, request, pk=None):
        """Get recent crimes in the alert area."""
        alert = self.get_object()
        
        # Get crimes within the alert area
        point = alert.coordinates
        radius_km = alert.radius
        
        # Filter by crime type if specified
        queryset = Crime.objects.filter(location__distance_lte=(point, D(km=radius_km)))
        
        if alert.crime_type != 'all':
            queryset = queryset.filter(Q(category__name__icontains=alert.crime_type))
        
        # Get recent crimes, limited to 50
        recent_crimes = queryset.order_by('-date', '-time')[:50]
        
        serializer = AlertCrimeSerializer(recent_crimes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get notification history for an alert."""
        alert = self.get_object()
        notifications = alert.notifications.all().order_by('-created_at')
        
        serializer = AlertNotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class SavedLocationViewSet(viewsets.ModelViewSet):
    """API endpoint for saved locations."""
    
    serializer_class = SavedLocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return saved locations for the current user."""
        return SavedLocation.objects.filter(user=self.request.user).order_by('-created_at')


class AlertNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for alert notifications."""
    
    serializer_class = AlertNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user's alerts."""
        return AlertNotification.objects.filter(alert__user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['patch'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.status = 'read'
        notification.read_at = timezone.now()
        notification.save()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['patch'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read."""
        queryset = self.get_queryset().filter(status='sent')
        now = timezone.now()
        
        queryset.update(status='read', read_at=now)
        
        return Response({'status': 'success', 'message': 'All notifications marked as read'})
