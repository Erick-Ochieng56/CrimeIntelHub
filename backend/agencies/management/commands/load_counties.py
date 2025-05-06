from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from crimes.models import District
from agencies.models import Agency

class Command(BaseCommand):
    help = 'Load Kenyan county data into the District model'

    # County data as provided
    COUNTY_DATA = [
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

    def add_arguments(self, parser):
        parser.add_argument(
            '--agency_id',
            type=int,
            help='ID of the Agency to assign to all districts',
            default=1
        )

    def handle(self, *args, **options):
        agency_id = options['agency_id']
        
        # Verify agency exists
        try:
            agency = Agency.objects.get(id=agency_id)
        except Agency.DoesNotExist:
            self.stderr.write(f"Agency with ID {agency_id} does not exist. Please create an agency first.")
            return

        created_count = 0
        updated_count = 0

        for county in self.COUNTY_DATA:
            # Create Point geometry from latitude and longitude
            location = Point(
                x=county['longitude'],
                y=county['latitude'],
                srid=4326
            )

            # Create or update District
            district, created = District.objects.update_or_create(
                code=county['code'],
                defaults={
                    'name': county['name'],
                    'location': location,
                    'agency': agency,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(f"Created District: {county['name']} ({county['code']})")
            else:
                updated_count += 1
                self.stdout.write(f"Updated District: {county['name']} ({county['code']})")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully loaded {created_count} new districts and updated {updated_count} existing districts."
            )
        )