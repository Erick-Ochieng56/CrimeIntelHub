from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from agencies.models import Agency

class Command(BaseCommand):
    help = 'Set up the National Police Service agency'

    def handle(self, *args, **options):
        agency, created = Agency.objects.update_or_create(
            id=1,
            defaults={
                'name': 'National Police Service',
                'short_name': 'NPS',
                'agency_type': 'national_police',
                'status': 'approved',
                'description': 'The primary law enforcement agency in Kenya responsible for maintaining law and order.',
                'website': 'https://www.nationalpolice.go.ke',
                'phone': '+254-20-2222222',
                'email': 'info@nps.go.ke',
                'address': 'Nairobi Area, Kenya',
                'county': 'Nairobi',
                'headquarters_location': Point(36.8167, -1.2833, srid=4326),  # Nairobi coordinates
                'jurisdiction_area': None,  # Can be updated with Kenyan boundaries
                'jurisdiction_description': 'Nationwide jurisdiction',
                'data_sharing_agreement': True,
                'api_endpoint': 'https://api.nps.go.ke',
                'data_format': 'json'
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('Created National Police Service agency'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated National Police Service agency'))