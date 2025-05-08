from django.core.management.base import BaseCommand
from django.contrib.gis.db.models.functions import Centroid
from django.contrib.gis.measure import D
from django.contrib.gis.geos import Point
from django.db.models import Count, Sum, Q
from crimes.models import Crime, Neighborhood, District, CrimeCategory
import json
import os
from datetime import datetime

class Command(BaseCommand):
    help = 'Export crime data with hierarchical structure (districts -> neighborhoods -> crime summaries)'

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, default='crime_data_export.json',
                            help='Output file path for the JSON export')
        parser.add_argument('--lat', type=float, help='Latitude for filtering crimes')
        parser.add_argument('--lng', type=float, help='Longitude for filtering crimes')
        parser.add_argument('--radius', type=float, default=5.0,
                            help='Radius in kilometers for filtering crimes')
        parser.add_argument('--start_date', type=str, help='Start date (YYYY-MM-DD)')
        parser.add_argument('--end_date', type=str, help='End date (YYYY-MM-DD)')
        parser.add_argument('--crime_types', type=str, help='Comma-separated list of crime types')

    def handle(self, *args, **options):
        output_path = options['output']
        lat = options.get('lat')
        lng = options.get('lng')
        radius = options.get('radius')
        start_date = options.get('start_date')
        end_date = options.get('end_date')
        crime_types = options.get('crime_types')

        # Build filters
        filters = Q()
        if start_date:
            filters &= Q(date__gte=start_date)
        if end_date:
            filters &= Q(date__lte=end_date)
        if crime_types:
            crime_types = crime_types.split(',')
            filters &= Q(category__name__in=crime_types)

        # Apply geospatial filter if lat/lng provided
        if lat is not None and lng is not None:
            point = Point(lng, lat, srid=4326)
            filters &= Q(location__distance_lte=(point, D(km=radius)))

        # Fetch districts
        district_queryset = District.objects.all().prefetch_related('neighborhoods')

        # Prepare hierarchical data
        data = {'districts': []}

        for district in district_queryset:
            district_data = {
                'id': district.id,
                'name': district.name,
                'neighborhoods': []
            }

            # Fetch neighborhoods for this district
            neighborhoods = district.neighborhoods.annotate(
                total_crimes=Count('crimes', filter=filters),
                violent_crime_count=Count('crimes', filter=Q(crimes__is_violent=True)),
                centroid=Centroid('location')  # Using the location geometry field
            ).filter(total_crimes__gt=0)

            for neighborhood in neighborhoods:
                # Fetch crime categories for this neighborhood
                # Combine neighborhood filter with existing filters properly
                neighborhood_filter = Q(neighborhood=neighborhood) & filters
                
                category_counts = Crime.objects.filter(
                    neighborhood_filter
                ).values('category__name', 'category__color').annotate(
                    count=Count('id')
                ).order_by('-count')

                categories = [
                    {
                        'name': cat['category__name'] or 'UNKNOWN',
                        'count': cat['count'],
                        'color': cat['category__color'] or '#718096'
                    }
                    for cat in category_counts
                ]

                # Prepare neighborhood summary
                centroid = neighborhood.centroid
                centroid_data = {
                    'type': 'Point',
                    'coordinates': [centroid.x, centroid.y] if centroid else [0, 0]
                }

                neighborhood_data = {
                    'crime_summary': {
                        'neighborhood_id': neighborhood.id,
                        'neighborhood_name': neighborhood.name,
                        'district_name': district.name,
                        'total_count': neighborhood.total_crimes,
                        'violent_count': neighborhood.violent_crime_count,
                        'centroid': centroid_data,
                        'categories': categories
                    }
                }
                district_data['neighborhoods'].append(neighborhood_data)

            if district_data['neighborhoods']:  # Only include districts with neighborhoods
                data['districts'].append(district_data)

        # Save to file
        try:
            # Fix for file path handling
            directory = os.path.dirname(output_path)
            if directory:  # Only try to create directories if there's actually a directory path
                os.makedirs(directory, exist_ok=True)
                
            with open(output_path, 'w') as f:
                json.dump(data, f, indent=2)
            self.stdout.write(self.style.SUCCESS(f'Successfully exported crime data to {output_path}'))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error writing to file: {str(e)}'))