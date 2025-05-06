from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from crime_etl.models import DataSource, DataTransformation

User = get_user_model()

class Command(BaseCommand):
    help = 'Set up data transformations for crime statistics and county data'

    def handle(self, *args, **options):
        try:
            user = User.objects.get(username='admin')
        except User.DoesNotExist:
            self.stderr.write("Admin user not found. Please create a superuser first.")
            return

        try:
            data_source = DataSource.objects.get(name='Kenya Crime Statistics 2017-2020')
        except DataSource.DoesNotExist:
            self.stderr.write("Data source not found. Please set up the data source first.")
            return

        transformations = [
            {
                'name': 'Geocode Counties',
                'description': 'Transform latitude and longitude into Point geometry',
                'transformation_type': 'geocoding',
                'configuration': {
                    'latitude_field': 'latitude',
                    'longitude_field': 'longitude',
                    'output_field': 'location',
                    'srid': 4326
                },
                'order': 1,
                'is_active': True,
                'data_source': data_source,
                'created_by': user
            },
            {
                'name': 'Normalize Crime Counts',
                'description': 'Normalize crime counts by distributing across districts',
                'transformation_type': 'normalization',
                'configuration': {
                    'fields_to_normalize': [
                        'count', 'homicide_count', 'offenses_count', 'robbery_count',
                        'other_offenses_count', 'breakings_count', 'theft_of_stolen_count',
                        'stealing_count', 'theft_by_servant_count', 'theft_of_vehicle_count',
                        'dangerous_drugs_count', 'traffic_count', 'economic_count',
                        'criminal_damage_count', 'units_count', 'corruption_count',
                        'offenses_i_count', 'other_penal_count'
                    ],
                    'distribute_by': 'district_count',
                    'district_count': 47  # Number of districts
                },
                'order': 2,
                'is_active': True,
                'data_source': data_source,
                'created_by': user
            },
            {
                'name': 'Calculate Violent Crimes',
                'description': 'Calculate violent crime counts (Homicide + Offenses)',
                'transformation_type': 'custom',
                'configuration': {
                    'input_fields': ['homicide_count', 'offenses_count'],
                    'output_field': 'violent_count',
                    'operation': 'sum'
                },
                'order': 3,
                'is_active': True,
                'data_source': data_source,
                'created_by': user
            }
        ]

        created_count = 0
        for transform_data in transformations:
            transform, created = DataTransformation.objects.update_or_create(
                name=transform_data['name'],
                defaults={
                    'description': transform_data['description'],
                    'transformation_type': transform_data['transformation_type'],
                    'configuration': transform_data['configuration'],
                    'order': transform_data['order'],
                    'is_active': transform_data['is_active'],
                    'data_source': transform_data['data_source'],
                    'created_by': transform_data['created_by']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created transformation: {transform.name}")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} transformations"))