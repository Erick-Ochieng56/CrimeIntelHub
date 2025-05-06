from django.core.management.base import BaseCommand
from crimes.models import CrimeCategory

class Command(BaseCommand):
    help = 'Seed initial crime categories based on crime statistics'

    def handle(self, *args, **options):
        categories_data = [
            {
                'name': 'Homicide',
                'description': 'Murder or manslaughter cases',
                'severity_level': 10,
                'color': '#FF0000',
                'icon': 'fa-skull'
            },
            {
                'name': 'Offenses',
                'description': 'General violent offenses (e.g., assault)',
                'severity_level': 8,
                'color': '#FF4500',
                'icon': 'fa-fist-raised',
                'parent': None  # Can be a top-level category
            },
            {
                'name': 'Robbery',
                'description': 'Theft with force or threat',
                'severity_level': 7,
                'color': '#FFA500',
                'icon': 'fa-mask',
                'parent': None
            },
            {
                'name': 'Other Offenses',
                'description': 'Miscellaneous violent crimes',
                'severity_level': 6,
                'color': '#FFD700',
                'icon': 'fa-exclamation-triangle',
                'parent': None
            },
            {
                'name': 'Breakings',
                'description': 'Breaking and entering incidents',
                'severity_level': 5,
                'color': '#ADFF2F',
                'icon': 'fa-door-open',
                'parent': None
            },
            {
                'name': 'Theft of Stolen Goods',
                'description': 'Theft involving stolen property',
                'severity_level': 4,
                'color': '#9ACD32',
                'icon': 'fa-box',
                'parent': None
            },
            {
                'name': 'Stealing',
                'description': 'General theft without violence',
                'severity_level': 3,
                'color': '#98FB98',
                'icon': 'fa-hand-holding',
                'parent': None
            },
            {
                'name': 'Theft by Servant',
                'description': 'Theft by an employee',
                'severity_level': 3,
                'color': '#90EE90',
                'icon': 'fa-user-tie',
                'parent': None
            },
            {
                'name': 'Theft of Vehicles',
                'description': 'Vehicle theft cases',
                'severity_level': 4,
                'color': '#00FF7F',
                'icon': 'fa-car',
                'parent': None
            },
            {
                'name': 'Dangerous Drugs',
                'description': 'Drug-related offenses',
                'severity_level': 6,
                'color': '#20B2AA',
                'icon': 'fa-pills',
                'parent': None
            },
            {
                'name': 'Traffic Offenses',
                'description': 'Traffic-related crimes',
                'severity_level': 2,
                'color': '#87CEEB',
                'icon': 'fa-car-side',
                'parent': None
            },
            {
                'name': 'Economic Crimes',
                'description': 'Financial or economic offenses',
                'severity_level': 5,
                'color': '#ADD8E6',
                'icon': 'fa-money-bill',
                'parent': None
            },
            {
                'name': 'Criminal Damage',
                'description': 'Damage to property',
                'severity_level': 4,
                'color': '#B0C4DE',
                'icon': 'fa-burn',
                'parent': None
            },
            {
                'name': 'Corruption',
                'description': 'Corruption and bribery cases',
                'severity_level': 7,
                'color': '#DDA0DD',
                'icon': 'fa-handshake',
                'parent': None
            },
            {
                'name': 'Other Penal Code Offenses',
                'description': 'Miscellaneous offenses under penal code',
                'severity_level': 3,
                'color': '#D8BFD8',
                'icon': 'fa-balance-scale',
                'parent': None
            },
        ]

        created_count = 0
        for category_data in categories_data:
            parent = None
            if 'parent' in category_data and category_data['parent'] is not None:
                parent_name = category_data.pop('parent')
                parent, _ = CrimeCategory.objects.get_or_create(name=parent_name)
            category, created = CrimeCategory.objects.update_or_create(
                name=category_data['name'],
                defaults=category_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"Created category: {category.name}")
            if parent:
                category.parent = parent
                category.save()

        self.stdout.write(self.style.SUCCESS(f"Successfully created {created_count} crime categories"))