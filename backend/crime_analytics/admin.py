from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    PredictionModel,
    HotspotZone,
    CrimePrediction,
    PatternAnalysis,
    DemographicCorrelation
)

@admin.register(PredictionModel)
class PredictionModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'algorithm_type', 'version', 'accuracy', 'is_active', 'trained_date')
    list_filter = ('algorithm_type', 'is_active')
    search_fields = ('name', 'description')
    readonly_fields = ('trained_date', 'updated_at')

@admin.register(HotspotZone)
class HotspotZoneAdmin(GISModelAdmin):
    list_display = ('name', 'intensity', 'start_date', 'end_date', 'district', 'neighborhood')
    list_filter = ('district', 'neighborhood', 'start_date', 'end_date')
    search_fields = ('name',)
    filter_horizontal = ('crime_types',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(CrimePrediction)
class CrimePredictionAdmin(GISModelAdmin):
    list_display = ('crime_type', 'prediction_date', 'confidence', 'district', 'neighborhood')
    list_filter = ('crime_type', 'prediction_date', 'district', 'neighborhood')
    search_fields = ('crime_type__name',)
    readonly_fields = ('created_at',)

@admin.register(PatternAnalysis)
class PatternAnalysisAdmin(admin.ModelAdmin):
    list_display = ('name', 'analysis_type', 'start_date', 'end_date', 'created_by')
    list_filter = ('analysis_type', 'district', 'neighborhood', 'created_by')
    search_fields = ('name', 'description')
    filter_horizontal = ('crime_types',)
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DemographicCorrelation)
class DemographicCorrelationAdmin(admin.ModelAdmin):
    list_display = ('name', 'crime_type', 'demographic_factor', 'correlation_coefficient', 'p_value')
    list_filter = ('crime_type', 'demographic_factor', 'district', 'neighborhood')
    search_fields = ('name', 'demographic_factor')
    readonly_fields = ('created_at', 'updated_at')