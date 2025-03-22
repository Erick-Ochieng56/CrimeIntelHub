from rest_framework import serializers
from .models import Report, ReportSection, ReportTemplate, SavedAnalysis, ScheduledReport
from crimes.models import CrimeCategory, District, Neighborhood
from django.utils import timezone


class ReportTemplateSerializer(serializers.ModelSerializer):
    """Serializer for the ReportTemplate model."""
    
    class Meta:
        model = ReportTemplate
        fields = ('id', 'name', 'description', 'report_type', 'is_default')
        read_only_fields = ('id', 'template_file', 'created_at', 'updated_at')


class ReportSerializer(serializers.ModelSerializer):
    """Serializer for the Report model."""
    
    crime_types = serializers.PrimaryKeyRelatedField(
        queryset=CrimeCategory.objects.all(),
        many=True,
        required=False
    )
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
    
    crime_types_names = serializers.SerializerMethodField()
    districts_names = serializers.SerializerMethodField()
    neighborhoods_names = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    format_display = serializers.CharField(source='get_format_display', read_only=True)
    
    class Meta:
        model = Report
        fields = (
            'id', 'title', 'description', 'report_type', 'report_type_display',
             'crime_types', 'crime_types_names', 'districts', 
            'districts_names', 'neighborhoods', 'neighborhoods_names',
            'include_charts', 'include_map', 'format', 'format_display',
            'status', 'status_display', 'progress', 'error_message',
            'file_path', 'file_size', 'download_url',
            'created_at', 'updated_at', 'completed_at'
        )
        read_only_fields = (
            'id', 'user', 'status', 'progress', 'error_message',
            'file_path', 'file_size', 'created_at', 'updated_at', 'completed_at'
        )
    
    def create(self, validated_data):
        crime_types = validated_data.pop('crime_types', [])
        districts = validated_data.pop('districts', [])
        neighborhoods = validated_data.pop('neighborhoods', [])
        
        validated_data['user'] = self.context['request'].user
        report = Report.objects.create(**validated_data)
        
        if crime_types:
            report.crime_types.set(crime_types)
        
        if districts:
            report.districts.set(districts)
        
        if neighborhoods:
            report.neighborhoods.set(neighborhoods)
        
        return report
    
    def get_crime_types_names(self, obj):
        return [ct.name for ct in obj.crime_types.all()]
    
    def get_districts_names(self, obj):
        return [d.name for d in obj.districts.all()]
    
    def get_neighborhoods_names(self, obj):
        return [n.name for n in obj.neighborhoods.all()]
    
    def get_download_url(self, obj):
        return obj.get_file_url()


class ReportGenerationSerializer(serializers.Serializer):
    """Serializer for report generation request."""
    
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    report_type = serializers.ChoiceField(choices=Report.REPORT_TYPES)
    
    # Filters
    time_range = serializers.IntegerField(min_value=1, max_value=3650, default=30)
    crime_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    locations = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    
    # Configuration
    include_charts = serializers.BooleanField(default=True)
    include_map = serializers.BooleanField(default=True)
    format = serializers.ChoiceField(choices=Report.FORMAT_CHOICES, default='pdf')
    
    def validate(self, attrs):
        # Ensure at least one filter is provided
        if not attrs.get('crime_types') and not attrs.get('locations'):
            raise serializers.ValidationError(
                "At least one crime type or location must be specified."
            )
        
        return attrs

class SavedAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for the SavedAnalysis model."""
    
    user_username = serializers.ReadOnlyField(source='user.username')
    
    class Meta:
        model = SavedAnalysis
        fields = [
            'id', 
            'user', 
            'user_username',
            'name', 
            'description', 
            'analysis_type', 
            'configuration', 
            'is_public', 
            'created_at', 
            'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_username', 'created_at', 'updated_at']

class ReportPreviewSerializer(serializers.Serializer):
    """Serializer for report preview request."""
    
    report_type = serializers.ChoiceField(choices=Report.REPORT_TYPES)
    time_range = serializers.IntegerField(min_value=1, max_value=365, default=30)
    crime_types = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    locations = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )


class ScheduledReportSerializer(serializers.ModelSerializer):
    """Serializer for the ScheduledReport model."""
    
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    report_title = serializers.CharField(source='report_template.title', read_only=True)
    
    class Meta:
        model = ScheduledReport
        fields = (
            'id', 'report_template', 'report_title', 'name', 'frequency',
            'frequency_display', 'day_of_week', 'day_of_month', 'recipients',
            'is_active', 'last_run', 'next_run', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'last_run', 'created_at', 'updated_at')
    
    def validate(self, attrs):
        frequency = attrs.get('frequency')
        day_of_week = attrs.get('day_of_week')
        day_of_month = attrs.get('day_of_month')
        
        # Validate day_of_week for weekly frequency
        if frequency == 'weekly' and (day_of_week is None or day_of_week < 1 or day_of_week > 7):
            raise serializers.ValidationError({
                'day_of_week': 'Day of week must be between 1 (Monday) and 7 (Sunday) for weekly reports.'
            })
        
        # Validate day_of_month for monthly and quarterly frequency
        if frequency in ['monthly', 'quarterly'] and (day_of_month is None or day_of_month < 1 or day_of_month > 31):
            raise serializers.ValidationError({
                'day_of_month': 'Day of month must be between 1 and 31 for monthly/quarterly reports.'
            })
        
        return attrs
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        
        # Calculate next run date
        next_run = self.calculate_next_run(
            validated_data['frequency'],
            validated_data.get('day_of_week'),
            validated_data.get('day_of_month')
        )
        validated_data['next_run'] = next_run
        
        return super().create(validated_data)
    
    def calculate_next_run(self, frequency, day_of_week=None, day_of_month=None):
        """Calculate the next run date based on frequency."""
        now = timezone.now()
        
        if frequency == 'daily':
            return now.replace(hour=0, minute=0, second=0, microsecond=0) + timezone.timedelta(days=1)
        
        elif frequency == 'weekly':
            # Get days until next occurrence of day_of_week
            current_day = now.isoweekday()  # 1-7 (Monday-Sunday)
            days_until = (day_of_week - current_day) % 7
            if days_until == 0 and now.hour >= 0:  # If today is the day but after midnight
                days_until = 7  # Schedule for next week
            return now.replace(hour=0, minute=0, second=0, microsecond=0) + timezone.timedelta(days=days_until)
        
        elif frequency in ['monthly', 'quarterly']:
            import calendar
            from dateutil.relativedelta import relativedelta
            
            # Start with first day of next month
            if frequency == 'monthly':
                next_date = now.replace(day=1) + relativedelta(months=1)
            else:  # quarterly
                # Get the first day of the next quarter
                month = ((now.month - 1) // 3 + 1) * 3 + 1
                if month > 12:
                    month = 1
                    next_date = now.replace(year=now.year + 1, month=month, day=1)
                else:
                    next_date = now.replace(month=month, day=1)
            
            # Adjust to requested day of month or last day if too large
            last_day = calendar.monthrange(next_date.year, next_date.month)[1]
            day = min(day_of_month, last_day)
            
            return next_date.replace(day=day, hour=0, minute=0, second=0, microsecond=0)
        
        # Default to tomorrow
        return now.replace(hour=0, minute=0, second=0, microsecond=0) + timezone.timedelta(days=1)
    
    
class ReportSectionSerializer(serializers.ModelSerializer):
    """Serializer for the ReportSection model."""
    
    section_type_display = serializers.CharField(source='get_section_type_display', read_only=True)
    
    class Meta:
        model = ReportSection
        fields = [
            'id',
            'report',
            'title',
            'section_type',
            'section_type_display',
            'content',
            'order',
            'configuration',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']