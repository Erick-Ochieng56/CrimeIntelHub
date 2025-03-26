"""
Serializers for crimes app.
"""
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import (
    CrimeCategory, District, Neighborhood, Crime,
    CrimeMedia, CrimeNote, CrimeStatistic
)
from django.contrib.gis.geos import Point


class CrimeCategorySerializer(serializers.ModelSerializer):
    """Serializer for the CrimeCategory model."""

    class Meta:
        model = CrimeCategory
        fields = '__all__'


class DistrictSerializer(GeoFeatureModelSerializer):
    """Serializer for the District model."""

    class Meta:
        model = District
        geo_field = 'boundary'
        fields = ('id', 'name', 'code', 'boundary', 'agency', 'population', 'description')


class NeighborhoodSerializer(GeoFeatureModelSerializer):
    """Serializer for the Neighborhood model."""

    class Meta:
        model = Neighborhood
        geo_field = 'boundary'
        fields = ('id', 'name', 'boundary', 'district', 'population', 'description')


class CrimeMediaSerializer(serializers.ModelSerializer):
    """Serializer for the CrimeMedia model."""

    class Meta:
        model = CrimeMedia
        fields = '__all__'


class CrimeNoteSerializer(serializers.ModelSerializer):
    """Serializer for the CrimeNote model."""

    class Meta:
        model = CrimeNote
        fields = '__all__'


class CrimeListSerializer(serializers.ModelSerializer):
    """Serializer for listing crimes with location."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Crime
        fields = (
            'id', 'case_number', 'category', 'category_name', 'description', 
            'date', 'time', 'status', 'block_address', 'district', 'neighborhood',
            'agency', 'is_violent', 'latitude', 'longitude'
        )

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None

class CrimeDetailSerializer(GeoFeatureModelSerializer):
    """Serializer for detailed crime information."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    neighborhood_name = serializers.CharField(source='neighborhood.name', read_only=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    media = CrimeMediaSerializer(many=True, read_only=True)
    notes = CrimeNoteSerializer(many=True, read_only=True)

    class Meta:
        model = Crime
        geo_field = 'location'
        fields = (
            'id', 'case_number', 'category', 'category_name', 'description', 
            'date', 'time', 'status', 'location', 'block_address', 'district', 
            'district_name', 'neighborhood', 'neighborhood_name', 'agency', 
            'agency_name', 'is_violent', 'property_loss', 'weapon_used',
            'weapon_type', 'drug_related', 'domestic', 'arrests_made',
            'gang_related', 'external_id', 'data_source', 'created_at',
            'updated_at', 'media', 'notes', 'latitude', 'longitude'
        )

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class CrimeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new crimes."""

    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = Crime
        fields = (
            'case_number', 'category', 'description', 'date', 'time', 
            'status', 'latitude', 'longitude', 'block_address', 'district', 
            'neighborhood', 'agency', 'is_violent', 'property_loss',
            'weapon_used', 'weapon_type', 'drug_related', 'domestic',
            'arrests_made', 'gang_related', 'external_id', 'data_source'
        )

    def create(self, validated_data):
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        validated_data['location'] = Point(longitude, latitude)
        return super().create(validated_data)


class CrimeStatisticSerializer(serializers.ModelSerializer):
    """Serializer for crime statistics."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    neighborhood_name = serializers.CharField(source='neighborhood.name', read_only=True)
    agency_name = serializers.CharField(source='agency.name', read_only=True)

    class Meta:
        model = CrimeStatistic
        fields = (
            'id', 'date', 'category', 'category_name', 'district', 'district_name',
            'neighborhood', 'neighborhood_name', 'agency', 'agency_name',
            'count', 'violent_count', 'property_damage', 'arrests'
        )


class CrimeHeatmapSerializer(serializers.Serializer):
    """Serializer for heatmap data points."""

    lat = serializers.FloatField()
    lng = serializers.FloatField()
    intensity = serializers.FloatField()

    class Meta:
        fields = ('lat', 'lng', 'intensity')


class CrimeSearchSerializer(serializers.Serializer):
    """Serializer for advanced crime search."""

    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    radius = serializers.FloatField(required=True, min_value=0.1, max_value=50)
    crime_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    keywords = serializers.CharField(required=False)
    is_violent = serializers.BooleanField(required=False)
    status = serializers.CharField(required=False)

    class Meta:
        fields = (
            'latitude', 'longitude', 'radius', 'crime_types',
            'start_date', 'end_date', 'keywords', 'is_violent', 'status'
        )


class CrimeStatResponseSerializer(serializers.Serializer):
    """Serializer for crime statistics API response."""

    total_crimes = serializers.IntegerField()
    previous_total_crimes = serializers.IntegerField()
    violent_crimes = serializers.IntegerField()
    previous_violent_crimes = serializers.IntegerField()
    property_crimes = serializers.IntegerField()
    previous_property_crimes = serializers.IntegerField()
    arrests = serializers.IntegerField()
    previous_arrests = serializers.IntegerField()
    top_crimes = serializers.ListField(child=serializers.DictField())

    class Meta:
        fields = (
            'total_crimes', 'previous_total_crimes', 'violent_crimes',
            'previous_violent_crimes', 'property_crimes', 
            'previous_property_crimes', 'arrests', 'previous_arrests',
            'top_crimes'
        )