from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, UserProfile, UserPreference, UserActivity, PasswordResetToken


class UserAdmin(BaseUserAdmin):
    """Admin configuration for the custom User model."""
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'email', 'phone', 'title', 'bio', 'avatar')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Preferences'), {'fields': ('email_notifications', 'push_notifications', 'sms_notifications')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2'),
        }),
        (_('Additional info'), {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name'),
        }),
    )


class UserProfileAdmin(admin.ModelAdmin):
    """Admin configuration for the UserProfile model."""
    list_display = ('user', 'department', 'badge_number', 'created_at')
    search_fields = ('user__username', 'user__email', 'department', 'badge_number')
    readonly_fields = ('created_at', 'updated_at')


class UserPreferenceAdmin(admin.ModelAdmin):
    """Admin configuration for the UserPreference model."""
    list_display = ('user', 'theme', 'default_view', 'created_at')
    search_fields = ('user__username', 'user__email', 'theme', 'default_view')
    readonly_fields = ('created_at', 'updated_at')


class UserActivityAdmin(admin.ModelAdmin):
    """Admin configuration for the UserActivity model."""
    list_display = ('user', 'activity_type', 'ip_address', 'timestamp')
    list_filter = ('activity_type', 'timestamp')
    search_fields = ('user__username', 'user__email', 'activity_type', 'description')
    readonly_fields = ('timestamp',)


class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Admin configuration for the PasswordResetToken model."""
    list_display = ('user', 'token', 'created_at', 'used')
    list_filter = ('used', 'created_at')
    search_fields = ('user__username', 'user__email', 'token')
    readonly_fields = ('created_at',)


# Register models with the admin site
admin.site.register(User, UserAdmin)
admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(UserPreference, UserPreferenceAdmin)
admin.site.register(UserActivity, UserActivityAdmin)
admin.site.register(PasswordResetToken, PasswordResetTokenAdmin)