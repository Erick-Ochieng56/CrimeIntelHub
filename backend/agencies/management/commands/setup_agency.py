from django.core.management.base import BaseCommand
from agencies.models import Agency

class Command(BaseCommand):
    help = 'Set up the "National Police" agency with ID 1'

    def handle(self, *args, **options):
        agency, created = Agency.objects.update_or_create(
            id=1,
            defaults={
                'name': 'National Police',
                'description': 'National law enforcement agency of Kenya',
                'contact_email': 'contact@nationalpolice.go.ke',
                'contact_phone': '+254-20-1234567',
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS('Created "National Police" agency with ID 1'))
        else:
            self.stdout.write(self.style.SUCCESS('Updated "National Police" agency with ID 1'))