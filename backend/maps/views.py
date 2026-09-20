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
import datetime
import json
import os
import urllib.error
import urllib.parse
import urllib.request
import logging

logger = logging.getLogger(__name__)

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
                    "description": (
                        (crime.description[:100] + "...")
                        if crime.description and len(crime.description) > 100
                        else (crime.description or "")
                    ),
                    "date": crime.date.isoformat() if crime.date else None,
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


def _parse_latlng(value):
    """Parse 'lat,lng' into (lat, lng) floats."""
    if not value or ',' not in value:
        return None
    parts = value.split(',')
    if len(parts) != 2:
        return None
    try:
        lat = float(parts[0].strip())
        lng = float(parts[1].strip())
    except (TypeError, ValueError):
        return None
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None
    return lat, lng


@api_view(['GET'])
@permission_classes([AllowAny])
def map_clusters(request):
    """
    Thin alias for crime heatmap/cluster points (matches frontend API_ENDPOINTS.MAPS.CLUSTERS).
    Returns [{lat, lng, intensity}, ...].
    """
    days = int(request.query_params.get('days', 30))
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=days)

    start_date_param = request.query_params.get('start_date')
    end_date_param = request.query_params.get('end_date')
    if start_date_param:
        try:
            start_date = datetime.date.fromisoformat(start_date_param[:10])
        except ValueError:
            pass
    if end_date_param:
        try:
            end_date = datetime.date.fromisoformat(end_date_param[:10])
        except ValueError:
            pass

    queryset = Crime.objects.filter(
        location__isnull=False,
        date__gte=start_date,
        date__lte=end_date,
    )

    crime_types = request.query_params.get('crime_types') or request.query_params.get('crimeTypes')
    if crime_types:
        queryset = queryset.filter(category__name__in=crime_types.split(','))

    points = []
    for crime in queryset[:5000]:
        days_ago = (end_date - crime.date).days if crime.date else 0
        recency = 1.0 - (days_ago / days) if days > 0 else 1.0
        intensity = recency * (2.0 if crime.is_violent else 1.0)
        points.append({
            'lat': crime.location.y,
            'lng': crime.location.x,
            'intensity': intensity,
            'count': 1,
        })

    return Response(points)


@api_view(['GET'])
@permission_classes([AllowAny])
def route_proxy(request):
    """
    Proxy driving directions to self-hosted OSRM (avoids browser CORS).

    Query params:
      origin=lat,lng
      destination=lat,lng
    """
    origin = _parse_latlng(request.query_params.get('origin'))
    destination = _parse_latlng(request.query_params.get('destination'))
    if not origin or not destination:
        return Response(
            {"error": "origin and destination are required as lat,lng"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    osrm_base = os.environ.get('OSRM_URL', 'http://osrm:5000').rstrip('/')
    # OSRM expects lon,lat
    coords = f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
    qs = urllib.parse.urlencode({"overview": "full", "geometries": "geojson"})
    url = f"{osrm_base}/route/v1/driving/{coords}?{qs}"

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:500]
        return Response(
            {"error": "Routing unavailable", "detail": body},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return Response(
            {"error": "Routing unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if payload.get("code") and payload.get("code") != "Ok":
        return Response(
            {"error": "No route found", "code": payload.get("code")},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(payload)