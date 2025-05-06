from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from crimes.models import Crime, CrimeCategory, District, Neighborhood
from agencies.models import Agency
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seed initial crime incidents based on statistics'

    def handle(self, *args, **options):
        categories = CrimeCategory.objects.all()
        districts = District.objects.all()
        neighborhoods = Neighborhood.objects.all()
        agency = Agency.objects.get(id=1)  # National Police

        if not categories.exists() or not districts.exists() or not neighborhoods.exists():
            self.stderr.write("Categories, districts, or neighborhoods not found. Please seed them first.")
            return

        # Sample crime data generation
        crimes_data = []
        for year in range(2017, 2021):
            for district in districts:
                for _ in range(random.randint(10, 20)):  # Random 10-20 crimes per district per year
                    category = random.choice(categories)
                    neighborhood = random.choice(neighborhoods.filter(district=district))
                    date = timezone.datetime(year, random.randint(1, 12), random.randint(1, 28)).date()
                    time = timezone.datetime(year, 1, 1, random.randint(0, 23), random.randint(0, 59)).time()
                    case_number = f"CR-{year}-{random.randint(1000, 9999)}"
                    location = Point(neighborhood.location.x + random.uniform(-0.005, 0.005),
                                   neighborhood.location.y + random.uniform(-0.005, 0.005), srid=4326)
                    is_violent = category.severity_level >= 7
                    property_loss = random.uniform(0, 5000) if not is_violent else None

                    crimes_data.append({
                        'case_number': case_number,
                        'category': category,
                        'description': f"Incident of {category.name} in {neighborhood.name}",
                        'date': date,
                        'time': time,
                        'status': random.choice(['reported', 'under_investigation', 'solved']),
                        'location': location,
                        'block_address': f"{neighborhood.name} Block {random.randint(1, 100)}",
                        'district': district,
                        'neighborhood': neighborhood,
                        'agency': agency,
                        'is_violent': is_violent,
                        'property_loss': property_loss,
                        'weapon_used': is_violent and random.choice([True, False]),
                        'weapon_type': 'Firearm' if is_violent and random.choice([True, False]) else None,
                        'drug_related': category.name == 'Dangerous Drugs' and random.choice([True, False]),
                        'domestic': random.choice([True, False]),
                        'arrests_made': random.choice([True, False]),
                        'gang_related': random.choice([True, False]),
                        'external_id': f"EXT-{random.randint(1000, 9999)}",
                        'data_source': 'National Police Records'
                    })

        created_count = 0
        for crime_data in crimes_data:
            crime, created = Crime.objects.update_or_create(
                case_number=crime_data['case_number'],
                defaults={
                    'category': crime_data['category'],
                    'description': crime_data['description'],
                    'date': crime_data['date'],
                    'time': crime_data['time'],
                    'status': crime_data['status'],
                    'location': crime_data['location'],
                    'block_address': crime_data['block_address'],
                    'district': crime_data['district'],
                    'neighborhood': crime_data['neighborhood'],
                    'agency': crime_data['agency'],
                    'is_violent': crime_data['is_violent'],
                    'property_loss': crime_data['property_loss'],
                    'weapon_used': crime_data['weapon_used'],
                    'weapon_type': crime_data['weapon_type'],
                    'drug_related': crime_data['drug_related'],
                    'domestic': crime_data['domestic'],
                    'arrests_made': crime_data['arrests_made'],
                    'gang_related': crime_data['gang_related'],
                    'external_id': crime_data['external_id'],
                    'data_source': crime_data['data_source']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created crime: {crime.case_number}")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} crimes"))