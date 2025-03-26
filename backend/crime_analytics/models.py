from django.db import models
from django.contrib.gis.db import models as gis_models
from crimes.models import CrimeCategory, District, Neighborhood, Crime
from django.contrib.auth import get_user_model

User = get_user_model()

class PredictionModel(models.Model):
    """Model for storing crime prediction model information."""
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    algorithm_type = models.CharField(max_length=100)
    parameters = models.JSONField(default=dict)
    accuracy = models.FloatField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    version = models.CharField(max_length=50)
    trained_date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-trained_date']
        verbose_name_plural = 'Prediction models'

    def __str__(self):
        return f"{self.name} v{self.version}"

class HotspotZone(gis_models.Model):
    """Model for crime hotspot zones."""
    name = models.CharField(max_length=100)
    boundary = gis_models.PolygonField(geography=True)
    crime_types = models.ManyToManyField(CrimeCategory, related_name='hotspots')
    intensity = models.FloatField(help_text="Crime intensity score (0-100)")
    start_date = models.DateField()
    end_date = models.DateField()
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='hotspots', 
                                 null=True, blank=True)
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.CASCADE, 
                                    related_name='hotspots', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-intensity', '-created_at']
        verbose_name_plural = 'Hotspot zones'

    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"

class CrimeTrend(gis_models.Model):
    """Model for crime trends."""
    crime_type = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, 
                                  related_name='trends')
    trend_data = models.JSONField(default=dict)
    start_date = models.DateField()
    end_date = models.DateField()
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, 
                                blank=True, related_name='trends')
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.SET_NULL, null=True, 
                                    blank=True, related_name='trends')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Crime trends'

    def __str__(self):
        return f"{self.crime_type} trend ({self.start_date} to {self.end_date})"

class CrimePrediction(gis_models.Model):
    """Model for predicted crime incidents."""
    location = gis_models.PointField(geography=True)
    crime_type = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, 
                                   related_name='predictions')
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='predictions')
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.SET_NULL, null=True, 
                                    blank=True, related_name='predictions')
    prediction_date = models.DateField()
    confidence = models.FloatField(help_text="Confidence score (0-100)")
    prediction_model = models.ForeignKey(PredictionModel, on_delete=models.CASCADE, 
                                        related_name='predictions')
    features = models.JSONField(default=dict, help_text="Features used for prediction")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-prediction_date', '-confidence']
        verbose_name_plural = 'Crime predictions'

    def __str__(self):
        return f"{self.crime_type} prediction for {self.prediction_date}"

class PatternAnalysis(models.Model):
    """Model for storing crime pattern analysis results."""
    name = models.CharField(max_length=100)
    description = models.TextField()
    analysis_type = models.CharField(max_length=50)
    parameters = models.JSONField(default=dict)
    results = models.JSONField(default=dict)
    crime_types = models.ManyToManyField(CrimeCategory, related_name='pattern_analyses')
    start_date = models.DateField()
    end_date = models.DateField()
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, 
                                blank=True, related_name='pattern_analyses')
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.SET_NULL, null=True, 
                                    blank=True, related_name='pattern_analyses')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analyses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Pattern analyses'

    def __str__(self):
        return self.name

class DemographicCorrelation(models.Model):
    """Model for correlations between crime and demographic data."""
    name = models.CharField(max_length=100)
    crime_type = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, 
                                  related_name='demographic_correlations')
    demographic_factor = models.CharField(max_length=100)
    correlation_coefficient = models.FloatField()
    p_value = models.FloatField()
    methodology = models.TextField()
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, 
                                blank=True, related_name='demographic_correlations')
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.SET_NULL, null=True, 
                                    blank=True, related_name='demographic_correlations')
    time_period = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-correlation_coefficient']
        verbose_name_plural = 'Demographic correlations'

    def __str__(self):
        return f"{self.crime_type} correlation with {self.demographic_factor}"
    
class CrimeIncident(models.Model):
    """Model for storing crime incidents."""
    location = gis_models.PointField(geography=True)
    incident_date = models.DateTimeField()
    description = models.TextField()
    crime_type = models.ForeignKey(CrimeCategory, on_delete=models.CASCADE, 
                                   related_name='incidents')
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True, 
                                related_name='incidents')
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.SET_NULL, null=True, 
                                    blank=True, related_name='incidents')
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                  blank=True, related_name='reported_incidents')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-incident_date']
        verbose_name_plural = 'Crime incidents'

    def __str__(self):
        return f"{self.crime_type} incident on {self.incident_date}"

