"""
Serializers for accounts app.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import UserProfile, UserPreference, PasswordResetToken

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profiles."""

    class Meta:
        model = UserProfile
        fields = (
            'department', 'badge_number', 'emergency_contact',
            'emergency_phone', 'notes', 'work_hours_start',
            'work_hours_end', 'work_days'
        )


class UserPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user preferences."""

    class Meta:
        model = UserPreference
        fields = (
            'default_map_center_lat', 'default_map_center_lng',
            'default_map_zoom', 'theme', 'items_per_page',
            'default_view', 'preferred_report_format',
            'auto_refresh_interval', 'quiet_hours_start',
            'quiet_hours_end', 'notification_radius'
        )


class UserSerializer(serializers.ModelSerializer):
    """Serializer for users."""

    profile = UserProfileSerializer(required=False)
    preferences = UserPreferenceSerializer(required=False)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'organization', 'is_agency_user', 'phone', 'title',
            'bio', 'avatar', 'email_notifications', 'push_notifications',
            'sms_notifications', 'profile', 'preferences'
        )
        read_only_fields = ('id',)

    def update(self, instance, validated_data):
        """Update user and related models."""
        profile_data = validated_data.pop('profile', {})
        preferences_data = validated_data.pop('preferences', {})

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update profile if provided
        if profile_data:
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)
            instance.profile.save()

        # Update preferences if provided
        if preferences_data:
            for attr, value in preferences_data.items():
                setattr(instance.preferences, attr, value)
            instance.preferences.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            'username', 'password', 'confirm_password', 'email',
            'first_name', 'last_name', 'organization', 'is_agency_user'
        )

    def validate(self, attrs):
        """Validate password match."""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs

    def create(self, validated_data):
        """Create new user."""
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class LogoutSerializer(serializers.Serializer):
    """Serializer for user logout."""
    
    refresh = serializers.CharField(required=True)

class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        """Validate password match."""
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "Passwords don't match"})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    token = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        """Validate password match and token."""
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "Passwords don't match"})

        try:
            token = PasswordResetToken.objects.get(
                token=attrs['token'],
                user__email=attrs['email'],
                used=False
            )
            if token.is_expired:
                raise serializers.ValidationError({"token": "Token has expired"})
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({"token": "Invalid token"})

        return attrs