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
import joblib
import os
from django.conf import settings

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
        """Get predictive analysis for specified parameters."""
        # Extract parameters from request
        date_str = request.query_params.get('date')
        crime_type = request.query_params.get('crime_type')
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        
        # Validate parameters
        if not date_str:
            return Response(
                {"error": "Date is a required parameter."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check if lat and lng were provided and are valid floats
            if lat is not None and lng is not None:
                lat = float(lat)
                lng = float(lng)
                location = Point(lng, lat, srid=4326)
            else:
                # Default to a central point if no location provided
                location = None
            
            # Query predictions
            predictions_qs = CrimePrediction.objects.filter(
                prediction_date=date_str
            )
            
            # Filter by crime type if specified
            if crime_type and crime_type != 'ALL':
                predictions_qs = predictions_qs.filter(crime_type=crime_type)
            
            # Filter by proximity to provided location if location was provided
            if location:
                # Adjust the distance as needed (currently set to ~5km)
                predictions_qs = predictions_qs.filter(
                    location__distance_lte=(location, D(km=5))
                )
            
            # Serialize the data
            serializer = self.get_serializer(predictions_qs, many=True)
            
            # If no results, return an empty array rather than an error
            if not serializer.data:
                return Response([])
            
            # Return the array directly
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
def predict_crime(request):
    """Handle crime prediction requests."""
    data = request.data
    date = data.get('date')
    lat = data.get('lat')
    lng = data.get('lng')
    crime_type = data.get('crime_type', 'ALL')

    # Validate inputs
    if not date or not lat or not lng:
        return Response({"error": "Date, latitude, and longitude are required."}, status=400)

    try:
        lat = float(lat)
        lng = float(lng)
        location = Point(lng, lat, srid=4326)
    except ValueError:
        return Response({"error": "Invalid latitude or longitude."}, status=400)

    # Load the trained model
    model_path = os.path.join(settings.BASE_DIR, 'backend', 'crime_prediction_model.pkl')
    if not os.path.exists(model_path):
        return Response({"error": "Prediction model not found."}, status=500)

    try:
        model = joblib.load(model_path)
    except Exception as e:
        return Response({"error": f"Failed to load prediction model: {str(e)}"}, status=500)

    # Prepare input for the model
    try:
        # Example feature vector: [latitude, longitude]
        features = [lat, lng]
        probability = model.predict_proba([features])[0][1]  # Assuming binary classification
    except Exception as e:
        return Response({"error": f"Prediction failed: {str(e)}"}, status=500)

    # Create prediction result
    try:
        prediction = CrimePredictionResult.objects.create(
            prediction_date=date,
            location=location,
            crime_type=crime_type,
            probability=probability,
            contributing_factors={"latitude": lat, "longitude": lng}
        )

        return Response({
            "prediction_date": prediction.prediction_date,
            "location": {
                "latitude": prediction.location.y,
                "longitude": prediction.location.x
            },
            "crime_type": prediction.crime_type,
            "probability": prediction.probability,
            "contributing_factors": prediction.contributing_factors
        })
    except Exception as e:
        return Response({"error": f"Failed to save prediction result: {str(e)}"}, status=500)


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