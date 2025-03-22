from rest_framework import serializers
from .models import (
    DataSource,
    ImportJob,
    ExportJob,
    DataTransformation,
    ImportLog,
    ScheduledImport
)


class DataSourceSerializer(serializers.ModelSerializer):
    """Serializer for DataSource model."""
    
    class Meta:
        model = DataSource
        fields = [
            'id', 'name', 'description', 'source_type', 'configuration',
            'mapping', 'is_active', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class ImportJobSerializer(serializers.ModelSerializer):
    """Serializer for ImportJob model."""
    
    data_source_name = serializers.StringRelatedField(source='data_source', read_only=True)
    
    class Meta:
        model = ImportJob
        fields = [
            'id', 'data_source', 'data_source_name', 'file_path', 'parameters',
            'status', 'started_at', 'completed_at', 'records_processed',
            'records_created', 'records_updated', 'records_failed',
            'error_message', 'error_details', 'created_by', 'created_at'
        ]
        read_only_fields = [
            'id', 'started_at', 'completed_at', 'records_processed',
            'records_created', 'records_updated', 'records_failed',
            'error_message', 'error_details', 'created_by', 'created_at'
        ]


class ExportJobSerializer(serializers.ModelSerializer):
    """Serializer for ExportJob model."""
    
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ExportJob
        fields = [
            'id', 'name', 'format', 'parameters', 'include_fields', 'exclude_fields',
            'file_path', 'file_size', 'status', 'started_at', 'completed_at',
            'records_exported', 'error_message', 'created_by', 'created_at',
            'download_url'
        ]
        read_only_fields = [
            'id', 'file_path', 'file_size', 'status', 'started_at', 'completed_at',
            'records_exported', 'error_message', 'created_by', 'created_at',
            'download_url'
        ]
    
    def get_download_url(self, obj):
        return obj.get_download_url()


class DataTransformationSerializer(serializers.ModelSerializer):
    """Serializer for DataTransformation model."""
    
    data_source_name = serializers.StringRelatedField(source='data_source', read_only=True)
    
    class Meta:
        model = DataTransformation
        fields = [
            'id', 'name', 'description', 'transformation_type', 'configuration',
            'order', 'is_active', 'data_source', 'data_source_name', 'created_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class ImportLogSerializer(serializers.ModelSerializer):
    """Serializer for ImportLog model."""
    
    class Meta:
        model = ImportLog
        fields = [
            'id', 'import_job', 'crime', 'external_id', 'source_data',
            'transformed_data', 'status', 'message', 'errors', 'created_at'
        ]
        read_only_fields = fields


class ScheduledImportSerializer(serializers.ModelSerializer):
    """Serializer for ScheduledImport model."""
    
    data_source_name = serializers.StringRelatedField(source='data_source', read_only=True)
    
    class Meta:
        model = ScheduledImport
        fields = [
            'id', 'name', 'description', 'data_source', 'data_source_name',
            'frequency', 'time_of_day', 'day_of_week', 'day_of_month',
            'parameters', 'is_active', 'last_run', 'next_run',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_run', 'next_run', 'created_by', 'created_at', 'updated_at']