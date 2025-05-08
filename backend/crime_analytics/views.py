"""
Views for the crime_analytics app.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.db.models import Count, Avg
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
    def predictions(self, request):
        """Get predictive analysis for specified parameters."""
        # Extract parameters from request
        date_str = request.query_params.get('date')
        crime_type = request.query_params.get('crime_type')
        lat_str = request.query_params.get('lat')
        lng_str = request.query_params.get('lng')
        
        # Validate parameters
        if not date_str:
            return Response(
                {"error": "Date is a required parameter."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check if lat and lng were provided and are valid floats
            if lat_str is not None and lng_str is not None:
                try:
                    lat = float(lat_str)
                    lng = float(lng_str)
                    
                    # Basic validation for lat/lng ranges
                    if lat < -90 or lat > 90 or lng < -180 or lng > 180:
                        return Response(
                            {"error": "Latitude must be between -90 and 90, and longitude must be between -180 and 180."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                        
                    location = Point(lng, lat, srid=4326)
                except ValueError:
                    return Response(
                        {"error": "Invalid latitude or longitude format. Must be valid numbers."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
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
            
            # Return the array directly - this is key
            return Response(serializer.data)
            
        except ValueError as e:
            return Response(
                {"error": f"Invalid parameter value: {str(e)}"},
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

class CrimeDataViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for fetching crime data for analytics."""
    queryset = Crime.objects.all()
    serializer_class = CrimeListSerializer
    permission_classes = [permissions.IsAuthenticated]

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

@api_view(['POST', 'GET'])
def predict_crime(request):
    """Handle crime prediction requests."""
    # Get data from either POST body or GET query params
    if request.method == 'POST':
        data = request.data
    else:  # GET
        data = request.query_params
        
    date = data.get('date')
    lat_str = data.get('lat')
    lng_str = data.get('lng')
    crime_type = data.get('crime_type', 'ALL')

    # Validate inputs
    if not date:
        return Response({"error": "Date is required."}, status=400)
    
    # Optional location parameters
    if lat_str and lng_str:
        try:
            lat = float(lat_str)
            lng = float(lng_str)
            
            # Basic validation for lat/lng ranges
            if lat < -90 or lat > 90 or lng < -180 or lng > 180:
                return Response(
                    {"error": "Latitude must be between -90 and 90, and longitude must be between -180 and 180."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            location = Point(lng, lat, srid=4326)
        except ValueError:
            return Response({"error": "Invalid latitude or longitude format. Must be valid numbers."}, status=400)
    else:
        # Default location if not provided
        # This is just an example - you might want to adjust this based on your application's needs
        lat = 0
        lng = 0
        location = Point(lng, lat, srid=4326)

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