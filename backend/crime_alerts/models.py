from django.db import models
from django.contrib.gis.db import models as gis_models
from crimes.models import CrimeCategory, District, Neighborhood
from django.contrib.auth import get_user_model

User = get_user_model()

class Alert(gis_models.Model):
    """Model for user-defined crime alerts."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # Alert criteria
    crime_types = models.ManyToManyField(CrimeCategory, related_name='alerts', blank=True)
    location = gis_models.PointField(geography=True)
    radius = models.FloatField(help_text="Radius in kilometers")
    districts = models.ManyToManyField(District, related_name='alerts', blank=True)
    neighborhoods = models.ManyToManyField(Neighborhood, related_name='alerts', blank=True)
    
    # Time window
    time_window = models.IntegerField(default=24, help_text="Time window in hours")
    
    # Notification settings
    is_active = models.BooleanField(default=True)
    notification_methods = models.JSONField(default=dict, 
                                           help_text="E.g., {'email': true, 'sms': false, 'push': true}")
    
    # Alert stats
    total_notifications = models.IntegerField(default=0)
    last_notified = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.user.email})"
    
    def latitude(self):
        return self.location.y
    
    def longitude(self):
        return self.location.x


class AlertNotification(models.Model):
    """Model for alert notifications sent to users."""
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('read', 'Read'),
    )
    
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='notifications')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    crime_data = models.JSONField(default=dict)
    notification_type = models.CharField(max_length=20)  # email, sms, push
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(blank=True, null=True)
    read_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.notification_type} alert to {self.user.email} ({self.status})"


class NotificationPreference(models.Model):
    """Model for user notification preferences."""
    
    FREQUENCY_CHOICES = (
        ('immediately', 'Immediately'),
        ('hourly', 'Hourly digest'),
        ('daily', 'Daily digest'),
        ('weekly', 'Weekly digest'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)
    quiet_hours_start = models.TimeField(blank=True, null=True)
    quiet_hours_end = models.TimeField(blank=True, null=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='immediately')
    min_severity = models.IntegerField(default=1, help_text="Minimum severity level (1-10)")
    max_daily_notifications = models.IntegerField(default=10)
    crime_type_preferences = models.JSONField(default=dict, 
                                             help_text="E.g., {'assault': true, 'theft': false}")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class PublicSafetyAlert(models.Model):
    """Model for system-generated public safety alerts."""
    
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    area = gis_models.PolygonField(geography=True, blank=True, null=True)
    districts = models.ManyToManyField(District, related_name='public_alerts', blank=True)
    neighborhoods = models.ManyToManyField(Neighborhood, related_name='public_alerts', blank=True)
    crime_types = models.ManyToManyField(CrimeCategory, related_name='public_alerts', blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='created_public_alerts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.severity})"