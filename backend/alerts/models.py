from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point
from django.utils.translation import gettext_lazy as _
from accounts.models import User
from crimes.models import CrimeCategory


class Alert(gis_models.Model):
    """Model for user-defined crime alerts."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    name = models.CharField(max_length=100)
    crime_type = models.CharField(max_length=50, default='all')
    location = models.CharField(max_length=255, blank=True, null=True)
    coordinates = gis_models.PointField(geography=True)
    radius = models.FloatField(help_text="Radius in kilometers")
    is_active = models.BooleanField(default=True)
    notification_methods = models.JSONField(default=dict)
    
    last_notified = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.user.username}"
    
    def save(self, *args, **kwargs):
        # Set default notification methods if not provided
        if not self.notification_methods:
            self.notification_methods = {
                'email': True,
                'inApp': True,
                'push': False,
                'sms': False
            }
        
        # Set default latitude and longitude for geofield
        if hasattr(self, 'latitude') and hasattr(self, 'longitude'):
            self.coordinates = Point(float(self.longitude), float(self.latitude))
        
        super().save(*args, **kwargs)
    
    @property
    def latitude(self):
        return self.coordinates.y if self.coordinates else None
    
    @property
    def longitude(self):
        return self.coordinates.x if self.coordinates else None


class AlertNotification(models.Model):
    """Model for alert notifications sent to users."""
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('read', 'Read'),
    )
    
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    crime_count = models.IntegerField(default=0)
    method = models.CharField(max_length=20)  # email, inApp, push, sms
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Notification for {self.alert.name} ({self.status})"


class SavedLocation(gis_models.Model):
    """Model for user's saved locations."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_locations')
    name = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    coordinates = gis_models.PointField(geography=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.user.username}"
    
    def save(self, *args, **kwargs):
        # Set default latitude and longitude for geofield
        if hasattr(self, 'latitude') and hasattr(self, 'longitude'):
            self.coordinates = Point(float(self.longitude), float(self.latitude))
        
        super().save(*args, **kwargs)
    
    @property
    def latitude(self):
        return self.coordinates.y if self.coordinates else None
    
    @property
    def longitude(self):
        return self.coordinates.x if self.coordinates else None
