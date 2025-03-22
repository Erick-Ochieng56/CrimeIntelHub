from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Alert, AlertNotification, NotificationPreference, PublicSafetyAlert

@admin.register(Alert)
class AlertAdmin(GISModelAdmin):
    list_display = ('name', 'user', 'is_active', 'radius', 'total_notifications', 'last_notified', 'created_at')
    list_filter = ('is_active', 'crime_types', 'districts', 'neighborhoods')
    search_fields = ('name', 'description', 'user__email', 'user__username')
    readonly_fields = ('total_notifications', 'last_notified', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'name', 'description', 'is_active')
        }),
        ('Alert Criteria', {
            'fields': ('crime_types', 'location', 'radius', 'districts', 'neighborhoods', 'time_window')
        }),
        ('Notification Settings', {
            'fields': ('notification_methods',)
        }),
        ('Statistics', {
            'fields': ('total_notifications', 'last_notified', 'created_at', 'updated_at')
        }),
    )


@admin.register(AlertNotification)
class AlertNotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'notification_type', 'status', 'created_at', 'sent_at', 'read_at')
    list_filter = ('status', 'notification_type')
    search_fields = ('title', 'message', 'user__email', 'user__username')
    readonly_fields = ('created_at', 'sent_at', 'read_at')
    fieldsets = (
        ('Notification Details', {
            'fields': ('alert', 'user', 'title', 'message', 'crime_data', 'notification_type')
        }),
        ('Status Information', {
            'fields': ('status', 'error_message', 'created_at', 'sent_at', 'read_at')
        }),
    )


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'frequency', 'email_enabled', 'sms_enabled', 'push_enabled', 'min_severity')
    list_filter = ('frequency', 'email_enabled', 'sms_enabled', 'push_enabled')
    search_fields = ('user__email', 'user__username')
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Notification Channels', {
            'fields': ('email_enabled', 'sms_enabled', 'push_enabled')
        }),
        ('Preferences', {
            'fields': ('frequency', 'quiet_hours_start', 'quiet_hours_end', 'min_severity', 'max_daily_notifications', 'crime_type_preferences')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PublicSafetyAlert)
class PublicSafetyAlertAdmin(GISModelAdmin):
    list_display = ('title', 'severity', 'is_active', 'start_time', 'end_time', 'created_at')
    list_filter = ('severity', 'is_active', 'districts', 'neighborhoods', 'crime_types')
    search_fields = ('title', 'description')
    fieldsets = (
        ('Alert Information', {
            'fields': ('title', 'description', 'severity', 'is_active')
        }),
        ('Geographic Scope', {
            'fields': ('area', 'districts', 'neighborhoods')
        }),
        ('Categorization', {
            'fields': ('crime_types',)
        }),
        ('Timing', {
            'fields': ('start_time', 'end_time')
        }),
        ('Administration', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )
    readonly_fields = ('created_at', 'updated_at')