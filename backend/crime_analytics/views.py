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
    def by_location(self, request):
        """Get predictions for a specific location."""
        # Implement this later
        return Response({"detail": "Not implemented yet"}, status=status.HTTP_501_NOT_IMPLEMENTED)

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