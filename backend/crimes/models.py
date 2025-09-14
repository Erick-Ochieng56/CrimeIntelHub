"""
Models for crime data and analysis.
"""
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from agencies.models import Agency


class CrimeCategory(models.Model):
    """Model for crime categories."""

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, related_name='subcategories')
    severity_level = models.IntegerField(
        default=1, 
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )  # 1-10 scale
    icon = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Crime categories'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['severity_level']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        """Validate the model."""
        if self.parent and self.parent == self:
            raise ValidationError('Category cannot be its own parent')


class District(gis_models.Model):
    """Model for police/administrative districts."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True, unique=True)
    location = gis_models.PointField(geography=True, blank=True, null=True, srid=4326)
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name='districts')
    population = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(0)])
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Districts'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['code']),
            models.Index(fields=['agency']),
            models.Index(fields=['population']),
        ]

    def __str__(self):
        return self.name


class Neighborhood(gis_models.Model):
    """Model for neighborhoods/communities."""
    name = models.CharField(max_length=100)
    location = gis_models.PointField(geography=True, blank=True, null=True, srid=4326)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='neighborhoods', null=True, blank=True)
    population = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(0)])
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Neighborhoods'
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['district']),
            models.Index(fields=['population']),
        ]

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
    property_loss = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(0)]
    )
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
            models.Index(fields=['district']),
            models.Index(fields=['neighborhood']),
            models.Index(fields=['case_number']),
            models.Index(fields=['external_id']),
            models.Index(fields=['data_source']),
            models.Index(fields=['created_at']),
            models.Index(fields=['date', 'agency']),
            models.Index(fields=['date', 'category']),
            models.Index(fields=['date', 'district']),
        ]

    def __str__(self):
        return f"{self.case_number} - {self.category.name}"

    def clean(self):
        """Validate the model."""
        if self.date and self.date > timezone.now().date():
            raise ValidationError('Crime date cannot be in the future')
        
        if self.property_loss and self.property_loss < 0:
            raise ValidationError('Property loss cannot be negative')

    def save(self, *args, **kwargs):
        # Auto-determine if crime is violent based on category severity
        if self.category and self.category.severity_level >= 7:
            self.is_violent = True
        
        # Validate location coordinates if provided
        if self.location:
            coords = self.location.coords
            if coords[0] < -180 or coords[0] > 180:
                raise ValidationError('Longitude must be between -180 and 180')
            if coords[1] < -90 or coords[1] > 90:
                raise ValidationError('Latitude must be between -90 and 90')
        
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
        indexes = [
            models.Index(fields=['file_type']),
            models.Index(fields=['created_at']),
            models.Index(fields=['crime', 'file_type']),
        ]

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
        indexes = [
            models.Index(fields=['author']),
            models.Index(fields=['created_at']),
            models.Index(fields=['crime', 'created_at']),
        ]

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
    count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    violent_count = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    property_damage = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0,
        validators=[MinValueValidator(0)]
    )
    arrests = models.IntegerField(default=0, validators=[MinValueValidator(0)])

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['date', 'category', 'district', 'neighborhood', 'agency']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['category']),
            models.Index(fields=['district']),
            models.Index(fields=['neighborhood']),
            models.Index(fields=['agency']),
            models.Index(fields=['date', 'agency']),
            models.Index(fields=['date', 'category']),
            models.Index(fields=['date', 'district']),
        ]

    def __str__(self):
        category_name = self.category.name if self.category else "All"
        district_name = self.district.name if self.district else "All"
        return f"{category_name} in {district_name} on {self.date.strftime('%Y-%m-%d')}"

    def clean(self):
        """Validate the model."""
        if self.count < 0:
            raise ValidationError('Count cannot be negative')
        if self.violent_count > self.count:
            raise ValidationError('Violent count cannot exceed total count')
        if self.arrests > self.count:
            raise ValidationError('Arrests cannot exceed total count')