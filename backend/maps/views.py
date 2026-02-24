"""
Views for the maps app.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from crimes.models import Crime, CrimeCategory, District, Neighborhood
import json


@api_view(['GET'])
@permission_classes([AllowAny])
def map_layers(request):
    """
    Get map layer data for different types of crime data.
    Returns GeoJSON formatted data for map visualization.
    """
    layer_type = request.query_params.get('type', 'crimes')
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    category = request.query_params.get('category')
    district = request.query_params.get('district')

    try:
        # Base queryset
        queryset = Crime.objects.filter(location__isnull=False)

        # Apply filters
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if category:
            queryset = queryset.filter(category__name__icontains=category)
        if district:
            queryset = queryset.filter(district__name__icontains=district)

        # Limit results for performance
        queryset = queryset[:1000]

        # Convert to GeoJSON format
        features = []
        for crime in queryset:
            feature = {
                "type": "Feature",
                "geometry": json.loads(crime.location.geojson) if crime.location else None,
                "properties": {
                    "id": crime.id,
                    "case_number": crime.case_number,
                    "category": crime.category.name if crime.category else "Unknown",
                    "description": crime.description[:100] + "..." if len(crime.description) > 100 else crime.description,
                    "date": crime.date.isoformat(),
                    "status": crime.status,
                    "is_violent": crime.is_violent,
                    "district": crime.district.name if crime.district else None,
                    "neighborhood": crime.neighborhood.name if crime.neighborhood else None,
                }
            }
            features.append(feature)

        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "count": len(features),
                "layer_type": layer_type,
                "filters": {
                    "start_date": start_date,
                    "end_date": end_date,
                    "category": category,
                    "district": district
                }
            }
        }

        return Response(geojson)

    except Exception as e:
        return Response(
            {"error": f"Failed to generate map layer: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )