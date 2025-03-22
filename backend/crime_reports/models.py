from django.db import models
from django.contrib.gis.db import models as gis_models
from crimes.models import CrimeCategory, District, Neighborhood, Crime
from django.contrib.auth import get_user_model

User = get_user_model()

class Report(models.Model):
    """Model for generated reports."""
    
    REPORT_TYPES = (
        ('crime_summary', 'Crime Summary Report'),
        ('trend_analysis', 'Crime Trend Analysis'),
        ('location_analysis', 'Location-based Analysis'),
        ('comparative', 'Comparative Report'),
        ('predictive', 'Predictive Analysis Report'),
        ('custom', 'Custom Report'),
    )
    
    FORMAT_CHOICES = (
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
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
    
    # Report parameters
    start_date = models.DateField()
    end_date = models.DateField()
    crime_types = models.ManyToManyField(CrimeCategory, blank=True, related_name='reports')
    districts = models.ManyToManyField(District, blank=True, related_name='reports')
    neighborhoods = models.ManyToManyField(Neighborhood, blank=True, related_name='reports')
    
    # Geographic filter (optional)
    area = gis_models.PolygonField(geography=True, blank=True, null=True)
    center_point = gis_models.PointField(geography=True, blank=True, null=True)
    radius = models.FloatField(blank=True, null=True, help_text="Radius in kilometers")
    
    # Report options
    include_summary = models.BooleanField(default=True)
    include_charts = models.BooleanField(default=True)
    include_map = models.BooleanField(default=True)
    include_recommendations = models.BooleanField(default=False)
    chart_types = models.JSONField(default=list, help_text="List of chart types to include")
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')
    custom_options = models.JSONField(default=dict, blank=True, null=True)
    
    # Report state
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0, help_text="Progress percentage (0-100)")
    error_message = models.TextField(blank=True, null=True)
    
    # Report output
    file_path = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True, help_text="File size in bytes")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Reports'
    
    def __str__(self):
        return f"{self.title} ({self.get_report_type_display()})"
    
    def get_file_url(self):
        """Get the URL for downloading the report file."""
        if self.file_path and self.status == 'completed':
            return f"/api/reports/{self.id}/download/"
        return None


class ReportTemplate(models.Model):
    """Model for report templates."""
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    report_type = models.CharField(max_length=50, choices=Report.REPORT_TYPES)
    template_data = models.JSONField(default=dict, help_text="Template configuration")
    is_default = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='report_templates')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Report templates'
    
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
    report_template = models.ForeignKey(ReportTemplate, on_delete=models.CASCADE, related_name='schedules')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    day_of_week = models.IntegerField(blank=True, null=True, help_text="1-7 (Monday-Sunday)")
    day_of_month = models.IntegerField(blank=True, null=True, help_text="1-31")
    recipients = models.JSONField(default=list, help_text="List of email addresses")
    parameters_override = models.JSONField(default=dict, blank=True, null=True, 
                                         help_text="Override template parameters")
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(blank=True, null=True)
    next_run = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Scheduled reports'
    
    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"


class ReportSection(models.Model):
    """Model for custom report sections."""
    
    SECTION_TYPES = (
        ('text', 'Text Section'),
        ('chart', 'Chart Section'),
        ('map', 'Map Section'),
        ('table', 'Table Section'),
        ('statistics', 'Statistics Section'),
    )
    
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=100)
    section_type = models.CharField(max_length=20, choices=SECTION_TYPES)
    content = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)
    configuration = models.JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order']
        verbose_name_plural = 'Report sections'
    
    def __str__(self):
        return f"{self.title} ({self.get_section_type_display()})"


class SavedAnalysis(models.Model):
    """Model for saved analysis configurations."""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_analyses')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    analysis_type = models.CharField(max_length=50)
    configuration = models.JSONField(default=dict)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Saved analyses'
    
    def __str__(self):
        return f"{self.name} - {self.analysis_type}"