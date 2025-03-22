from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import (
    PredictionModel,
    HotspotZone,
    CrimePrediction,
    PatternAnalysis,
    DemographicCorrelation
)
from crimes.serializers import CrimeCategorySerializer, DistrictSerializer, NeighborhoodSerializer

class PredictionModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionModel
        fields = [
            'id', 'name', 'description', 'algorithm_type', 'parameters',
            'accuracy', 'is_active', 'version', 'trained_date', 'updated_at'
        ]
        read_only_fields = ['trained_date', 'updated_at']

class HotspotZoneSerializer(GeoFeatureModelSerializer):
    crime_types = CrimeCategorySerializer(many=True, read_only=True)
    district = DistrictSerializer(read_only=True)
    neighborhood = NeighborhoodSerializer(read_only=True)
    
    class Meta:
        model = HotspotZone
        geo_field = 'boundary'
        fields = [
            'id', 'name', 'crime_types', 'intensity', 'start_date', 
            'end_date', 'district', 'neighborhood', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class CrimePredictionSerializer(GeoFeatureModelSerializer):
    crime_type = CrimeCategorySerializer(read_only=True)
    district = DistrictSerializer(read_only=True)
    neighborhood = NeighborhoodSerializer(read_only=True)
    prediction_model = PredictionModelSerializer(read_only=True)
    
    class Meta:
        model = CrimePrediction
        geo_field = 'location'
        fields = [
            'id', 'crime_type', 'prediction_date', 'confidence', 'district',
            'neighborhood', 'prediction_model', 'features', 'created_at'
        ]
        read_only_fields = ['created_at']

class PatternAnalysisSerializer(serializers.ModelSerializer):
    crime_types = CrimeCategorySerializer(many=True, read_only=True)
    district = DistrictSerializer(read_only=True)
    neighborhood = NeighborhoodSerializer(read_only=True)
    
    class Meta:
        model = PatternAnalysis
        fields = [
            'id', 'name', 'description', 'analysis_type', 'parameters',
            'results', 'crime_types', 'start_date', 'end_date', 'district',
            'neighborhood', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

class DemographicCorrelationSerializer(serializers.ModelSerializer):
    crime_type = CrimeCategorySerializer(read_only=True)
    district = DistrictSerializer(read_only=True)
    neighborhood = NeighborhoodSerializer(read_only=True)
    
    class Meta:
        model = DemographicCorrelation
        fields = [
            'id', 'name', 'crime_type', 'demographic_factor', 'correlation_coefficient',
            'p_value', 'methodology', 'district', 'neighborhood', 'time_period',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']