"""
Admin configuration for crimes app.
"""
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import (
    CrimeCategory, District, Neighborhood, Crime,
    CrimeMedia, CrimeNote, CrimeStatistic
)


class CrimeMediaInline(admin.TabularInline):
    """Inline admin for crime media."""
    model = CrimeMedia
    extra = 1


class CrimeNoteInline(admin.TabularInline):
    """Inline admin for crime notes."""
    model = CrimeNote
    extra = 1


@admin.register(CrimeCategory)
class CrimeCategoryAdmin(admin.ModelAdmin):
    """Admin for crime categories."""
    list_display = ('name', 'severity_level', 'parent', 'created_at')
    list_filter = ('severity_level', 'parent')
    search_fields = ('name', 'description')
    ordering = ('name',)


@admin.register(District)
class DistrictAdmin(GISModelAdmin):
    """Admin for districts with spatial features."""
    list_display = ('name', 'code', 'agency', 'population')
    list_filter = ('agency',)
    search_fields = ('name', 'code', 'description')
    ordering = ('name',)


@admin.register(Neighborhood)
class NeighborhoodAdmin(GISModelAdmin):
    """Admin for neighborhoods with spatial features."""
    list_display = ('name', 'district', 'population')
    list_filter = ('district',)
    search_fields = ('name', 'description')
    ordering = ('name',)


@admin.register(Crime)
class CrimeAdmin(GISModelAdmin):
    """Admin for crimes with spatial features."""
    list_display = ('case_number', 'category', 'date', 'time', 'status', 
                   'block_address', 'agency', 'is_violent')
    list_filter = ('status', 'is_violent', 'weapon_used', 'drug_related', 
                  'domestic', 'arrests_made', 'gang_related', 'category', 'agency')
    search_fields = ('case_number', 'description', 'block_address')
    date_hierarchy = 'date'
    ordering = ('-date', '-time')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [CrimeMediaInline, CrimeNoteInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('case_number', 'category', 'description', 'date', 'time', 'status')
        }),
        ('Location Information', {
            'fields': ('location', 'block_address', 'district', 'neighborhood')
        }),
        ('Agency Information', {
            'fields': ('agency',)
        }),
        ('Crime Details', {
            'fields': ('is_violent', 'property_loss', 'weapon_used', 'weapon_type',
                      'drug_related', 'domestic', 'arrests_made', 'gang_related')
        }),
        ('Metadata', {
            'fields': ('external_id', 'data_source', 'created_at', 'updated_at')
        }),
    )


@admin.register(CrimeMedia)
class CrimeMediaAdmin(admin.ModelAdmin):
    """Admin for crime media."""
    list_display = ('crime', 'file_type', 'description', 'created_at')
    list_filter = ('file_type', 'created_at')
    search_fields = ('crime__case_number', 'description')
    ordering = ('-created_at',)


@admin.register(CrimeNote)
class CrimeNoteAdmin(admin.ModelAdmin):
    """Admin for crime notes."""
    list_display = ('crime', 'author', 'created_at')
    list_filter = ('created_at', 'author')
    search_fields = ('crime__case_number', 'content', 'author')
    ordering = ('-created_at',)


@admin.register(CrimeStatistic)
class CrimeStatisticAdmin(admin.ModelAdmin):
    """Admin for crime statistics."""
    list_display = ('date', 'category', 'district', 'neighborhood', 'agency', 
                   'count', 'violent_count', 'arrests')
    list_filter = ('date', 'category', 'district', 'neighborhood', 'agency')
    search_fields = ('category__name', 'district__name', 'neighborhood__name', 'agency__name')
    date_hierarchy = 'date'
    ordering = ('-date',)