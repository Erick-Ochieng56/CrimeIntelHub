import datetime
import logging
from django.http import JsonResponse, FileResponse
from django.conf import settings
import os
import json
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db.models import Count, Sum, Q, F, Min, Max
from django.db.models.functions import TruncMonth
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
    CrimeStatResponseSerializer, PublicCrimeSerializer, NeighborhoodCrimeSummarySerializer,
    CrimeLightSerializer,
)
from accounts.permissions import IsAgencyUser

class CrimeFilter(django_filters.FilterSet):
    """Filter for Crime model."""
    category = django_filters.CharFilter(field_name='category__name', lookup_expr='icontains')
    date_from = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    
    class Meta:
        model = Crime
        fields = ['category', 'date_from', 'date_to', 'status', 'is_violent']

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
        return self._filtered_crimes(apply_bbox=True)

    def _filtered_crimes(self, apply_bbox=True):
        """Shared crime filters. Set apply_bbox=False for national overview loads."""
        user = self.request.user
        logger = logging.getLogger(__name__)
        queryset = Crime.objects.all()

        # Filter by user's agency for agency users
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            queryset = queryset.filter(agency=user.agency)
        elif not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
            queryset = queryset.filter(status__in=['reported', 'solved', 'closed'])

        # Ensure location is not null
        queryset = queryset.filter(location__isnull=False)

        if apply_bbox:
            # Geospatial filter - support both bounding box and radius-based filtering
            north_east_lat = self.request.query_params.get('northEastLat')
            north_east_lng = self.request.query_params.get('northEastLng')
            south_west_lat = self.request.query_params.get('southWestLat')
            south_west_lng = self.request.query_params.get('southWestLng')

            if north_east_lat and north_east_lng and south_west_lat and south_west_lng:
                try:
                    from django.contrib.gis.geos import Polygon
                    bbox_coords = [
                        (float(south_west_lng), float(south_west_lat)),
                        (float(north_east_lng), float(south_west_lat)),
                        (float(north_east_lng), float(north_east_lat)),
                        (float(south_west_lng), float(north_east_lat)),
                        (float(south_west_lng), float(south_west_lat)),
                    ]
                    bbox_polygon = Polygon(bbox_coords, srid=4326)
                    queryset = queryset.filter(location__within=bbox_polygon)
                except (ValueError, TypeError) as e:
                    logger.error(f"Bounding box filter error: {e}")
            else:
                lat = self.request.query_params.get('lat')
                lng = self.request.query_params.get('lng')
                radius = self.request.query_params.get('radius')
                if lat and lng and radius:
                    try:
                        point = Point(float(lng), float(lat), srid=4326)
                        queryset = queryset.filter(location__dwithin=(point, D(km=float(radius))))
                    except (ValueError, TypeError) as e:
                        logger.error(f"Geospatial filter error: {e}")

        # Apply additional filters
        crime_types = self.request.query_params.get('crimeTypes', '').split(',')
        if crime_types and crime_types[0]:
            queryset = queryset.filter(category__name__in=crime_types)

        start_date = self.request.query_params.get('startDate') or self.request.query_params.get('date_from')
        if start_date:
            try:
                queryset = queryset.filter(date__gte=start_date)
            except ValueError as e:
                logger.error(f"Start date filter error: {e}")

        end_date = self.request.query_params.get('endDate') or self.request.query_params.get('date_to')
        if end_date:
            try:
                queryset = queryset.filter(date__lte=end_date)
            except ValueError as e:
                logger.error(f"End date filter error: {e}")

        return queryset.select_related('category', 'district', 'neighborhood', 'agency')

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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get crime statistics for dashboard charts."""
        logger = logging.getLogger(__name__)
        try:
            cache_key = (
                f"crime_stats_v2_{request.user.id if request.user.is_authenticated else 'anon'}_"
                f"{request.query_params.get('agency_id')}_"
                f"{request.query_params.get('time_frame', 'last30Days')}"
            )
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info("Using cached stats data.")
                return Response(cached_data)

            user = self.request.user
            agency_id = request.query_params.get('agency_id')
            time_frame = request.query_params.get('time_frame', 'last30Days')
            crime_types = (
                request.query_params.get('crime_types')
                or request.query_params.get('crimeTypes')
                or ''
            ).split(',')
            radius = request.query_params.get('radius')

            logger.info(
                f"Stats request parameters: agency_id={agency_id}, "
                f"time_frame={time_frame}, crime_types={crime_types}, radius={radius}"
            )

            # Seeded/historical datasets may end before "today" — anchor relative windows
            # to the latest crime date so Last Month / All Time behave usefully.
            today = datetime.date.today()
            latest_crime = Crime.objects.aggregate(mx=Max('date'))['mx'] or today
            end_date = latest_crime if latest_crime < today - datetime.timedelta(days=14) else today

            previous_start_date = previous_end_date = None
            start_date = None  # None = all time (no lower bound)

            if time_frame in ('last24Hours', 'last24hours'):
                start_date = end_date - datetime.timedelta(days=1)
                previous_end_date = start_date - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=1)
            elif time_frame in ('last7Days', 'lastWeek', 'lastweek'):
                start_date = end_date - datetime.timedelta(days=7)
                previous_end_date = start_date - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=7)
            elif time_frame in ('last30Days', 'lastMonth', 'lastmonth'):
                start_date = end_date - datetime.timedelta(days=30)
                previous_end_date = start_date - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=30)
            elif time_frame in ('last90Days', 'last90days'):
                start_date = end_date - datetime.timedelta(days=90)
                previous_end_date = start_date - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=90)
            elif time_frame in ('thisYear', 'lastYear', 'lastyear'):
                # Last 365 days ending at data as-of date (covers multi-year seeds)
                start_date = end_date - datetime.timedelta(days=365)
                previous_end_date = start_date - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=365)
            elif time_frame in ('allTime', 'all_time', 'all'):
                start_date = None
                earliest = Crime.objects.aggregate(mn=Min('date'))['mn'] or end_date
                span_days = max((end_date - earliest).days, 1)
                previous_end_date = earliest - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=span_days)
            else:
                start_date = end_date - datetime.timedelta(days=30)
                previous_end_date = start_date - datetime.timedelta(days=1)
                previous_start_date = previous_end_date - datetime.timedelta(days=30)

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
                # Include under_investigation — seed data uses it heavily
                status_filter = Q(status__in=['reported', 'under_investigation', 'solved', 'closed'])

            base_query = Crime.objects.filter(location__isnull=False)
            current_qs = base_query.filter(date__lte=end_date)
            if start_date is not None:
                current_qs = current_qs.filter(date__gte=start_date)
            current_crimes = current_qs.filter(area_filter).filter(type_filter).filter(agency_filter).filter(status_filter)

            previous_crimes = base_query.none()
            if previous_start_date and previous_end_date and time_frame not in ('allTime', 'all_time', 'all'):
                previous_crimes = base_query.filter(
                    date__gte=previous_start_date,
                    date__lte=previous_end_date,
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
                'as_of': end_date.isoformat(),
                'time_frame': time_frame,
                'start_date': start_date.isoformat() if start_date else None,
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

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get crime trends over time for Line chart."""
        logger = logging.getLogger(__name__)
        try:
            user = self.request.user
            time_frame = request.query_params.get('time_frame')
            months = int(request.query_params.get('months', 6))
            agency_id = request.query_params.get('agency_id')

            today = datetime.date.today()
            latest_crime = Crime.objects.aggregate(mx=Max('date'))['mx'] or today
            end_date = latest_crime if latest_crime < today - datetime.timedelta(days=14) else today

            if time_frame in ('allTime', 'all_time', 'all'):
                earliest = Crime.objects.aggregate(mn=Min('date'))['mn'] or end_date
                start_date = earliest.replace(day=1)
            elif time_frame in ('last24Hours', 'last24hours'):
                start_date = end_date - datetime.timedelta(days=1)
            elif time_frame in ('last7Days', 'lastWeek', 'lastweek'):
                start_date = end_date - datetime.timedelta(days=7)
            elif time_frame in ('last30Days', 'lastMonth', 'lastmonth'):
                start_date = end_date - datetime.timedelta(days=30)
            elif time_frame in ('thisYear', 'lastYear', 'lastyear'):
                start_date = end_date - datetime.timedelta(days=365)
            else:
                start_date = end_date - relativedelta(months=months)

            cache_key = (
                f"crime_trends_v2_{request.user.id if request.user.is_authenticated else 'anon'}_"
                f"{time_frame or months}_{agency_id}_"
                f"{request.query_params.get('lat')}_{request.query_params.get('radius')}"
            )
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info("Using cached trends data.")
                return Response(cached_data)

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
                status_filter = Q(status__in=['reported', 'under_investigation', 'solved', 'closed'])

            type_filter = Q()
            crime_types = request.query_params.get('crime_types', '').split(',')
            if crime_types and crime_types[0]:
                type_filter = Q(category__name__in=crime_types)

            queryset = Crime.objects.filter(
                date__gte=start_date,
                date__lte=end_date,
                location__isnull=False
            ).filter(area_filter).filter(agency_filter).filter(status_filter).filter(type_filter)

            # Single grouped query instead of N monthly count loops (allTime ≈ 80+ months)
            monthly = (
                queryset
                .annotate(month=TruncMonth('date'))
                .values('month')
                .annotate(
                    total=Count('id'),
                    violent=Count('id', filter=Q(is_violent=True)),
                    property=Count('id', filter=Q(property_loss__isnull=False)),
                    arrests=Count('id', filter=Q(arrests_made=True)),
                )
                .order_by('month')
            )

            by_month = {
                row['month'].date() if hasattr(row['month'], 'date') else row['month']: row
                for row in monthly
                if row['month'] is not None
            }

            trends = []
            labels = []
            total_crimes = []
            violent_crimes = []
            property_crimes = []
            arrests_data = []

            current_date = start_date.replace(day=1)
            while current_date <= end_date:
                row = by_month.get(current_date) or {}
                month_count = row.get('total', 0) or 0
                violent_count = row.get('violent', 0) or 0
                property_count = row.get('property', 0) or 0
                arrests_count = row.get('arrests', 0) or 0

                trends.append({
                    'date': current_date.strftime('%Y-%m'),
                    'total': month_count,
                    'violent': violent_count,
                    'property': property_count,
                    'arrests': arrests_count,
                })
                labels.append(current_date.strftime('%b %Y'))
                total_crimes.append(month_count)
                violent_crimes.append(violent_count)
                property_crimes.append(property_count)
                arrests_data.append(arrests_count)
                current_date = (current_date + relativedelta(months=1)).replace(day=1)

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
        """Get lightweight crime data for map visualization (viewport-friendly)."""
        logger = logging.getLogger(__name__)
        try:
            offset = int(request.query_params.get('offset', 0))
            limit = min(int(request.query_params.get('limit', 1000)), 5000)

            # Optional date filters only — do not force last-30-days for map viewport loads
            start_date = (
                request.query_params.get('start_date')
                or request.query_params.get('startDate')
                or request.query_params.get('date_from')
            )
            end_date = (
                request.query_params.get('end_date')
                or request.query_params.get('endDate')
                or request.query_params.get('date_to')
            )
            neighborhood_id = request.query_params.get('neighborhood_id')

            # get_queryset already applies agency/status + bbox/radius + crime type filters
            queryset = self.get_queryset().filter(location__isnull=False)
            if neighborhood_id:
                try:
                    queryset = queryset.filter(neighborhood__id=int(neighborhood_id))
                except ValueError:
                    logger.error(f"Invalid neighborhood_id: {neighborhood_id}")
                    return Response(
                        {'error': 'Invalid neighborhood_id'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)

            # Prefer recent crimes when capping a dense viewport
            queryset = queryset.order_by('-date', '-time')
            total = queryset.count()
            page = queryset.select_related('category')[offset:offset + limit]
            serializer = CrimeLightSerializer(page, many=True)
            logger.info(
                f"Map data returned {len(serializer.data)} crimes "
                f"(offset={offset}, limit={limit}, total={total})"
            )
            return Response({
                'results': serializer.data,
                'count': total,
                'offset': offset,
                'limit': limit,
            })
        except Exception as e:
            logger.error(f"Error in map_data action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def viewport(self, request):
        """
        Zoom-aware map payload (Google Maps–style).
        - zoom < 8: national district aggregates (full dataset, no bbox clip)
        - zoom 8–11: grid clusters (bbox, or national when zoom < 9)
        - zoom >= 12: individual crime points in viewport
        """
        logger = logging.getLogger(__name__)
        try:
            zoom = int(float(request.query_params.get('zoom', 12)))
            if zoom < 8:
                mode = 'districts'
            elif zoom < 12:
                mode = 'clusters'
            else:
                mode = 'points'

            start_date = (
                request.query_params.get('start_date')
                or request.query_params.get('startDate')
                or request.query_params.get('date_from')
            )
            end_date = (
                request.query_params.get('end_date')
                or request.query_params.get('endDate')
                or request.query_params.get('date_to')
            )

            # Country / far-out view: load ALL matching crimes (ignore map bbox)
            national = (
                mode == 'districts'
                or zoom < 9
                or request.query_params.get('national', '').lower() in ('1', 'true', 'yes')
            )
            queryset = self._filtered_crimes(apply_bbox=not national).filter(location__isnull=False)
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            if end_date:
                queryset = queryset.filter(date__lte=end_date)

            total = queryset.count()

            if mode == 'districts':
                rows = (
                    queryset.values('district_id', 'district__name')
                    .annotate(
                        count=Count('id'),
                        violent_count=Count('id', filter=Q(is_violent=True)),
                    )
                    .order_by('-count')
                )
                features = []
                for row in rows:
                    lat = lng = None
                    name = row['district__name'] or 'Unknown'
                    district_id = row['district_id']

                    if district_id:
                        district = District.objects.filter(pk=district_id).first()
                        if district and district.location:
                            lat, lng = district.location.y, district.location.x
                        else:
                            sample = list(
                                queryset.filter(district_id=district_id)
                                .values_list('location', flat=True)[:80]
                            )
                            if sample:
                                lat = sum(p.y for p in sample) / len(sample)
                                lng = sum(p.x for p in sample) / len(sample)
                    else:
                        name = 'Unassigned'
                        sample = list(
                            queryset.filter(district__isnull=True)
                            .values_list('location', flat=True)[:80]
                        )
                        if sample:
                            lat = sum(p.y for p in sample) / len(sample)
                            lng = sum(p.x for p in sample) / len(sample)

                    if lat is None or lng is None:
                        continue
                    features.append({
                        'id': district_id or 'unassigned',
                        'name': name,
                        'lat': lat,
                        'lng': lng,
                        'count': row['count'],
                        'violent_count': row['violent_count'],
                        'type': 'district',
                    })
                return Response({
                    'mode': mode,
                    'zoom': zoom,
                    'national': True,
                    'count': total,
                    'results': features,
                })

            if mode == 'clusters':
                if zoom < 9:
                    grid = 0.5
                elif zoom < 11:
                    grid = 0.2
                else:
                    grid = 0.08

                # Include every crime in scope (national or bbox) — no artificial scan cap
                locs = queryset.values_list('location', 'is_violent')
                buckets = {}
                for loc, is_violent in locs.iterator(chunk_size=2000):
                    if not loc:
                        continue
                    cell_lat = round(loc.y / grid) * grid
                    cell_lng = round(loc.x / grid) * grid
                    key = (cell_lat, cell_lng)
                    if key not in buckets:
                        buckets[key] = {'count': 0, 'violent_count': 0}
                    buckets[key]['count'] += 1
                    if is_violent:
                        buckets[key]['violent_count'] += 1

                features = [
                    {
                        'id': f'{lat:.4f},{lng:.4f}',
                        'lat': lat,
                        'lng': lng,
                        'count': data['count'],
                        'violent_count': data['violent_count'],
                        'type': 'cluster',
                        'grid': grid,
                    }
                    for (lat, lng), data in buckets.items()
                ]
                features.sort(key=lambda x: x['count'], reverse=True)
                return Response({
                    'mode': mode,
                    'zoom': zoom,
                    'national': national,
                    'count': total,
                    'results': features,
                })

            # points — viewport only (keep map responsive)
            limit = min(int(request.query_params.get('limit', 2500)), 5000)
            page = queryset.select_related('category').order_by('-date', '-time')[:limit]
            serializer = CrimeLightSerializer(page, many=True)
            return Response({
                'mode': mode,
                'zoom': zoom,
                'national': False,
                'count': total,
                'limit': limit,
                'truncated': len(serializer.data) < total,
                'results': serializer.data,
            })
        except Exception as e:
            logger.error(f"Error in viewport action: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def download_summary(self, request):
        """Get crime summary data for download/visualization."""
        logger = logging.getLogger(__name__)
        try:
            hierarchical = request.query_params.get('hierarchical', 'false').lower() == 'true'
            lat = request.query_params.get('lat')
            lng = request.query_params.get('lng')
            radius = request.query_params.get('radius', 5)

            end_date = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=30)

            start_date_param = request.query_params.get('start_date')
            end_date_param = request.query_params.get('end_date')
            if start_date_param:
                try:
                    start_date = datetime.datetime.fromisoformat(start_date_param).date()
                except ValueError:
                    return Response(
                        {'error': 'Invalid start_date format'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if end_date_param:
                try:
                    end_date = datetime.datetime.fromisoformat(end_date_param).date()
                except ValueError:
                    return Response(
                        {'error': 'Invalid end_date format'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            queryset = self.get_queryset().filter(
                date__gte=start_date,
                date__lte=end_date,
            )

            if lat and lng and radius:
                try:
                    center = Point(float(lng), float(lat), srid=4326)
                    queryset = queryset.filter(
                        location__dwithin=(center, D(km=float(radius)))
                    )
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid coordinates or radius'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if hierarchical:
                districts_data = []
                for district in District.objects.all():
                    district_crimes = queryset.filter(district=district)
                    if not district_crimes.exists():
                        continue

                    neighborhoods_data = []
                    for neighborhood in district.neighborhoods.all():
                        neighborhood_crimes = district_crimes.filter(
                            neighborhood=neighborhood
                        )
                        if not neighborhood_crimes.exists():
                            continue

                        crime_stats = neighborhood_crimes.aggregate(
                            total_count=Count('id'),
                            violent_count=Count('id', filter=Q(is_violent=True)),
                            property_damage=Sum('property_loss'),
                        )
                        categories = list(
                            neighborhood_crimes.values(name=F('category__name'))
                            .annotate(count=Count('id'))
                            .order_by('-count')
                            .values('name', 'count')[:10]
                        )
                        neighborhoods_data.append({
                            'neighborhood_id': neighborhood.id,
                            'neighborhood_name': neighborhood.name,
                            'crime_summary': {
                                'total_count': crime_stats['total_count'] or 0,
                                'violent_count': crime_stats['violent_count'] or 0,
                                'property_damage': float(
                                    crime_stats['property_damage'] or 0
                                ),
                                'centroid': {
                                    'latitude': (
                                        neighborhood.location.y
                                        if neighborhood.location else None
                                    ),
                                    'longitude': (
                                        neighborhood.location.x
                                        if neighborhood.location else None
                                    ),
                                },
                                'categories': categories,
                            },
                        })

                    district_stats = district_crimes.aggregate(
                        total_count=Count('id'),
                        violent_count=Count('id', filter=Q(is_violent=True)),
                        property_damage=Sum('property_loss'),
                    )
                    districts_data.append({
                        'district_id': district.id,
                        'district_name': district.name,
                        'total_crimes': district_stats['total_count'] or 0,
                        'neighborhoods': neighborhoods_data,
                    })

                return Response({
                    'districts': districts_data,
                    'date_range': {
                        'start_date': start_date.isoformat(),
                        'end_date': end_date.isoformat(),
                    },
                    'hierarchical': True,
                })

            crime_stats = queryset.aggregate(
                total_count=Count('id'),
                violent_count=Count('id', filter=Q(is_violent=True)),
                property_damage=Sum('property_loss'),
            )
            categories = list(
                queryset.values(name=F('category__name'))
                .annotate(count=Count('id'))
                .order_by('-count')
                .values('name', 'count')
            )
            return Response({
                'total_crimes': crime_stats['total_count'] or 0,
                'violent_crimes': crime_stats['violent_count'] or 0,
                'property_damage': float(crime_stats['property_damage'] or 0),
                'categories': categories,
                'date_range': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                },
                'hierarchical': False,
            })
        except Exception as e:
            logger.error(f"Error in download_summary: {e}", exc_info=True)
            return Response({
                'error': 'An unexpected error occurred',
                'detail': str(e) if settings.DEBUG else 'See server logs for details',
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