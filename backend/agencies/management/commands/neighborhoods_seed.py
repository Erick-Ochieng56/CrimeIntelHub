from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from crimes.models import Neighborhood, District

class Command(BaseCommand):
    help = 'Seed initial neighborhoods for districts'

    def handle(self, *args, **options):
        districts = District.objects.all()
        if not districts.exists():
            self.stderr.write("No districts found. Please load district data first.")
            return

        neighborhoods_data = []
        for district in districts:
            # Add 2-3 neighborhoods per district with slight coordinate offsets
            base_lat = district.location.y
            base_lon = district.location.x
            neighborhoods_data.extend([
                {
                    'name': f"{district.name} Central",
                    'location': Point(base_lon + 0.01, base_lat + 0.01, srid=4326),
                    'district': district,
                    'population': 5000,
                    'description': f"Central area of {district.name}"
                },
                {
                    'name': f"{district.name} East",
                    'location': Point(base_lon + 0.02, base_lat - 0.01, srid=4326),
                    'district': district,
                    'population': 3000,
                    'description': f"Eastern part of {district.name}"
                },
                {
                    'name': f"{district.name} West",
                    'location': Point(base_lon - 0.01, base_lat + 0.02, srid=4326),
                    'district': district,
                    'population': 4000,
                    'description': f"Western part of {district.name}"
                }
            ])

        created_count = 0
        for neighborhood_data in neighborhoods_data:
            neighborhood, created = Neighborhood.objects.update_or_create(
                name=neighborhood_data['name'],
                district=neighborhood_data['district'],
                defaults={
                    'location': neighborhood_data['location'],
                    'population': neighborhood_data['population'],
                    'description': neighborhood_data['description']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created neighborhood: {neighborhood.name} in {neighborhood.district.name}")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} neighborhoods"))