"""
Views for crimes app.
"""
import datetime
from dateutil.relativedelta import relativedelta
from django.db.models import Count, Sum, Q, F
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
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
        return CrimeListSerializer

    def get_permissions(self):
        """Apply IsAgencyUser for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAgencyUser()]
        return super().get_permissions()

    def get_queryset(self):
        """Apply additional filters to queryset."""
        user = self.request.user
        queryset = super().get_queryset()

        # Filter by user's agency for agency users
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            queryset = queryset.filter(agency=user.agency)
        elif not (user.is_authenticated and (user.is_staff or user.user_type == 'admin')):
            queryset = queryset.filter(status__in=['reported', 'solved', 'closed'])

        # Filter by distance if lat, lng, and radius provided
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius = self.request.query_params.get('radius')
        if lat and lng and radius:
            try:
                point = Point(float(lng), float(lat), srid=4326)
                queryset = queryset.annotate(
                    distance=Distance('location', point)
                ).filter(distance__lte=D(km=float(radius)))
            except (ValueError, TypeError):
                pass

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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get crime statistics for dashboard charts."""
        user = self.request.user
        agency_id = request.query_params.get('agency_id')
        time_frame = request.query_params.get('time_frame', 'last30Days')
        crime_types = request.query_params.get('crime_types', '').split(',')
        radius = request.query_params.get('radius', 5)

        end_date = datetime.date.today()
        if time_frame == 'last30Days':
            start_date = end_date - datetime.timedelta(days=30)
            previous_start_date = start_date - datetime.timedelta(days=30)
        elif time_frame == 'last90Days':
            start_date = end_date - datetime.timedelta(days=90)
            previous_start_date = start_date - datetime.timedelta(days=90)
        elif time_frame == 'thisYear':
            start_date = datetime.date(end_date.year, 1, 1)
            previous_start_date = datetime.date(end_date.year - 1, 1, 1)
        else:
            start_date = end_date - datetime.timedelta(days=30)
            previous_start_date = start_date - datetime.timedelta(days=30)

        area_filter = Q()
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if lat and lng:
            try:
                point = Point(float(lng), float(lat), srid=4326)
                area_filter = Q(location__dwithin=(point, D(km=float(radius))))
            except (ValueError, TypeError):
                pass

        type_filter = Q()
        if crime_types and crime_types[0]:
            type_filter = Q(category__name__in=crime_types)

        # Apply agency filter
        agency_filter = Q()
        if agency_id:
            try:
                agency_filter = Q(agency_id=int(agency_id))
            except ValueError:
                return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
        elif user.is_authenticated and user.user_type == 'agency' and user.agency:
            agency_filter = Q(agency=user.agency)

        current_crimes = Crime.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).filter(area_filter).filter(type_filter).filter(agency_filter)

        previous_crimes = Crime.objects.filter(
            date__gte=previous_start_date,
            date__lt=start_date
        ).filter(area_filter).filter(type_filter).filter(agency_filter)

        # Crime type distribution for Pie chart
        crime_type_counts = current_crimes.values('category__name').annotate(
            count=Count('id')
        ).order_by('-count')

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
            'crime_types': [
                {'name': item['category__name'], 'count': item['count']}
                for item in crime_type_counts
            ]
        }

        serializer = CrimeStatResponseSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get crime trends over time for Line chart."""
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
            except (ValueError, TypeError):
                pass

        # Apply agency filter
        agency_filter = Q()
        if agency_id:
            try:
                agency_filter = Q(agency_id=int(agency_id))
            except ValueError:
                return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
        elif user.is_authenticated and user.user_type == 'agency' and user.agency:
            agency_filter = Q(agency=user.agency)

        queryset = Crime.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        ).filter(area_filter).filter(agency_filter)

        # Group by month
        trends = []
        current_date = start_date.replace(day=1)
        labels = []
        while current_date <= end_date:
            next_month = current_date + relativedelta(months=1)
            month_crimes = queryset.filter(date__gte=current_date, date__lt=next_month)
            
            trends.append({
                'date': current_date.strftime('%Y-%m'),
                'total': month_crimes.count(),
                'violent': month_crimes.filter(is_violent=True).count(),
                'property': month_crimes.filter(property_loss__isnull=False).count(),
                'arrests': month_crimes.filter(arrests_made=True).count()
            })
            labels.append(current_date.strftime('%b'))
            current_date = next_month

        # Format for Chart.js
        chart_data = {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Monthly Crime Count',
                    'data': [trend['total'] for trend in trends],
                    'fill': False,
                    'backgroundColor': 'rgba(75, 192, 192, 0.6)',
                    'borderColor': 'rgba(75, 192, 192, 1)',
                    'tension': 0.1
                }
            ]
        }

        return Response(chart_data)

    @action(detail=False, methods=['get'])
    def heatmap(self, request):
        """Get data for a crime heatmap."""
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

        # Apply agency filter
        agency_filter = Q()
        if agency_id:
            try:
                agency_filter = Q(agency_id=int(agency_id))
            except ValueError:
                return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
        elif user.is_authenticated and user.user_type == 'agency' and user.agency:
            agency_filter = Q(agency=user.agency)

        crimes = Crime.objects.filter(
            date__gte=start_date,
            date__lte=end_date,
            location__isnull=False
        ).filter(crime_type_filter).filter(agency_filter)

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
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def search(self, request):
        """Advanced search for crimes."""
        user = self.request.user
        agency_id = request.query_params.get('agency_id')
        serializer = CrimeSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        point = Point(
            serializer.validated_data['longitude'],
            serializer.validated_data['latitude'],
            srid=4326
        )
        
        # Apply agency filter
        agency_filter = Q()
        if agency_id:
            try:
                agency_filter = Q(agency_id=int(agency_id))
            except ValueError:
                return Response({'error': 'Invalid agency_id'}, status=status.HTTP_400_BAD_REQUEST)
        elif user.is_authenticated and user.user_type == 'agency' and user.agency:
            agency_filter = Q(agency=user.agency)

        queryset = Crime.objects.annotate(
            distance=Distance('location', point)
        ).filter(
            distance__lte=D(km=serializer.validated_data['radius']),
            location__isnull=False
        ).filter(agency_filter)

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
        
        queryset = queryset.order_by('distance')
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CrimeListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = CrimeListSerializer(queryset, many=True)
        return Response(serializer.data)

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
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')
    radius = request.query_params.get('radius', 5)
    
    if not lat or not lng:
        return Response({"error": "Latitude and longitude are required"}, status=400)
    
    try:
        lat = float(lat)
        lng = float(lng)
        radius = float(radius)
        
        user_location = Point(lng, lat, srid=4326)
        crimes = Crime.objects.filter(
            location__distance_lte=(user_location, D(km=radius)),
            status__in=['reported', 'solved', 'closed'],
            location__isnull=False
        ).order_by('id')[:100]
        
        serializer = PublicCrimeSerializer(crimes, many=True)
        return Response(serializer.data)
        
    except ValueError:
        return Response({"error": "Invalid coordinates or radius"}, status=400)
    except Exception as e:
        return Response({"error": str(e)}, status=500)