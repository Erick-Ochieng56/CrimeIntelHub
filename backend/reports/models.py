from django.db import models
from django.utils.translation import gettext_lazy as _
from accounts.models import User
from crimes.models import CrimeCategory, District, Neighborhood


class Report(models.Model):
    """Model for generated reports."""
    
    REPORT_TYPES = (
        ('crime_summary', 'Crime Summary Report'),
        ('trend_analysis', 'Crime Trend Analysis'),
        ('location_analysis', 'Location-based Analysis'),
        ('comparative', 'Comparative Report'),
    )
    
    FORMAT_CHOICES = (
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    
    # Report filters
    time_range = models.IntegerField(help_text="Time range in days", default=30)
    crime_types = models.ManyToManyField(CrimeCategory, blank=True, related_name='reports')
    districts = models.ManyToManyField(District, blank=True, related_name='reports')
    neighborhoods = models.ManyToManyField(Neighborhood, blank=True, related_name='reports')
    
    # Report configuration
    include_charts = models.BooleanField(default=True)
    include_map = models.BooleanField(default=True)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    
    # Report status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0, help_text="Progress percentage (0-100)")
    error_message = models.TextField(blank=True, null=True)
    
    # File details
    file_path = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True, help_text="File size in bytes")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.get_report_type_display()}) - {self.user.username}"
    
    def get_file_url(self):
        """Get the URL for downloading the report file."""
        if self.file_path:
            return f"/api/reports/{self.id}/download"
        return None


class ReportTemplate(models.Model):
    """Model for report templates."""
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    report_type = models.CharField(max_length=50, choices=Report.REPORT_TYPES)
    template_file = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"


class ScheduledReport(models.Model):
    """Model for scheduled recurring reports."""
    
    FREQUENCY_CHOICES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scheduled_reports')
    report_template = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='schedules')
    name = models.CharField(max_length=100)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    day_of_week = models.IntegerField(blank=True, null=True, help_text="1-7 (Monday-Sunday)")
    day_of_month = models.IntegerField(blank=True, null=True, help_text="1-31")
    recipients = models.JSONField(default=list, help_text="List of email addresses")
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(blank=True, null=True)
    next_run = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()}) - {self.user.username}"
