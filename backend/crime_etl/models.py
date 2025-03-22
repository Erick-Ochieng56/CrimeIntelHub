from django.db import models
from django.contrib.auth import get_user_model
from crimes.models import Crime

User = get_user_model()

class DataSource(models.Model):
    """Model for external data sources."""
    
    SOURCE_TYPES = (
        ('api', 'API'),
        ('file', 'File Upload'),
        ('database', 'External Database'),
        ('scraper', 'Web Scraper'),
        ('other', 'Other'),
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    configuration = models.JSONField(default=dict, help_text="Connection details, API keys, etc.")
    mapping = models.JSONField(default=dict, help_text="Field mapping configuration")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='data_sources')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Data sources'
    
    def __str__(self):
        return f"{self.name} ({self.get_source_type_display()})"


class ImportJob(models.Model):
    """Model for data import jobs."""
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
    )
    
    data_source = models.ForeignKey(DataSource, on_delete=models.CASCADE, related_name='import_jobs')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='import_jobs')
    file_path = models.CharField(max_length=255, blank=True, null=True)
    parameters = models.JSONField(default=dict, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    records_processed = models.IntegerField(default=0)
    records_created = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    records_failed = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    error_details = models.JSONField(default=list, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Import jobs'
    
    def __str__(self):
        return f"Import from {self.data_source.name} ({self.status})"


class ExportJob(models.Model):
    """Model for data export jobs."""
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
    )
    
    FORMAT_CHOICES = (
        ('csv', 'CSV'),
        ('json', 'JSON'),
        ('excel', 'Excel'),
        ('geojson', 'GeoJSON'),
        ('shapefile', 'Shapefile'),
        ('kml', 'KML'),
    )
    
    name = models.CharField(max_length=100)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='export_jobs')
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES)
    parameters = models.JSONField(default=dict, help_text="Filter parameters")
    include_fields = models.JSONField(default=list, blank=True, null=True, 
                                    help_text="Specific fields to include")
    exclude_fields = models.JSONField(default=list, blank=True, null=True, 
                                     help_text="Specific fields to exclude")
    file_path = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    records_exported = models.IntegerField(default=0)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Export jobs'
    
    def __str__(self):
        return f"{self.name} ({self.get_format_display()})"
    
    def get_download_url(self):
        """Get the URL for downloading the export file."""
        if self.file_path and self.status == 'completed':
            return f"/api/etl/exports/{self.id}/download/"
        return None


class DataTransformation(models.Model):
    """Model for data transformation operations."""
    
    TRANSFORMATION_TYPES = (
        ('field_mapping', 'Field Mapping'),
        ('geocoding', 'Geocoding'),
        ('deduplication', 'Deduplication'),
        ('normalization', 'Normalization'),
        ('enrichment', 'Data Enrichment'),
        ('filtering', 'Filtering'),
        ('custom', 'Custom Transformation'),
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    transformation_type = models.CharField(max_length=30, choices=TRANSFORMATION_TYPES)
    configuration = models.JSONField(default=dict)
    order = models.IntegerField(default=0, help_text="Order of execution")
    is_active = models.BooleanField(default=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.CASCADE, 
                                   related_name='transformations', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, 
                                  related_name='transformations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = 'Data transformations'
    
    def __str__(self):
        return f"{self.name} ({self.get_transformation_type_display()})"


class ImportLog(models.Model):
    """Model for logging detailed information about imported records."""
    
    import_job = models.ForeignKey(ImportJob, on_delete=models.CASCADE, related_name='logs')
    crime = models.ForeignKey(Crime, on_delete=models.SET_NULL, null=True, blank=True, 
                            related_name='import_logs')
    external_id = models.CharField(max_length=100)
    source_data = models.JSONField(default=dict)
    transformed_data = models.JSONField(default=dict)
    status = models.CharField(max_length=20)
    message = models.TextField(blank=True, null=True)
    errors = models.JSONField(default=list, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Import logs'
    
    def __str__(self):
        return f"Import log {self.id} - {self.status}"


class ScheduledImport(models.Model):
    """Model for scheduled recurring imports."""
    
    FREQUENCY_CHOICES = (
        ('hourly', 'Hourly'),
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    data_source = models.ForeignKey(DataSource, on_delete=models.CASCADE, 
                                   related_name='scheduled_imports')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    time_of_day = models.TimeField(blank=True, null=True)
    day_of_week = models.IntegerField(blank=True, null=True, help_text="1-7 (Monday-Sunday)")
    day_of_month = models.IntegerField(blank=True, null=True, help_text="1-31")
    parameters = models.JSONField(default=dict, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(blank=True, null=True)
    next_run = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, 
                                  related_name='scheduled_imports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Scheduled imports'
    
    def __str__(self):
        return f"{self.name} - {self.get_frequency_display()}"