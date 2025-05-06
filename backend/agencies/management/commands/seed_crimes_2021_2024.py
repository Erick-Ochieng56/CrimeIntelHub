from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from crimes.models import Crime, CrimeCategory, District, Neighborhood
from agencies.models import Agency
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seed crime incidents for 2021 to 2024 based on 2017-2020 statistics'

    def add_arguments(self, parser):
        parser.add_argument('--agency_id', type=int, default=1, help='ID of the Agency to assign to all crimes')
        parser.add_argument('--batch_size', type=int, default=1000, help='Number of crimes to create per batch')

    def handle(self, *args, **options):
        agency_id = options['agency_id']
        batch_size = options['batch_size']

        # Verify agency exists
        try:
            agency = Agency.objects.get(id=agency_id)
        except Agency.DoesNotExist:
            self.stderr.write(f"Agency with ID {agency_id} does not exist.")
            return

        # Get categories, districts, and neighborhoods
        categories = CrimeCategory.objects.all()
        districts = District.objects.all()
        neighborhoods = Neighborhood.objects.all()

        if not categories.exists() or not districts.exists() or not neighborhoods.exists():
            self.stderr.write("Categories, districts, or neighborhoods not found. Please seed them first.")
            return

        # Projected total crimes per year
        yearly_totals = {
            2021: 85000,
            2022: 89250,
            2023: 93713,
            2024: 98399
        }

        # Category distribution based on 2019 data
        category_weights = {
            'Homicide': 0.032,
            'Offenses': 0.086,
            'Robbery': 0.291,
            'Other Offenses': 0.031,
            'Breakings': 0.064,
            'Theft of Stolen Goods': 0.021,
            'Stealing': 0.149,
            'Theft by Servant': 0.024,
            'Theft of Vehicles': 0.014,
            'Dangerous Drugs': 0.086,
            'Traffic Offenses': 0.004,
            'Economic Crimes': 0.052,
            'Criminal Damage': 0.051,
            'Corruption': 0.0008,
            'Other Penal Code Offenses': 0.093
        }

        created_count = 0
        for year, total_crimes in yearly_totals.items():
            # Distribute crimes across districts (10-20 crimes per district)
            crimes_per_district = total_crimes // len(districts) // 15  # Average ~15 crimes per district
            crimes_data = []

            for district in districts:
                for _ in range(random.randint(10, 20)):
                    # Select a random neighborhood in the district
                    district_neighborhoods = neighborhoods.filter(district=district)
                    if not district_neighborhoods.exists():
                        self.stdout.write(f"No neighborhoods found for district {district.name}. Skipping.")
                        continue
                    neighborhood = random.choice(district_neighborhoods)

                    # Select category based on weights
                    try:
                        category_name = random.choices(
                            list(category_weights.keys()),
                            weights=list(category_weights.values()),
                            k=1
                        )[0]
                        category = categories.get(name=category_name)
                    except CrimeCategory.DoesNotExist:
                        self.stderr.write(f"Category '{category_name}' not found. Skipping.")
                        continue

                    # Generate unique case number
                    while True:
                        case_number = f"CR-{year}-{random.randint(1000, 9999)}"
                        if not Crime.objects.filter(case_number=case_number).exists():
                            break

                    # Generate crime details
                    date = timezone.datetime(year, random.randint(1, 12), random.randint(1, 28)).date()
                    time = timezone.datetime(year, 1, 1, random.randint(0, 23), random.randint(0, 59)).time()
                    location = Point(
                        neighborhood.location.x + random.uniform(-0.005, 0.005),
                        neighborhood.location.y + random.uniform(-0.005, 0.005),
                        srid=4326
                    )
                    is_violent = category.severity_level >= 7
                    property_loss = random.uniform(0, 5000) if not is_violent else None

                    crimes_data.append(Crime(
                        case_number=case_number,
                        category=category,
                        description=f"Incident of {category.name} in {neighborhood.name}",
                        date=date,
                        time=time,
                        status=random.choice(['reported', 'under_investigation', 'solved']),
                        location=location,
                        block_address=f"{neighborhood.name} Block {random.randint(1, 100)}",
                        district=district,
                        neighborhood=neighborhood,
                        agency=agency,
                        is_violent=is_violent,
                        property_loss=property_loss,
                        weapon_used=is_violent and random.choice([True, False]),
                        weapon_type='Firearm' if is_violent and random.choice([True, False]) else None,
                        drug_related=category.name == 'Dangerous Drugs' and random.choice([True, False]),
                        domestic=random.choice([True, False]),
                        arrests_made=random.choice([True, False]),
                        gang_related=random.choice([True, False]),
                        external_id=f"EXT-{random.randint(1000, 9999)}",
                        data_source='National Police Records'
                    ))

            # Bulk create crimes in batches
            try:
                for i in range(0, len(crimes_data), batch_size):
                    batch = crimes_data[i:i + batch_size]
                    Crime.objects.bulk_create(batch, ignore_conflicts=True)
                    created_count += len(batch)
                    self.stdout.write(f"Created {len(batch)} crimes for {year} (batch {i // batch_size + 1})")
            except Exception as e:
                self.stderr.write(f"Error creating crimes for {year}: {str(e)}")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} crimes for 2021-2024"))