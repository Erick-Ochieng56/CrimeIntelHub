import datetime
import logging
from django.http import JsonResponse, FileResponse
from django.conf import settings
import os
import json
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db.models import Count, Sum, Q, F
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance, Centroid
from django.contrib.gis.measure import D
from rest_framework import viewsets, permissions, status, filters, serializers
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.core.cache import cache
import redis
from rest_framework_gis.serializers import GeoModelSerializer as GeoJSONSerializer
from rest_framework_gis.fields import GeometryField
from django.http import FileResponse
from io import BytesIO
from .models import (
    CrimeCategory, District, Neighborhood, Crime,
    CrimeMedia, CrimeNote, CrimeStatistic
)
from .serializers import (
    CrimeCategorySerializer, CrimeMediaSerializer, CrimeNoteSerializer, DistrictSerializer, NeighborhoodSerializer,
    CrimeListSerializer, CrimeDetailSerializer, CrimeCreateSerializer,
    CrimeStatisticSerializer, CrimeHeatmapSerializer, CrimeSearchSerializer,
    CrimeStatResponseSerializer, PublicCrimeSerializer
)
from accounts.permissions import IsAgencyUser

class CrimeFilter(django_filters.FilterSet):
    """Filter for Crime model."""
    category = django_filters.CharFilter(field_name='category__name', lookup_expr='icontains')
    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    status = django_filters.CharFilter(field_name='status')
    is_violent = django_filters.BooleanFilter(field_name='is_violent')
    district = django_filters.NumberFilter(field_name='district__id')
    neighborhood = django_filters.NumberFilter(field_name='neighborhood__id')
    agency = django_filters.NumberFilter(field_name='agency__id')

    class Meta:
        model = Crime
        fields = [
            'category', 'date_from', 'date_to', 'status',
            'is_violent', 'district', 'neighborhood', 'agency'
        ]


class NeighborhoodCrimeSummarySerializer(GeoJSONSerializer):
    """Serializer for neighborhood crime summaries."""
    neighborhood_id = serializers.IntegerField(source='neighborhood__id')
    neighborhood_name = serializers.CharField(source='neighborhood__name')
    district_name = serializers.CharField(source='neighborhood__district__name')
    crime_count = serializers.IntegerField()
    violent_count = serializers.IntegerField()
    centroid = GeometryField()

