"""
Models for crime data and analysis.
"""
from django.db import models
from django.contrib.gis.db import models as gis_models
from agencies.models import Agency


class CrimeCategory(models.Model):
    """Model for crime categories."""

    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, related_name='subcategories')
    severity_level = models.IntegerField(default=1)  # 1-10 scale
    icon = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Crime categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class District(gis_models.Model):
    """Model for police/administrative districts."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True)
    location = gis_models.PointField(geography=True, blank=True, null=True, srid=4326)
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='districts')
    population = models.IntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Districts'
        ordering = ['name']

    def __str__(self):
        return self.name

class Neighborhood(gis_models.Model):
    """Model for neighborhoods/communities."""
    name = models.CharField(max_length=100)
    location = gis_models.PointField(geography=True, blank=True, null=True, srid=4326)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='neighborhoods', null=True, blank=True)
    population = models.IntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Neighborhoods'
        ordering = ['name']

    def __str__(self):
        return self.name


class Crime(gis_models.Model):
    """Model for crime incidents."""
    STATUS_CHOICES = (
        ('reported', 'Reported'),
        ('under_investigation', 'Under Investigation'),
        ('solved', 'Solved'),
        ('closed', 'Closed'),
        ('unfounded', 'Unfounded'),
    )

    case_number = models.CharField(max_length=50, unique=True)
    category = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, related_name='crimes')
    description = models.TextField()
    date = models.DateField()
    time = models.TimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='reported')
    location = gis_models.PointField(geography=True, blank=True, null=True, srid=4326)
    block_address = models.CharField(max_length=255)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True, related_name='crimes')
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.SET_NULL, null=True, blank=True, related_name='crimes')
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='crimes')
    is_violent = models.BooleanField(default=False)
    property_loss = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    weapon_used = models.BooleanField(default=False)
    weapon_type = models.CharField(max_length=100, blank=True, null=True)
    drug_related = models.BooleanField(default=False)
    domestic = models.BooleanField(default=False)
    arrests_made = models.BooleanField(default=False)
    gang_related = models.BooleanField(default=False)
    external_id = models.CharField(max_length=100, blank=True, null=True)
    data_source = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['status']),
            models.Index(fields=['is_violent']),
            models.Index(fields=['agency']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.category.name}"

    def save(self, *args, **kwargs):
        if self.category and self.category.severity_level >= 7:
            self.is_violent = True
        super().save(*args, **kwargs)

class CrimeMedia(models.Model):
    """Model for media associated with crimes (photos, videos, etc.)."""

    crime = models.ForeignKey(Crime, on_delete=models.CASCADE, related_name='media')
    file_type = models.CharField(max_length=20)  # image, video, audio, document
    file_path = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Crime media'

    def __str__(self):
        return f"{self.crime.case_number} - {self.file_type}"


class CrimeNote(models.Model):
    """Model for notes associated with crimes."""

    crime = models.ForeignKey(Crime, on_delete=models.CASCADE, related_name='notes')
    content = models.TextField()
    author = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note for {self.crime.case_number}"


class CrimeStatistic(models.Model):
    """Model for aggregated crime statistics."""

    date = models.DateField()
    category = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, related_name='statistics', null=True, blank=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='statistics', null=True, blank=True)
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.CASCADE, related_name='statistics', null=True, blank=True)
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='statistics')

    # Counts and measures
    count = models.IntegerField(default=0)
    violent_count = models.IntegerField(default=0)
    property_damage = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    arrests = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['date', 'category', 'district', 'neighborhood', 'agency']
        ordering = ['-date']

    def __str__(self):
        category_name = self.category.name if self.category else "All"
        district_name = self.district.name if self.district else "All"
        return f"{category_name} in {district_name} on {self.date.strftime('%Y-%m-%d')}"