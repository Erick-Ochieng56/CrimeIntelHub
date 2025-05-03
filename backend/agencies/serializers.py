"""
Serializers for agencies app.
"""
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import Agency, AgencyContact, APIKey, DataImportLog

class AgencyContactSerializer(serializers.ModelSerializer):
    """Serializer for agency contacts."""

    class Meta:
        model = AgencyContact
        fields = (
            'id', 'name', 'title', 'department', 'email', 'phone',
            'is_primary', 'notes', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

class APIKeySerializer(serializers.ModelSerializer):
    """Serializer for API keys."""

    class Meta:
        model = APIKey
        fields = (
            'id', 'name', 'key', 'is_active', 'allowed_endpoints',
            'rate_limit', 'expires_at', 'created_at', 'last_used'
        )
        read_only_fields = ('id', 'key', 'created_at', 'last_used')

class DataImportLogSerializer(serializers.ModelSerializer):
    """Serializer for data import logs."""

    class Meta:
        model = DataImportLog
        fields = (
            'id', 'agency', 'import_date', 'data_start_date', 'data_end_date',
            'record_count', 'status', 'import_method', 'notes', 'error_message',
            'created_at', 'completed_at'
        )
        read_only_fields = ('id', 'created_at', 'completed_at')

class AgencyAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin agency views, without GeoJSON formatting."""
    contacts = AgencyContactSerializer(many=True, read_only=True)
    api_keys = APIKeySerializer(many=True, read_only=True)
    import_logs = DataImportLogSerializer(many=True, read_only=True)

    class Meta:
        model = Agency
        fields = (
            'id', 'name', 'short_name', 'agency_type', 'status', 'description',
            'website', 'logo', 'phone', 'email', 'address', 'city',
            'state', 'zip_code', 'country', 'headquarters_location',
            'jurisdiction_area', 'jurisdiction_description',
            'data_sharing_agreement', 'api_endpoint', 'api_key',
            'data_format', 'contacts', 'api_keys', 'import_logs',
            'created_at', 'updated_at', 'last_data_upload'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_data_upload')

class AgencySerializer(GeoFeatureModelSerializer):
    """Serializer for agencies with GIS support."""
    contacts = AgencyContactSerializer(many=True, read_only=True)
    api_keys = APIKeySerializer(many=True, read_only=True)
    import_logs = DataImportLogSerializer(many=True, read_only=True)

    class Meta:
        model = Agency
        geo_field = 'headquarters_location'
        fields = (
            'id', 'name', 'short_name', 'agency_type', 'status', 'description',
            'website', 'logo', 'phone', 'email', 'address', 'city',
            'state', 'zip_code', 'country', 'headquarters_location',
            'jurisdiction_area', 'jurisdiction_description',
            'data_sharing_agreement', 'api_endpoint', 'api_key',
            'data_format', 'contacts', 'api_keys', 'import_logs',
            'created_at', 'updated_at', 'last_data_upload'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_data_upload')

class AgencyListSerializer(GeoFeatureModelSerializer):
    """Simplified serializer for agency listings."""
    contact_count = serializers.IntegerField(source='contacts.count', read_only=True)

    class Meta:
        model = Agency
        geo_field = 'headquarters_location'
        fields = (
            'id', 'name', 'short_name', 'agency_type', 'status', 'city',
            'state', 'country', 'headquarters_location',
            'data_sharing_agreement', 'contact_count'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')