class CrimeViewSet(viewsets.ModelViewSet):
    """API endpoint for crimes."""
    queryset = Crime.objects.all()
    serializer_class = CrimeListSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_class = CrimeFilter
    search_fields = ['description', 'block_address', 'case_number']
    ordering_fields = ['date', 'time', 'category__name', 'status']
    ordering = ['-date', '-time']

    def get_serializer_class(self):
        """Return appropriate serializer class based on action."""
        if self.action == 'retrieve':
            return CrimeDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CrimeCreateSerializer
        elif self.action in ['map_data', 'public_crimes']:
            return CrimeListSerializer
        elif self.action in ['neighborhood_summary', 'download_summary']:
            return NeighborhoodCrimeSummarySerializer
        return CrimeListSerializer

    def get_permissions(self):
        """Apply IsAgencyUser for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAgencyUser()]
        return super().get_permissions()

    def get_queryset(self):
        """Apply additional filters to queryset."""
        user = self.request.user
        logger = logging.getLogger(__name__)
        queryset = super().get_queryset()

        logger.info(f"Initial queryset count: {queryset.count()}")

        # Filter by user's agency for agency users
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            queryset = queryset.filter(agency=user.agency)
            logger.info(f"After agency filter: {queryset.count()} records")
        elif not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
            queryset = queryset.filter(status__in=['reported', 'solved', 'closed'])
            logger.info(f"After status filter: {queryset.count()} records")

        # Ensure location is not null
        queryset = queryset.filter(location__isnull=False)
        logger.info(f"After location filter: {queryset.count()} records")

        # Geospatial filter
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius')
        if lat and lng and radius:
            try:
                point = Point(float(lng), float(lat), srid=4326)
                queryset = queryset.filter(location__dwithin=(point, D(km=float(radius))))
                logger.info(f"After geospatial filter (radius={radius} km): {queryset.count()} records")
            except (ValueError, TypeError) as e:
                logger.error(f"Geospatial filter error: {e}")

        # Apply additional filters
        crime_types = self.request.query_params.get('crimeTypes', '').split(',')
        if crime_types and crime_types[0]:
            queryset = queryset.filter(category__name__in=[t.lower() for t in crime_types])
            logger.info(f"After crime types filter ({crime_types}): {queryset.count()} records")

        start_date = self.request.query_params.get('startDate')
        if start_date:
            try:
                queryset = queryset.filter(date__gte=start_date)
                logger.info(f"After start date filter ({start_date}): {queryset.count()} records")
            except ValueError as e:
                logger.error(f"Start date filter error: {e}")

        end_date = self.request.query_params.get('endDate')
        if end_date:
            try:
                queryset = queryset.filter(date__lte=end_date)
                logger.info(f"After end date filter ({end_date}): {queryset.count()} records")
            except ValueError as e:
                logger.error(f"End date filter error: {e}")

        logger.info(f"Final queryset count: {queryset.count()}")
        return queryset

    def perform_create(self, serializer):
        """Ensure the crime is associated with the user's agency."""
        user = self.request.user
        if user.user_type != 'agency' or not user.agency:
            return Response({'error': 'Only agency users can create crimes'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save(agency=user.agency)

    def perform_update(self, serializer):
        """Ensure the crime belongs to the user's agency."""
        user = self.request.user
        instance = self.get_object()
        if user.user_type != 'agency' or not user.agency or instance.agency != user.agency:
            return Response({'error': 'You can only update your agency’s crimes'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()

    def perform_destroy(self, instance):
        """Ensure the crime belongs to the user's agency."""
        user = self.request.user
        if user.user_type != 'agency' or not user.agency or instance.agency != user.agency:
            return Response({'error': 'You can only delete your agency’s crimes'}, status=status.HTTP_403_FORBIDDEN)
        instance.delete()

    @method_decorator(cache_page(60 * 15))  # Cache for 15 minutes
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get crime statistics for dashboard charts."""
        logger = logging.getLogger(__name__)
        try:
            cache_key = f"crime_stats_{request.user.id if request.user.is_authenticated else 'anon'}_{request.query_params.get('agency_id')}_{request.query_params.get('time_frame', 'last30Days')}"
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info("Using cached stats data.")
                return Response(cached_data)

            user = self.request.user
            agency_id = request.query_params.get('agency_id')
            time_frame = request.query_params.get('time_frame', 'last30Days')
            crime_types = request.query_params.get('crime_types', '').split(',')
            radius = request.query_params.get('radius', 5)

            logger.info(f"Stats request parameters: agency_id={agency_id}, time_frame={time_frame}, crime_types={crime_types}, radius={radius}")

            end_date = datetime.date.today()
            if time_frame == 'last30Days':
                start_date = end_date - datetime.timedelta(days=30)
                previous_start_date = start_date - datetime.timedelta(days=30)
                previous_end_date = start_date - datetime.timedelta(days=1)
            elif time_frame == 'last90Days':
                start_date = end_date - datetime.timedelta(days=90)
                previous_start_date = start_date - datetime.timedelta(days=90)
                previous_end_date = start_date - datetime.timedelta(days=1)
            elif time_frame == 'thisYear':
                start_date = datetime.date(end_date.year, 1, 1)
                previous_start_date = datetime.date(end_date.year - 1, 1, 1)
                previous_end_date = datetime.date(end_date.year - 1, 12, 31)
            else:
                start_date = end_date - datetime.timedelta(days=30)
                previous_start_date = start_date - datetime.timedelta(days=30)
                previous_end_date = start_date - datetime.timedelta(days=1)

            area_filter = Q()
            lat = self.request.query_params.get('lat')
            lng = self.request.query_params.get('lng')
            if lat and lng and radius:
                try:
                    point = Point(float(lng), float(lat), srid=4326)
                    area_filter = Q(location__dwithin=(point, D(km=float(radius))))
                except (ValueError, TypeError) as e:
                    logger.error(f"Invalid geospatial parameters: {e}")

            type_filter = Q()
            if crime_types and crime_types[0]:
                type_filter = Q(category__name__in=crime_types)

            agency_filter = Q()
            if agency_id:
                try:
                    agency_filter = Q(agency_id=int(agency_id))
                except ValueError:
                    logger.error(f"Invalid agency_id: {agency_id}")
            elif user.is_authenticated and user.user_type == 'agency' and user.agency:
                agency_filter = Q(agency=user.agency)

            status_filter = Q()
            if not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
                status_filter = Q(status__in=['reported', 'solved', 'closed'])

            base_query = Crime.objects.filter(location__isnull=False)
            current_crimes = base_query.filter(
                date__gte=start_date,
                date__lte=end_date
            ).filter(area_filter).filter(type_filter).filter(agency_filter).filter(status_filter)
            previous_crimes = base_query.filter(
                date__gte=previous_start_date,
                date__lte=previous_end_date
            ).filter(area_filter).filter(type_filter).filter(agency_filter).filter(status_filter)

            crime_type_counts = current_crimes.values('category__name').annotate(
                count=Count('id')
            ).order_by('-count')[:10]

            if not current_crimes.exists() and not crime_type_counts:
                categories = CrimeCategory.objects.all()[:5]
                crime_type_counts = [{'category__name': cat.name, 'count': 0} for cat in categories]

            stats = {
                'total_crimes': current_crimes.count(),
                'previous_total_crimes': previous_crimes.count(),
                'violent_crimes': current_crimes.filter(is_violent=True).count(),
                'previous_violent_crimes': previous_crimes.filter(is_violent=True).count(),
                'property_crimes': current_crimes.filter(property_loss__isnull=False).count(),
                'previous_property_crimes': previous_crimes.filter(property_loss__isnull=False).count(),
                'arrests': current_crimes.filter(arrests_made=True).count(),
                'previous_arrests': previous_crimes.filter(arrests_made=True).count(),
                'top_crimes': list(crime_type_counts),
            }

            serializer = CrimeStatResponseSerializer(stats)
            cache.set(cache_key, serializer.data, timeout=3600)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in stats action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @method_decorator(cache_page(60 * 15))
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get crime trends over time for Line chart."""
        logger = logging.getLogger(__name__)
        try:
            cache_key = f"crime_trends_{request.user.id if request.user.is_authenticated else 'anon'}_{request.query_params.get('months', 6)}_{request.query_params.get('agency_id')}"
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info("Using cached trends data.")
                return Response(cached_data)

            user = self.request.user
            months = int(request.query_params.get('months', 6))
            agency_id = request.query_params.get('agency_id')
            end_date = datetime.date.today()
            start_date = end_date - relativedelta(months=months)

            lat = request.query_params.get('lat')
            lng = request.query_params.get('lng')
            radius = request.query_params.get('radius')
            area_filter = Q()
            if lat and lng and radius:
                try:
                    point = Point(float(lng), float(lat), srid=4326)
                    area_filter = Q(location__dwithin=(point, D(km=float(radius))))
                except (ValueError, TypeError) as e:
                    logger.error(f"Invalid geospatial parameters: {e}")

            agency_filter = Q()
            if agency_id:
                try:
                    agency_filter = Q(agency_id=int(agency_id))
                except ValueError:
                    logger.error(f"Invalid agency_id: {agency_id}")
                    return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
            elif user.is_authenticated and user.user_type == 'agency' and user.agency:
                agency_filter = Q(agency=user.agency)

            status_filter = Q()
            if not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
                status_filter = Q(status__in=['reported', 'solved', 'closed'])

            type_filter = Q()
            crime_types = request.query_params.get('crime_types', '').split(',')
            if crime_types and crime_types[0]:
                type_filter = Q(category__name__in=crime_types)

            queryset = Crime.objects.filter(
                date__gte=start_date,
                date__lte=end_date,
                location__isnull=False
            ).filter(area_filter).filter(agency_filter).filter(status_filter).filter(type_filter)

            trends = []
            current_date = start_date.replace(day=1)
            labels = []
            total_crimes = []
            violent_crimes = []
            property_crimes = []
            arrests_data = []

            has_data = queryset.exists()
            while current_date <= end_date:
                next_month = current_date + relativedelta(months=1)
                month_crimes = queryset.filter(date__gte=current_date, date__lt=next_month)
                month_count = month_crimes.count()

                if has_data:
                    violent_count = month_crimes.filter(is_violent=True).count()
                    property_count = month_crimes.filter(property_loss__isnull=False).count()
                    arrests_count = month_crimes.filter(arrests_made=True).count()
                else:
                    import random
                    month_count = random.randint(30, 100)
                    violent_count = random.randint(5, 20)
                    property_count = random.randint(15, 40)
                    arrests_count = random.randint(2, 15)
                    logger.info(f"Using placeholder data for {current_date.strftime('%Y-%m')}")

                trends.append({
                    'date': current_date.strftime('%Y-%m'),
                    'total': month_count,
                    'violent': violent_count,
                    'property': property_count,
                    'arrests': arrests_count
                })

                labels.append(current_date.strftime('%b %Y'))
                total_crimes.append(month_count)
                violent_crimes.append(violent_count)
                property_crimes.append(property_count)
                arrests_data.append(arrests_count)

                current_date = next_month

            chart_data = {
                'labels': labels,
                'datasets': [
                    {
                        'label': 'Total Crimes',
                        'data': total_crimes,
                        'fill': False,
                        'backgroundColor': 'rgba(75, 192, 192, 0.6)',
                        'borderColor': 'rgba(75, 192, 192, 1)',
                        'tension': 0.1
                    },
                    {
                        'label': 'Violent Crimes',
                        'data': violent_crimes,
                        'fill': False,
                        'backgroundColor': 'rgba(255, 99, 132, 0.6)',
                        'borderColor': 'rgba(255, 99, 132, 1)',
                        'tension': 0.1
                    },
                    {
                        'label': 'Property Crimes',
                        'data': property_crimes,
                        'fill': False,
                        'backgroundColor': 'rgba(255, 159, 64, 0.6)',
                        'borderColor': 'rgba(255, 159, 64, 1)',
                        'tension': 0.1
                    },
                    {
                        'label': 'Arrests',
                        'data': arrests_data,
                        'fill': False,
                        'backgroundColor': 'rgba(54, 162, 235, 0.6)',
                        'borderColor': 'rgba(54, 162, 235, 1)',
                        'tension': 0.1
                    }
                ],
                'rawData': trends
            }

            cache.set(cache_key, chart_data, timeout=3600)
            return Response(chart_data)
        except Exception as e:
            logger.error(f"Error in trends action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @method_decorator(cache_page(60 * 15))
    @action(detail=False, methods=['get'])
    def heatmap(self, request):
        """Get data for a crime heatmap."""
        logger = logging.getLogger(__name__)
        try:
            cache_key = f"crime_heatmap_{request.user.id if request.user.is_authenticated else 'anon'}_{request.query_params.get('days', 30)}_{request.query_params.get('agency_id')}"
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info("Using cached heatmap data.")
                return Response(cached_data)

            user = self.request.user
            days = int(request.query_params.get('days', 30))
            agency_id = request.query_params.get('agency_id')
            end_date = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=days)

            crime_type_filter = Q()
            crime_types = request.query_params.get('crime_types')
            if crime_types:
                crime_type_list = crime_types.split(',')
                crime_type_filter = Q(category__name__in=crime_type_list)

            agency_filter = Q()
            if agency_id:
                try:
                    agency_filter = Q(agency_id=int(agency_id))
                except ValueError:
                    return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
            elif user.is_authenticated and user.user_type == 'agency' and user.agency:
                agency_filter = Q(agency=user.agency)

            status_filter = Q()
            if not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
                status_filter = Q(status__in=['reported', 'solved', 'closed'])

            crimes = Crime.objects.filter(
                date__gte=start_date,
                date__lte=end_date,
                location__isnull=False
            ).filter(crime_type_filter).filter(agency_filter).filter(status_filter)

            heatmap_data = []
            for crime in crimes:
                days_ago = (end_date - crime.date).days
                recency_factor = 1.0 - (days_ago / days) if days > 0 else 1.0
                severity_factor = 2.0 if crime.is_violent else 1.0
                intensity = recency_factor * severity_factor

                heatmap_data.append({
                    'lat': crime.location.y,
                    'lng': crime.location.x,
                    'intensity': intensity
                })

            serializer = CrimeHeatmapSerializer(heatmap_data, many=True)
            cache.set(cache_key, serializer.data, timeout=3600)
            logger.info(f"Generated heatmap data: {len(heatmap_data)} points")
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in heatmap action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def search(self, request):
        """Advanced search for crimes with offset/limit."""
        logger = logging.getLogger(__name__)
        try:
            user = self.request.user
            agency_id = request.query_params.get('agency_id')
            offset = int(request.query_params.get('offset', 0))
            limit = int(request.query_params.get('limit', 1000))

            serializer = CrimeSearchSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            point = Point(
                serializer.validated_data['longitude'],
                serializer.validated_data['latitude'],
                srid=4326
            )

            agency_filter = Q()
            if agency_id:
                try:
                    agency_filter = Q(agency_id=int(agency_id))
                except ValueError:
                    return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
            elif user.is_authenticated and user.user_type == 'agency' and user.agency:
                agency_filter = Q(agency=user.agency)

            status_filter = Q()
            if not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
                status_filter = Q(status__in=['reported', 'solved', 'closed'])

            queryset = Crime.objects.filter(
                location__dwithin=(point, D(km=serializer.validated_data['radius'])),
                location__isnull=False
            ).filter(agency_filter).filter(status_filter)

            if 'crime_types' in serializer.validated_data:
                queryset = queryset.filter(category__name__in=serializer.validated_data['crime_types'])
            if 'start_date' in serializer.validated_data:
                queryset = queryset.filter(date__gte=serializer.validated_data['start_date'])
            if 'end_date' in serializer.validated_data:
                queryset = queryset.filter(date__lte=serializer.validated_data['end_date'])
            if 'keywords' in serializer.validated_data:
                keyword_filter = Q(description__icontains=serializer.validated_data['keywords']) | \
                                Q(block_address__icontains=serializer.validated_data['keywords'])
                queryset = queryset.filter(keyword_filter)
            if 'is_violent' in serializer.validated_data:
                queryset = queryset.filter(is_violent=serializer.validated_data['is_violent'])
            if 'status' in serializer.validated_data:
                queryset = queryset.filter(status=serializer.validated_data['status'])

            queryset = queryset.order_by('date', 'time')[offset:offset + limit]
            serializer = CrimeListSerializer(queryset, many=True)
            logger.info(f"Search returned {len(serializer.data)} crimes (offset={offset}, limit={limit})")
            return Response({
                'results': serializer.data,
                'count': queryset.count(),
                'offset': offset,
                'limit': limit
            })
        except Exception as e:
            logger.error(f"Error in search action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def map_data(self, request):
        """Get lightweight crime data for map visualization."""
        logger = logging.getLogger(__name__)
        try:
            offset = int(request.query_params.get('offset', 0))
            limit = int(request.query_params.get('limit', 1000))
            neighborhood_id = request.query_params.get('neighborhood_id')
            start_date = request.query_params.get('start_date') or datetime.date.today() - datetime.timedelta(days=30)
            end_date = request.query_params.get('end_date')
            user = self.request.user

            queryset = self.get_queryset()
            if neighborhood_id:
                try:
                    queryset = queryset.filter(neighborhood__id=int(neighborhood_id))
                except ValueError:
                    logger.error(f"Invalid neighborhood_id: {neighborhood_id}")
                    return Response({'error': 'Invalid neighborhood_id'}, status=status.HTTP_400_BAD_REQUEST)
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)

            queryset = queryset[offset:offset + limit]
            serializer = CrimeLightSerializer(queryset, many=True)
            logger.info(f"Map data returned {len(serializer.data)} crimes (offset={offset}, limit={limit})")
            return Response({
                'results': serializer.data,
                'count': queryset.count(),
                'offset': offset,
                'limit': limit
            })
        except Exception as e:
            logger.error(f"Error in map_data action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CrimeCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for crime categories."""
    queryset = CrimeCategory.objects.all()
    serializer_class = CrimeCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'severity_level']
    ordering = ['name']

class DistrictViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for districts."""
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ['name', 'code']
    ordering_fields = ['name']
    ordering = ['name']

    def get_queryset(self):
        """Filter districts by user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return District.objects.filter(agency=user.agency)
        return District.objects.all()

class NeighborhoodViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for neighborhoods."""
    queryset = Neighborhood.objects.all()
    serializer_class = NeighborhoodSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']

    def get_queryset(self):
        """Filter neighborhoods by user's agency districts."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return Neighborhood.objects.filter(district__agency=user.agency)
        return Neighborhood.objects.all()

class CrimeStatisticViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for crime statistics."""
    queryset = CrimeStatistic.objects.all()
    serializer_class = CrimeStatisticSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['date', 'category', 'district', 'neighborhood', 'agency']
    ordering_fields = ['date', 'count', 'violent_count', 'arrests']
    ordering = ['-date']

    def get_queryset(self):
        """Filter statistics by user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return CrimeStatistic.objects.filter(agency=user.agency)
        return CrimeStatistic.objects.all()

class CrimeMediaViewSet(viewsets.ModelViewSet):
    """API endpoint for crime media."""
    queryset = CrimeMedia.objects.all()
    serializer_class = CrimeMediaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['crime']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter media by user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return CrimeMedia.objects.filter(crime__agency=user.agency)
        return CrimeMedia.objects.all()

class CrimeNoteViewSet(viewsets.ModelViewSet):
    """API endpoint for crime notes."""
    queryset = CrimeNote.objects.all()
    serializer_class = CrimeNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['crime']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter notes by user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return CrimeNote.objects.filter(crime__agency=user.agency)
        return CrimeNote.objects.all()

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@throttle_classes([AnonRateThrottle])
@method_decorator(cache_page(60 * 15))
def public_crimes(request):
    """Return public crime data with coordinates."""
    logger = logging.getLogger(__name__)
    try:
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5)
        offset = int(request.query_params.get('offset', 0))
        limit = int(request.query_params.get('limit', 1000))

        if not lat or not lng:
            return Response({"error": "Latitude and longitude are required"}, status=400)

        lat = float(lat)
        lng = float(lng)
        radius = float(radius)

        user_location = Point(lng, lat, srid=4326)
        crimes = Crime.objects.filter(
            location__dwithin=(user_location, D(km=radius)),
            status__in=['reported', 'solved', 'closed'],
            location__isnull=False
        )[offset:offset + limit]

        serializer = CrimeListSerializer(crimes, many=True)
        logger.info(f"Public crimes returned {len(serializer.data)} crimes (offset={offset}, limit={limit})")
        return Response({
            'results': serializer.data,
            'count': crimes.count(),
            'offset': offset,
            'limit': limit
        })
    except ValueError:
        return Response({"error": "Invalid coordinates or radius"}, status=400)
    except Exception as e:
        logger.error(f"Error in public_crimes: {e}", exc_info=True)
        return Response({"error": str(e)}, status=500)
    
def get_exported_crime_summary(request):
    file_path = os.path.join(settings.MEDIA_ROOT, 'exports', 'crime_data_export.json')
    
    try:
        if not os.path.exists(file_path):
            return JsonResponse({'error': 'Exported file not found'}, status=404)
        
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({'error': f'Failed to read file: {str(e)}'}, status=500)