from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.utils import timezone
from crimes.models import Crime, CrimeCategory, CrimeMedia, CrimeNote, CrimeStatistic, District, Neighborhood
from agencies.models import Agency
import random
from datetime import datetime, timedelta
import secrets

class Command(BaseCommand):
    help = 'Seed all crime-related data (agency, districts, neighborhoods, categories, crimes, media, notes, statistics)'

    def add_arguments(self, parser):
        parser.add_argument('--agency_id', type=int, default=1, help='ID of the Agency to assign to all data')
        parser.add_argument('--batch_size', type=int, default=1000, help='Number of crimes to create per batch')

    def handle(self, *args, **options):
        agency_id = options['agency_id']
        batch_size = options['batch_size']

        # Step 1: Ensure Agency exists
        try:
            agency = Agency.objects.get(id=agency_id)
        except Agency.DoesNotExist:
            agency = Agency.objects.create(id=agency_id, name='National Police')
            self.stdout.write(f"Created Agency: National Police (ID={agency_id})")

        # Step 2: Seed Crime Categories
        categories_data = [
            {'name': 'Homicide', 'description': 'Murder or manslaughter cases', 'severity_level': 10, 'color': '#FF0000', 'icon': 'fa-skull'},
            {'name': 'Offenses', 'description': 'General violent offenses (e.g., assault)', 'severity_level': 8, 'color': '#FF4500', 'icon': 'fa-fist-raised'},
            {'name': 'Robbery', 'description': 'Theft with force or threat', 'severity_level': 7, 'color': '#FFA500', 'icon': 'fa-mask'},
            {'name': 'Other Offenses', 'description': 'Miscellaneous violent crimes', 'severity_level': 6, 'color': '#FFD700', 'icon': 'fa-exclamation-triangle'},
            {'name': 'Breakings', 'description': 'Breaking and entering incidents', 'severity_level': 5, 'color': '#ADFF2F', 'icon': 'fa-door-open'},
            {'name': 'Theft of Stolen Goods', 'description': 'Theft involving stolen property', 'severity_level': 4, 'color': '#9ACD32', 'icon': 'fa-box'},
            {'name': 'Stealing', 'description': 'General theft without violence', 'severity_level': 3, 'color': '#98FB98', 'icon': 'fa-hand-holding'},
            {'name': 'Theft by Servant', 'description': 'Theft by an employee', 'severity_level': 3, 'color': '#90EE90', 'icon': 'fa-user-tie'},
            {'name': 'Theft of Vehicles', 'description': 'Vehicle theft cases', 'severity_level': 4, 'color': '#00FF7F', 'icon': 'fa-car'},
            {'name': 'Dangerous Drugs', 'description': 'Drug-related offenses', 'severity_level': 6, 'color': '#20B2AA', 'icon': 'fa-pills'},
            {'name': 'Traffic Offenses', 'description': 'Traffic-related crimes', 'severity_level': 2, 'color': '#87CEEB', 'icon': 'fa-car-side'},
            {'name': 'Economic Crimes', 'description': 'Financial or economic offenses', 'severity_level': 5, 'color': '#ADD8E6', 'icon': 'fa-money-bill'},
            {'name': 'Criminal Damage', 'description': 'Damage to property', 'severity_level': 4, 'color': '#B0C4DE', 'icon': 'fa-burn'},
            {'name': 'Corruption', 'description': 'Corruption and bribery cases', 'severity_level': 7, 'color': '#DDA0DD', 'icon': 'fa-handshake'},
            {'name': 'Other Penal Code Offenses', 'description': 'Miscellaneous offenses under penal code', 'severity_level': 3, 'color': '#D8BFD8', 'icon': 'fa-balance-scale'},
        ]
        created_count = 0
        for category_data in categories_data:
            category, created = CrimeCategory.objects.update_or_create(
                name=category_data['name'],
                defaults=category_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created category: {category.name}")
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} crime categories"))

        # Step 3: Seed Districts (Kenyan Counties)
        county_data = [
            {"code": "001", "name": "Mombasa", "latitude": -4.0435, "longitude": 39.6682},
            {"code": "002", "name": "Kwale", "latitude": -4.1833, "longitude": 39.4500},
            {"code": "003", "name": "Kilifi", "latitude": -3.5100, "longitude": 39.9100},
            {"code": "004", "name": "Tana River", "latitude": -1.8333, "longitude": 40.1667},
            {"code": "005", "name": "Lamu", "latitude": -2.2717, "longitude": 40.9020},
            {"code": "006", "name": "Taita-Taveta", "latitude": -3.3167, "longitude": 38.4833},
            {"code": "007", "name": "Garissa", "latitude": -0.4531, "longitude": 39.6460},
            {"code": "008", "name": "Wajir", "latitude": 1.7500, "longitude": 40.0500},
            {"code": "009", "name": "Mandera", "latitude": 3.9373, "longitude": 41.8569},
            {"code": "010", "name": "Marsabit", "latitude": 2.3333, "longitude": 37.9833},
            {"code": "011", "name": "Isiolo", "latitude": 0.3500, "longitude": 38.6833},
            {"code": "012", "name": "Meru", "latitude": 0.0471, "longitude": 37.6490},
            {"code": "013", "name": "Tharaka-Nithi", "latitude": -0.3333, "longitude": 37.9500},
            {"code": "014", "name": "Embu", "latitude": -0.5333, "longitude": 37.4500},
            {"code": "015", "name": "Kitui", "latitude": -1.3667, "longitude": 38.0167},
            {"code": "016", "name": "Machakos", "latitude": -1.5167, "longitude": 37.2667},
            {"code": "017", "name": "Makueni", "latitude": -1.8000, "longitude": 37.6167},
            {"code": "018", "name": "Nyandarua", "latitude": -0.1833, "longitude": 36.3500},
            {"code": "019", "name": "Nyeri", "latitude": -0.4167, "longitude": 36.9500},
            {"code": "020", "name": "Kirinyaga", "latitude": -0.6000, "longitude": 37.3333},
            {"code": "021", "name": "Murang'a", "latitude": -0.7167, "longitude": 37.1500},
            {"code": "022", "name": "Kiambu", "latitude": -1.0333, "longitude": 36.6500},
            {"code": "023", "name": "Turkana", "latitude": 3.7500, "longitude": 35.3333},
            {"code": "024", "name": "West Pokot", "latitude": 1.2500, "longitude": 35.1167},
            {"code": "025", "name": "Samburu", "latitude": 1.0833, "longitude": 36.6667},
            {"code": "026", "name": "Trans Nzoia", "latitude": 1.0167, "longitude": 35.0000},
            {"code": "027", "name": "Uasin Gishu", "latitude": 0.5167, "longitude": 35.2833},
            {"code": "028", "name": "Elgeyo-Marakwet", "latitude": 1.0000, "longitude": 35.5000},
            {"code": "029", "name": "Nandi", "latitude": 0.1833, "longitude": 35.1833},
            {"code": "030", "name": "Baringo", "latitude": 0.6167, "longitude": 36.0833},
            {"code": "031", "name": "Laikipia", "latitude": 0.3000, "longitude": 36.5833},
            {"code": "032", "name": "Nakuru", "latitude": -0.2833, "longitude": 36.0667},
            {"code": "033", "name": "Narok", "latitude": -1.0833, "longitude": 35.8667},
            {"code": "034", "name": "Kajiado", "latitude": -1.8500, "longitude": 36.8000},
            {"code": "035", "name": "Kericho", "latitude": -0.3667, "longitude": 35.2833},
            {"code": "036", "name": "Bomet", "latitude": -0.7833, "longitude": 35.3500},
            {"code": "037", "name": "Kakamega", "latitude": 0.2833, "longitude": 34.7500},
            {"code": "038", "name": "Vihiga", "latitude": 0.0833, "longitude": 34.7167},
            {"code": "039", "name": "Bungoma", "latitude": 0.5667, "longitude": 34.5667},
            {"code": "040", "name": "Busia", "latitude": 0.4667, "longitude": 34.1167},
            {"code": "041", "name": "Siaya", "latitude": 0.1333, "longitude": 34.2667},
            {"code": "042", "name": "Kisumu", "latitude": -0.1000, "longitude": 34.7500},
            {"code": "043", "name": "Homa Bay", "latitude": -0.5167, "longitude": 34.4500},
            {"code": "044", "name": "Migori", "latitude": -1.0667, "longitude": 34.4833},
            {"code": "045", "name": "Kisii", "latitude": -0.6833, "longitude": 34.7833},
            {"code": "046", "name": "Nyamira", "latitude": -0.5667, "longitude": 34.9333},
            {"code": "047", "name": "Nairobi", "latitude": -1.2833, "longitude": 36.8167},
        ]
        created_count = 0
        updated_count = 0
        for county in county_data:
            location = Point(county['longitude'], county['latitude'], srid=4326)
            district, created = District.objects.update_or_create(
                code=county['code'],
                defaults={'name': county['name'], 'location': location, 'agency': agency}
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created District: {county['name']}")
            else:
                updated_count += 1
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} districts, updated {updated_count}"))

        # Step 4: Seed Neighborhoods
        districts = District.objects.all()
        neighborhoods_data = []
        for district in districts:
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
                self.stdout.write(f"Created neighborhood: {neighborhood.name}")
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} neighborhoods"))

        # Step 5: Seed Crimes (2017-2024)
        categories = CrimeCategory.objects.all()
        neighborhoods = Neighborhood.objects.all()
        yearly_totals = {
            2017: 77986, 2018: 88268, 2019: 93411, 2020: 69645,
            2021: 85000, 2022: 89250, 2023: 93713, 2024: 98399
        }
        category_weights = {
            'Homicide': 0.032, 'Offenses': 0.086, 'Robbery': 0.291, 'Other Offenses': 0.031,
            'Breakings': 0.064, 'Theft of Stolen Goods': 0.021, 'Stealing': 0.149,
            'Theft by Servant': 0.024, 'Theft of Vehicles': 0.014, 'Dangerous Drugs': 0.086,
            'Traffic Offenses': 0.004, 'Economic Crimes': 0.052, 'Criminal Damage': 0.051,
            'Corruption': 0.0008, 'Other Penal Code Offenses': 0.093
        }
        created_count = 0
        for year, total_crimes in yearly_totals.items():
            crimes_per_district = total_crimes // len(districts) // 15
            crimes_data = []
            for district in districts:
                for _ in range(random.randint(10, 20)):
                    district_neighborhoods = neighborhoods.filter(district=district)
                    if not district_neighborhoods.exists():
                        continue
                    neighborhood = random.choice(district_neighborhoods)
                    category_name = random.choices(
                        list(category_weights.keys()),
                        weights=list(category_weights.values()),
                        k=1
                    )[0]
                    try:
                        category = categories.get(name=category_name)
                    except CrimeCategory.DoesNotExist:
                        continue
                    while True:
                        case_number = f"CR-{year}-{secrets.token_hex(4)}"
                        if not Crime.objects.filter(case_number=case_number).exists():
                            break
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
                        external_id=f"EXT-{secrets.token_hex(4)}",
                        data_source='National Police Records'
                    ))
            for i in range(0, len(crimes_data), batch_size):
                batch = crimes_data[i:i + batch_size]
                Crime.objects.bulk_create(batch, ignore_conflicts=True)
                created_count += len(batch)
                self.stdout.write(f"Created {len(batch)} crimes for {year} (batch {i // batch_size + 1})")
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} crimes"))

        # Step 6: Seed Crime Media and Notes
        crimes = Crime.objects.all()
        media_count = 0
        for crime in random.sample(list(crimes), int(len(crimes) * 0.2)):
            media, created = CrimeMedia.objects.update_or_create(
                crime=crime,
                file_type=random.choice(['image', 'video', 'document']),
                file_path=f"media/{crime.case_number}_{random.randint(1, 3)}.{random.choice(['jpg', 'mp4', 'pdf'])}",
                defaults={'description': f"Evidence for {crime.case_number}"}
            )
            if created:
                media_count += 1
                self.stdout.write(f"Created media for {crime.case_number}")
        note_count = 0
        for crime in random.sample(list(crimes), int(len(crimes) * 0.3)):
            note, created = CrimeNote.objects.update_or_create(
                crime=crime,
                content=f"Investigation note for {crime.case_number}: {random.choice(['Suspect identified', 'Witness interviewed', 'Case pending'])}",
                author=f"Officer_{random.randint(1, 10)}",
            )
            if created:
                note_count += 1
                self.stdout.write(f"Created note for {crime.case_number}")
        self.stdout.write(self.style.SUCCESS(f"Created {media_count} media and {note_count} notes"))

        # Step 7: Seed Crime Statistics
        crime_data = [
            {'year': 2017, 'total': 77986, 'homicide': 2751, 'offenses': 6228, 'violent_count': 2751 + 6228},
            {'year': 2018, 'total': 88268, 'homicide': 2856, 'offenses': 7233, 'violent_count': 2856 + 7233},
            {'year': 2019, 'total': 93411, 'homicide': 2971, 'offenses': 8051, 'violent_count': 2971 + 8051},
            {'year': 2020, 'total': 69645, 'homicide': 3111, 'offenses': 9153, 'violent_count': 3111 + 9153},
        ]
        created_count = 0
        for year_data in crime_data:
            year = year_data['year']
            total_count = year_data['total']
            violent_count = year_data['violent_count']
            districts_per_year = len(districts)
            avg_count_per_district = total_count // districts_per_year
            avg_violent_per_district = violent_count // districts_per_year
            for district in districts:
                stat, created = CrimeStatistic.objects.update_or_create(
                    date=datetime(year, 1, 1),
                    district=district,
                    agency=agency,
                    defaults={
                        'count': avg_count_per_district,
                        'violent_count': avg_violent_per_district,
                        'property_damage': 0,
                        'arrests': 0,
                    }
                )
                if created:
                    created_count += 1
                    self.stdout.write(f"Created CrimeStatistic for {district.name} in {year}")
        self.stdout.write(self.style.SUCCESS(f"Created {created_count} CrimeStatistic entries"))

        self.stdout.write(self.style.SUCCESS("Completed seeding all crime-related data"))