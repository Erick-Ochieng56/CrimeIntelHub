from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    DataSource,
    ImportJob,
    ExportJob,
    DataTransformation,
    ImportLog,
    ScheduledImport
)

@admin.register(DataSource)
class DataSourceAdmin(GISModelAdmin):
    list_display = ('name', 'source_type', 'is_active', 'created_by', 'created_at')
    list_filter = ('source_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'source_type', 'is_active')
        }),
        ('Configuration', {
            'fields': ('configuration', 'mapping'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ImportJob)
class ImportJobAdmin(GISModelAdmin):
    list_display = ('id', 'data_source', 'status', 'records_processed', 'records_created', 'records_updated', 'records_failed', 'created_at')
    list_filter = ('status', 'data_source', 'created_at')
    search_fields = ('data_source__name',)
    readonly_fields = ('created_at', 'started_at', 'completed_at')
    fieldsets = (
        (None, {
            'fields': ('data_source', 'file_path', 'status', 'created_by')
        }),
        ('Parameters', {
            'fields': ('parameters',),
            'classes': ('collapse',)
        }),
        ('Results', {
            'fields': ('records_processed', 'records_created', 'records_updated', 'records_failed'),
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'created_at'),
            'classes': ('collapse',)
        }),
        ('Errors', {
            'fields': ('error_message', 'error_details'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ExportJob)
class ExportJobAdmin(GISModelAdmin):
    list_display = ('name', 'format', 'status', 'records_exported', 'created_at')
    list_filter = ('status', 'format', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'started_at', 'completed_at', 'file_size')
    fieldsets = (
        (None, {
            'fields': ('name', 'format', 'status', 'created_by')
        }),
        ('Configuration', {
            'fields': ('parameters', 'include_fields', 'exclude_fields'),
            'classes': ('collapse',)
        }),
        ('Results', {
            'fields': ('file_path', 'file_size', 'records_exported'),
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'created_at'),
            'classes': ('collapse',)
        }),
        ('Errors', {
            'fields': ('error_message',),
            'classes': ('collapse',)
        }),
    )

@admin.register(DataTransformation)
class DataTransformationAdmin(GISModelAdmin):
    list_display = ('name', 'transformation_type', 'data_source', 'order', 'is_active')
    list_filter = ('transformation_type', 'is_active', 'data_source')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'transformation_type', 'is_active')
        }),
        ('Configuration', {
            'fields': ('configuration', 'order', 'data_source'),
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ImportLog)
class ImportLogAdmin(GISModelAdmin):
    list_display = ('id', 'import_job', 'crime', 'external_id', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'import_job')
    search_fields = ('external_id',)
    readonly_fields = ('created_at',)
    fieldsets = (
        (None, {
            'fields': ('import_job', 'crime', 'external_id', 'status')
        }),
        ('Data', {
            'fields': ('source_data', 'transformed_data'),
            'classes': ('collapse',)
        }),
        ('Issues', {
            'fields': ('message', 'errors'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

@admin.register(ScheduledImport)
class ScheduledImportAdmin(GISModelAdmin):
    list_display = ('name', 'data_source', 'frequency', 'is_active', 'last_run', 'next_run')
    list_filter = ('frequency', 'is_active', 'data_source')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at', 'last_run', 'next_run')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'data_source', 'is_active')
        }),
        ('Schedule', {
            'fields': ('frequency', 'time_of_day', 'day_of_week', 'day_of_month'),
        }),
        ('Execution', {
            'fields': ('parameters', 'last_run', 'next_run'),
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )