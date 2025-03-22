"""
Models for managing law enforcement or data provider agencies.
"""
from django.contrib.gis.db import models

class Agency(models.Model):
    """Model for law enforcement or data provider agencies."""

    name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=20, blank=True, null=True)
    agency_type = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to='agency_logos/', blank=True, null=True)

    # Contact information
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='United States')

    # Geographic information
    headquarters_location = models.PointField(geography=True, blank=True, null=True)
    jurisdiction_area = models.MultiPolygonField(geography=True, blank=True, null=True)
    jurisdiction_description = models.TextField(blank=True, null=True)

    # API configuration
    data_sharing_agreement = models.BooleanField(default=False)
    api_endpoint = models.CharField(max_length=255, blank=True, null=True)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    data_format = models.CharField(max_length=50, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Agencies'
        ordering = ['name']

    def __str__(self):
        return self.name


class AgencyContact(models.Model):
    """Model for agency contacts."""

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=100)
    title = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f"{self.name} ({self.agency.name})"


class APIKey(models.Model):
    """Model for API keys issued to agencies."""

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='api_keys')
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    allowed_endpoints = models.JSONField(default=list)
    rate_limit = models.IntegerField(default=100)  # Requests per hour
    expires_at = models.DateTimeField(blank=True, null=True)

    # Timestamps and usage
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.agency.name})"


class DataImportLog(models.Model):
    """Model for tracking data imports from agencies."""

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='import_logs')
    import_date = models.DateTimeField()
    data_start_date = models.DateField()
    data_end_date = models.DateField()
    record_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    import_method = models.CharField(max_length=50)  # API, file upload, etc.
    notes = models.TextField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-import_date']

    def __str__(self):
        return f"{self.agency.name} - {self.import_date.strftime('%Y-%m-%d')}"