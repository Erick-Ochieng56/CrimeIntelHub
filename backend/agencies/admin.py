from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Agency, AgencyContact, DataImportLog, APIKey


class AgencyContactInline(admin.TabularInline):
    """Inline admin for agency contacts."""
    model = AgencyContact
    extra = 1


class APIKeyInline(admin.TabularInline):
    """Inline admin for API keys."""
    model = APIKey
    extra = 0
    readonly_fields = ('key', 'created_at', 'last_used')
    fields = ('name', 'key', 'is_active', 'allowed_endpoints', 'rate_limit', 'expires_at', 'created_at', 'last_used')


@admin.register(Agency)
class AgencyAdmin(GISModelAdmin):
    """Admin interface for Agency model."""
    list_display = ('name', 'agency_type', 'city', 'state', 'country', 'data_sharing_agreement')
    list_filter = ('agency_type', 'state', 'country', 'data_sharing_agreement')
    search_fields = ('name', 'description', 'city', 'state')
    fieldsets = (
        (None, {
            'fields': ('name', 'short_name', 'agency_type', 'description', 'logo')
        }),
        ('Contact Information', {
            'fields': ('phone', 'email', 'website', 'address', 'city', 'state', 'zip_code', 'country')
        }),
        ('Geographic Coverage', {
            'fields': ('jurisdiction_area', 'jurisdiction_description')
        }),
        ('Data Sharing', {
            'fields': ('data_sharing_agreement', 'api_endpoint', 'api_key', 'data_format'),
            'classes': ('collapse',)
        }),
    )
    inlines = [AgencyContactInline, APIKeyInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AgencyContact)
class AgencyContactAdmin(admin.ModelAdmin):
    """Admin interface for AgencyContact model."""
    list_display = ('name', 'agency', 'title', 'email', 'phone', 'is_primary')
    list_filter = ('is_primary', 'agency')
    search_fields = ('name', 'email', 'agency__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DataImportLog)
class DataImportLogAdmin(admin.ModelAdmin):
    """Admin interface for DataImportLog model."""
    list_display = ('agency', 'import_date', 'data_start_date', 'data_end_date', 
                    'record_count', 'status', 'import_method')
    list_filter = ('status', 'import_method', 'import_date')
    search_fields = ('agency__name', 'notes')
    readonly_fields = ('created_at', 'completed_at')
    fieldsets = (
        (None, {
            'fields': ('agency', 'import_date', 'data_start_date', 'data_end_date', 
                      'record_count', 'status', 'import_method')
        }),
        ('Details', {
            'fields': ('error_message', 'notes', 'import_file', 'created_at', 'completed_at')
        }),
    )


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    """Admin interface for APIKey model."""
    list_display = ('name', 'agency', 'is_active', 'created_at', 'expires_at', 'last_used')
    list_filter = ('is_active', 'created_at', 'agency')
    search_fields = ('name', 'agency__name')
    readonly_fields = ('key', 'created_at', 'last_used')
    fieldsets = (
        (None, {
            'fields': ('agency', 'name', 'is_active')
        }),
        ('API Key', {
            'fields': ('key',),
            'classes': ('collapse',),
            'description': 'The API key is shown in this form for administrative purposes only. '
                           'In normal API responses, it will be partially masked.'
        }),
        ('Limits and Settings', {
            'fields': ('allowed_endpoints', 'rate_limit', 'expires_at')
        }),
        ('Usage Information', {
            'fields': ('created_at', 'last_used')
        }),
    )