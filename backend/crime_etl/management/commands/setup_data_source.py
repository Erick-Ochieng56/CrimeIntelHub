from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from crime_etl.models import DataSource

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up the data source for crime statistics and county data'

    def handle(self, *args, **options):
        # Find an agency user (assuming one exists with username 'admin')
        try:
            user = User.objects.get(username='admin')
        except User.DoesNotExist:
            self.stderr.write("Admin user not found. Please create a superuser first.")
            return

        # Define the field mapping for crime statistics
        crime_stats_mapping = {
            'Crime Nar Total Units': 'count',
            'Homicide': 'homicide_count',
            'Offenses': 'offenses_count',
            'Robbery': 'robbery_count',
            'Other offenses': 'other_offenses_count',
            'Breakings': 'breakings_count',
            'Theft of st': 'theft_of_stolen_count',
            'Stealing': 'stealing_count',
            'Theft by se': 'theft_by_servant_count',
            'Theft of ve': 'theft_of_vehicle_count',
            'Dangerous': 'dangerous_drugs_count',
            'Traffic': 'traffic_count',
            'Economic': 'economic_count',
            'Criminal d': 'criminal_damage_count',
            'Units': 'units_count',
            'Corruption': 'corruption_count',
            'Offenses i': 'offenses_i_count',
            'Other penal code offenses': 'other_penal_count',
            'Year': 'year'
        }

        # Define the field mapping for county data
        county_mapping = {
            'County Code': 'code',
            'County Name': 'name',
            'Latitude': 'latitude',
            'Longitude': 'longitude'
        }

        # Create or update the data source
        data_source, created = DataSource.objects.update_or_create(
            name='Kenya Crime Statistics 2017-2020',
            defaults={
                'description': 'Crime statistics and county data for Kenya from 2017 to 2020',
                'source_type': 'file',
                'configuration': {
                    'file_path': 'data/kenya_crime_stats_2017_2020.csv',
                    'delimiter': ','
                },
                'mapping': {
                    'crime_stats': crime_stats_mapping,
                    'counties': county_mapping
                },
                'is_active': True,
                'created_by': user
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('Created data source: Kenya Crime Statistics 2017-2020'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated data source: Kenya Crime Statistics 2017-2020'))