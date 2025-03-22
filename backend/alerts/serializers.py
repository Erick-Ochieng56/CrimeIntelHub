from rest_framework import serializers
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from .models import Alert, AlertNotification, SavedLocation
from crimes.models import Crime


class AlertSerializer(serializers.ModelSerializer):
    """Serializer for the Alert model."""
    
    latitude = serializers.FloatField(required=True, write_only=True)
    longitude = serializers.FloatField(required=True, write_only=True)
    
    class Meta:
        model = Alert
        fields = (
            'id', 'name', 'crime_type', 'location', 'latitude', 'longitude',
            'radius', 'is_active', 'notification_methods', 'last_notified',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'last_notified', 'created_at', 'updated_at')
    
    def validate(self, attrs):
        """Validate latitude and longitude."""
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        
        if latitude < -90 or latitude > 90:
            raise serializers.ValidationError({'latitude': 'Latitude must be between -90 and 90 degrees.'})
        
        if longitude < -180 or longitude > 180:
            raise serializers.ValidationError({'longitude': 'Longitude must be between -180 and 180 degrees.'})
        
        return attrs
    
    def create(self, validated_data):
        """Create a new alert with coordinates."""
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        
        # Create a Point object for the coordinates
        validated_data['coordinates'] = Point(longitude, latitude)
        
        # Set the user from the request
        validated_data['user'] = self.context['request'].user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update an alert."""
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        if latitude is not None and longitude is not None:
            # Update coordinates if provided
            instance.coordinates = Point(longitude, latitude)
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        """Add latitude and longitude to the output."""
        data = super().to_representation(instance)
        data['latitude'] = instance.latitude
        data['longitude'] = instance.longitude
        return data


class AlertNotificationSerializer(serializers.ModelSerializer):
    """Serializer for AlertNotification model."""
    
    alert_name = serializers.CharField(source='alert.name', read_only=True)
    
    class Meta:
        model = AlertNotification
        fields = (
            'id', 'alert', 'alert_name', 'message', 'crime_count',
            'method', 'status', 'sent_at', 'read_at', 'created_at'
        )
        read_only_fields = (
            'id', 'alert', 'alert_name', 'message', 'crime_count',
            'method', 'sent_at', 'created_at'
        )


class AlertDetailSerializer(AlertSerializer):
    """Extended serializer for Alert details."""
    
    notifications = AlertNotificationSerializer(many=True, read_only=True)
    
    class Meta(AlertSerializer.Meta):
        fields = AlertSerializer.Meta.fields + ('notifications',)


class SavedLocationSerializer(serializers.ModelSerializer):
    """Serializer for SavedLocation model."""
    
    latitude = serializers.FloatField(required=True, write_only=True)
    longitude = serializers.FloatField(required=True, write_only=True)
    
    class Meta:
        model = SavedLocation
        fields = (
            'id', 'name', 'address', 'latitude', 'longitude',
            'notes', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def validate(self, attrs):
        """Validate latitude and longitude."""
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        
        if latitude < -90 or latitude > 90:
            raise serializers.ValidationError({'latitude': 'Latitude must be between -90 and 90 degrees.'})
        
        if longitude < -180 or longitude > 180:
            raise serializers.ValidationError({'longitude': 'Longitude must be between -180 and 180 degrees.'})
        
        return attrs
    
    def create(self, validated_data):
        """Create a new saved location."""
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        
        # Create a Point object for the coordinates
        validated_data['coordinates'] = Point(longitude, latitude)
        
        # Set the user from the request
        validated_data['user'] = self.context['request'].user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update a saved location."""
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        if latitude is not None and longitude is not None:
            # Update coordinates if provided
            instance.coordinates = Point(longitude, latitude)
        
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        """Add latitude and longitude to the output."""
        data = super().to_representation(instance)
        data['latitude'] = instance.latitude
        data['longitude'] = instance.longitude
        return data


class AlertCrimeSerializer(serializers.Serializer):
    """Serializer for crimes in an alert area."""
    
    id = serializers.IntegerField()
    case_number = serializers.CharField()
    category = serializers.CharField(source='category.name')
    description = serializers.CharField()
    date = serializers.DateField()
    time = serializers.TimeField()
    latitude = serializers.FloatField(source='location.y')
    longitude = serializers.FloatField(source='location.x')
    block_address = serializers.CharField()
    is_violent = serializers.BooleanField()
    
    class Meta:
        fields = (
            'id', 'case_number', 'category', 'description', 'date', 'time',
            'latitude', 'longitude', 'block_address', 'is_violent'
        )
