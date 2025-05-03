"""
Models for user accounts and authentication.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class User(AbstractUser):
    """Custom user model."""
    USER_TYPE_CHOICES = (
        ('admin', 'System Administrator'),
        ('agency', 'Agency User'),
        ('user', 'Regular User'),
    )   # Add user type field
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='user')
    agency = models.ForeignKey('agencies.Agency', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    # Additional fields
    phone = models.CharField(max_length=20, blank=True)
    title = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
     # Convenience properties
    @property
    def is_admin_user(self):
        return self.user_type == 'admin' or self.is_staff
        
    @property
    def is_agency_user(self):
        return self.user_type == 'agency'
        
    @property
    def is_regular_user(self):
        return self.user_type == 'user'
    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)

    class Meta:
        ordering = ['username']
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def __str__(self):
        return self.get_full_name() or self.username


class UserProfile(models.Model):
    """Extended profile information for users."""

    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='profile')
    department = models.CharField(max_length=100, blank=True)
    badge_number = models.CharField(max_length=50, blank=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)

    # Work schedule and availability
    work_hours_start = models.TimeField(blank=True, null=True)
    work_hours_end = models.TimeField(blank=True, null=True)
    work_days = models.CharField(max_length=50, blank=True)  # e.g., "1,2,3,4,5" for Mon-Fri

    # Additional timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('user profile')
        verbose_name_plural = _('user profiles')

    def __str__(self):
        return f"{self.user.get_full_name()}'s Profile"


class UserPreference(models.Model):
    """User preferences for application settings."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preferences')
    
    # Map preferences
    default_map_center_lat = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    default_map_center_lng = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    default_map_zoom = models.IntegerField(default=12)
    
    # Display preferences
    theme = models.CharField(max_length=20, default='light')
    items_per_page = models.IntegerField(default=25)
    default_view = models.CharField(max_length=20, default='map')
    
    # Report preferences
    preferred_report_format = models.CharField(max_length=10, default='pdf')
    auto_refresh_interval = models.IntegerField(default=300)  # seconds
    
    # Notification preferences
    quiet_hours_start = models.TimeField(blank=True, null=True)
    quiet_hours_end = models.TimeField(blank=True, null=True)
    notification_radius = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)  # km

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('user preference')
        verbose_name_plural = _('user preferences')

    def __str__(self):
        return f"{self.user.username}'s Preferences"


class PasswordResetToken(models.Model):
    """Model for password reset tokens."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_tokens')
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('password reset token')
        verbose_name_plural = _('password reset tokens')

    def __str__(self):
        return f"Reset token for {self.user.username}"

    @property
    def is_expired(self):
        """Check if the token has expired."""
        return self.expires_at <= timezone.now()


class UserActivity(models.Model):
    """Model for tracking user activity."""

    ACTIVITY_TYPES = (
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('password_reset', 'Password Reset'),
        ('profile_update', 'Profile Update'),
        ('search', 'Search'),
        ('view_report', 'View Report'),
        ('create_report', 'Create Report'),
        ('view_crime', 'View Crime'),
        ('create_alert', 'Create Alert'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    description = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _('user activity')
        verbose_name_plural = _('user activities')

    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} at {self.timestamp}"
    
    
