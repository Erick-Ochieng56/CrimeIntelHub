"""
Views for the crime_analytics app.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Count, Avg
from .models import PredictionModel, HotspotZone, CrimePrediction, PatternAnalysis, DemographicCorrelation
from .serializers import PredictionModelSerializer, HotspotZoneSerializer, CrimePredictionSerializer, PatternAnalysisSerializer, DemographicCorrelationSerializer

class PredictionModelViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for prediction models."""
    queryset = PredictionModel.objects.filter(is_active=True)
    serializer_class = PredictionModelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['algorithm_type']
    
    # Will implement additional endpoints and logic later

class HotspotZoneViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for crime hotspot zones."""
    queryset = HotspotZone.objects.all()
    serializer_class = HotspotZoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['crime_types', 'district', 'neighborhood']
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current active hotspots."""
        # Implement this later
        return Response({"detail": "Not implemented yet"}, status=status.HTTP_501_NOT_IMPLEMENTED)

class CrimePredictionViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for crime predictions."""
    
    queryset = CrimePrediction.objects.all()
    serializer_class = CrimePredictionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['crime_type', 'district', 'neighborhood', 'prediction_date']
    
@action(detail=False, methods=['get'])
def predictive_analysis(self, request):
    """Get predictive analysis for specified parameters."""
    # Extract parameters from request
    date_str = request.query_params.get('date')
    crime_type = request.query_params.get('crimeType')
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')
    
    # Validate parameters
    if not all([date_str, lat, lng]):
        return Response(
            {"error": "Date, latitude, and longitude are required parameters."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Create location point
        location = Point(float(lng), float(lat), srid=4326)
        
        # Query predictions
        predictions_qs = CrimePrediction.objects.filter(
            prediction_date=date_str
        )
        
        # Filter by crime type if specified
        if crime_type and crime_type != 'ALL':
            predictions_qs = predictions_qs.filter(crime_type=crime_type)
        
        # Filter by proximity to provided location
        # Adjust the distance as needed (currently set to ~5km)
        predictions_qs = predictions_qs.filter(
            location__distance_lte=(location, D(km=5))
        )
        
        # Serialize the data
        serializer = self.get_serializer(predictions_qs, many=True)
        
        # Return the array directly - this is key
        return Response(serializer.data)
        
    except ValueError:
        return Response(
            {"error": "Invalid latitude or longitude."},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 

class PatternAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoint for pattern analysis."""
    serializer_class = PatternAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return PatternAnalysis.objects.none()
        
        """Return analyses for the current user."""
        return PatternAnalysis.objects.filter(created_by=self.request.user)

class DemographicCorrelationViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for demographic correlations."""
    queryset = DemographicCorrelation.objects.all()
    serializer_class = DemographicCorrelationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['crime_type', 'demographic_factor', 'district', 'neighborhood']