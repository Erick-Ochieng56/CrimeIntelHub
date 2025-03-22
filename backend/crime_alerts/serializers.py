from rest_framework import serializers
from django.contrib.gis.geos import Point
from .models import Alert, AlertNotification, NotificationPreference, PublicSafetyAlert
from crimes.models import CrimeCategory, District, Neighborhood

class AlertSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)
    
    class Meta:
        model = Alert
        fields = [
            'id', 'name', 'description', 'crime_types', 'location', 'latitude', 'longitude',
            'radius', 'districts', 'neighborhoods', 'time_window', 'is_active',
            'notification_methods', 'total_notifications', 'last_notified',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_notifications', 'last_notified', 'created_at', 'updated_at']
    
    def validate(self, data):
        """
        Convert latitude and longitude to Point object.
        """
        if 'latitude' in data and 'longitude' in data:
            data['location'] = Point(data.pop('longitude'), data.pop('latitude'), srid=4326)
        return data
    
    def to_representation(self, instance):
        """
        Add latitude and longitude to the response.
        """
        data = super().to_representation(instance)
        data['latitude'] = instance.latitude()
        data['longitude'] = instance.longitude()
        return data


class AlertNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertNotification
        fields = [
            'id', 'alert', 'user', 'title', 'message', 'crime_data', 'notification_type',
            'status', 'error_message', 'created_at', 'sent_at', 'read_at'
        ]
        read_only_fields = ['id', 'alert', 'user', 'created_at', 'sent_at', 'read_at']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'email_enabled', 'sms_enabled', 'push_enabled', 'quiet_hours_start',
            'quiet_hours_end', 'frequency', 'min_severity', 'max_daily_notifications',
            'crime_type_preferences', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PublicSafetyAlertSerializer(serializers.ModelSerializer):
    districts = serializers.PrimaryKeyRelatedField(
        queryset=District.objects.all(),
        many=True,
        required=False
    )
    neighborhoods = serializers.PrimaryKeyRelatedField(
        queryset=Neighborhood.objects.all(),
        many=True,
        required=False
    )
    crime_types = serializers.PrimaryKeyRelatedField(
        queryset=CrimeCategory.objects.all(),
        many=True,
        required=False
    )
    
    class Meta:
        model = PublicSafetyAlert
        fields = [
            'id', 'title', 'description', 'severity', 'area', 'districts',
            'neighborhoods', 'crime_types', 'start_time', 'end_time', 'is_active',
            'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']