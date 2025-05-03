"""
Serializers for accounts app.
"""
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import UserProfile, UserPreference, PasswordResetToken
from agencies.models import Agency

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
    agency_name = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'title', 'user_type', 'bio', 'avatar',
            'email_notifications', 'push_notifications',
            'sms_notifications', 'profile', 'preferences', 'agency_name',
            'is_staff', 'is_superuser'
        )
        read_only_fields = ('id', 'is_staff', 'is_superuser')

    def get_agency_name(self, obj):
        """Get the agency name if user is associated with an agency."""
        if obj.agency:
            return obj.agency.name
        return None

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
            'first_name', 'last_name'
        )

    def validate(self, attrs):
        """Validate password match."""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs

    def create(self, validated_data):
        """Create new user."""
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data, user_type='user')
        return user

class AgencyRegisterSerializer(serializers.Serializer):
    """Serializer for agency registration."""
    username = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    agency_name = serializers.CharField(max_length=100, required=True)
    agency_type = serializers.ChoiceField(choices=Agency.AGENCY_TYPES, required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    zip_code = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate(self, attrs):
        """Validate agency registration data."""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords don't match"})
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({"username": "Username already exists."})
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "Email already exists."})
        return attrs

    def create(self, validated_data):
        """Create agency and associated user."""
        agency_data = {
            'name': validated_data['agency_name'],
            'agency_type': validated_data['agency_type'],
            'phone': validated_data.get('phone', ''),
            'website': validated_data.get('website', ''),
            'address': validated_data.get('address', ''),
            'city': validated_data.get('city', ''),
            'state': validated_data.get('state', ''),
            'zip_code': validated_data.get('zip_code', ''),
            'status': 'pending'
        }
        agency = Agency.objects.create(**agency_data)
        user_data = {
            'username': validated_data['username'],
            'email': validated_data['email'],
            'password': validated_data['password'],
            'user_type': 'agency',
            'agency': agency
        }
        user = User.objects.create_user(
            username=user_data['username'],
            email=user_data['email'],
            password=user_data['password'],
            user_type='agency',
            agency=agency
        )
        return user

class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        """Validate login credentials."""
        user = authenticate(username=attrs['username'], password=attrs['password'])
        if not user:
            raise serializers.ValidationError({"non_field_errors": "Invalid credentials"})
        attrs['user'] = user
        return attrs

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
    
class AdminLoginSerializer(serializers.Serializer):
    """Serializer for admin login."""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)