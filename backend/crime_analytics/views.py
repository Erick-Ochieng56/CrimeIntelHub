"""
Views for the crime_analytics app.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Count, Avg, Q
from django.utils import timezone
from .models import PredictionModel, HotspotZone, CrimePrediction, PatternAnalysis, DemographicCorrelation, CrimePredictionResult
from .serializers import PredictionModelSerializer, HotspotZoneSerializer, CrimePredictionSerializer, PatternAnalysisSerializer, DemographicCorrelationSerializer
from crimes.models import Crime
from crimes.serializers import CrimeListSerializer
from crime_analytics.ml_service import CrimePredictor
from django.conf import settings
import os

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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['crime_types', 'district', 'neighborhood']
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current active hotspots."""
        today = timezone.now().date()
        queryset = self.get_queryset().filter(
            start_date__lte=today,
            end_date__gte=today
        )

        # Return simple lat/lng format for frontend map
        hotspots_data = []
        for hotspot in queryset:
            # Get centroid of the hotspot boundary for map display
            centroid = hotspot.boundary.centroid
            hotspots_data.append({
                'id': hotspot.id,
                'name': hotspot.name,
                'lat': centroid.y,
                'lng': centroid.x,
                'intensity': hotspot.intensity,
                'start_date': hotspot.start_date.isoformat(),
                'end_date': hotspot.end_date.isoformat(),
                'crime_types': [ct.name for ct in hotspot.crime_types.all()],
                'district': hotspot.district.name if hotspot.district else None,
                'neighborhood': hotspot.neighborhood.name if hotspot.neighborhood else None,
            })

        return Response(hotspots_data)

class CrimePredictionViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for crime predictions."""
    
    queryset = CrimePrediction.objects.all()
    serializer_class = CrimePredictionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['crime_type', 'district', 'neighborhood', 'prediction_date']
    
    @action(detail=False, methods=['get'])
    def predictions(self, request):
        """Get predictive analysis for specified parameters.

        Prefer stored CrimePrediction rows; if none exist and lat/lng are
        provided, run the live unified CrimePredictor.
        """
        date_str = request.query_params.get('date')
        crime_type = request.query_params.get('crime_type')
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')

        if not date_str:
            return Response(
                {"error": "Date is a required parameter."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            location = None
            if lat is not None and lng is not None:
                lat_f = float(lat)
                lng_f = float(lng)
                location = Point(lng_f, lat_f, srid=4326)
            else:
                lat_f = lng_f = None

            predictions_qs = CrimePrediction.objects.filter(prediction_date=date_str)
            if crime_type and crime_type != 'ALL':
                predictions_qs = predictions_qs.filter(crime_type__name__iexact=crime_type)
            if location:
                predictions_qs = predictions_qs.filter(
                    location__dwithin=(location, D(km=5))
                )

            serializer = self.get_serializer(predictions_qs, many=True)
            stored = serializer.data
            # GeoFeature many=True returns FeatureCollection dict even when empty
            has_stored = False
            if isinstance(stored, dict):
                has_stored = bool(stored.get('features'))
            elif isinstance(stored, list):
                has_stored = len(stored) > 0
            if has_stored:
                return Response(stored)

            # Live inference fallback when no precomputed rows
            if lat_f is not None and lng_f is not None:
                predictor = CrimePredictor()
                result = predictor.predict(
                    lat=lat_f,
                    lng=lng_f,
                    date=date_str,
                    crime_type=None if not crime_type or crime_type == 'ALL' else crime_type,
                )
                return Response(result)

            return Response({'type': 'FeatureCollection', 'features': []})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['crime_type', 'demographic_factor', 'district', 'neighborhood']

class CrimeDataViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for fetching crime data for analytics."""
    queryset = Crime.objects.all()
    serializer_class = CrimeListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        """Apply filters for analytics-specific queries."""
        queryset = super().get_queryset()
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        crime_types = self.request.query_params.getlist('crime_types')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if crime_types:
            queryset = queryset.filter(category__name__in=crime_types)

        return queryset

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticatedOrReadOnly])
def predict_crime(request):
    """Live crime risk prediction using the unified ML model."""
    data = request.data
    date = data.get('date')
    lat = data.get('lat')
    lng = data.get('lng')
    crime_type = data.get('crime_type', 'ALL')

    if not date or lat is None or lng is None:
        return Response(
            {"error": "Date, latitude, and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lat = float(lat)
        lng = float(lng)
        location = Point(lng, lat, srid=4326)
    except (TypeError, ValueError):
        return Response(
            {"error": "Invalid latitude or longitude."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        predictor = CrimePredictor()
        result = predictor.predict(
            lat=lat,
            lng=lng,
            date=str(date),
            crime_type=None if crime_type in (None, '', 'ALL') else crime_type,
        )
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response(
            {"error": f"Prediction failed: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Persist a compact result row for history/audit
    try:
        top_prob = 0.0
        if result.get('features'):
            top_prob = max(
                (f['properties']['probability'] for f in result['features']),
                default=0.0,
            )
        CrimePredictionResult.objects.create(
            prediction_date=date,
            location=location,
            crime_type=crime_type or 'ALL',
            probability=top_prob,
            contributing_factors={
                'model_version': result.get('model_version'),
                'features': result.get('features', [])[:1],
            },
        )
    except Exception:
        # Prediction response still useful even if audit row fails
        pass

    return Response(result)


@api_view(['POST'])
def generate_predictions(request):
    """
    Generate crime predictions for a specified date range.
    """
    # Check permissions
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    from django.core.management import call_command

    date = request.data.get('date')
    days_ahead = request.data.get('days_ahead', 7)
    crime_types = request.data.get('crime_types')

    try:
        # Call the management command
        options = {'days_ahead': days_ahead, 'verbosity': 1}
        if date:
            options['date'] = date
        if crime_types:
            options['crime_types'] = crime_types

        call_command('generate_predictions', **options)

        return Response({
            'message': f'Successfully generated predictions for {days_ahead} days',
            'date': date or timezone.now().date().isoformat(),
            'days_ahead': days_ahead
        })

    except Exception as e:
        return Response(
            {'error': f'Failed to generate predictions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )