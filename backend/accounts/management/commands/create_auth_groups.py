from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from accounts.models import User
from agencies.models import Agency, APIKey
from crimes.models import Crime, CrimeCategory, District

class Command(BaseCommand):
    help = 'Creates permission groups for different user types'

    def handle(self, *args, **options):
        # Create groups if they don't exist
        admin_group, _ = Group.objects.get_or_create(name='Administrators')
        agency_group, _ = Group.objects.get_or_create(name='Agency Users')
        user_group, _ = Group.objects.get_or_create(name='Regular Users')

        # Get content types
        agency_ct = ContentType.objects.get_for_model(Agency)
        crime_ct = ContentType.objects.get_for_model(Crime)
        apikey_ct = ContentType.objects.get_for_model(APIKey)
        user_ct = ContentType.objects.get_for_model(User)
        district_ct = ContentType.objects.get_for_model(District)
        category_ct = ContentType.objects.get_for_model(CrimeCategory)

        # Admin permissions (can do everything)
        admin_permissions = Permission.objects.all()
        admin_group.permissions.set(admin_permissions)
        
        # Agency permissions
        agency_permissions = [
            # Agency model permissions
            Permission.objects.get(codename='view_agency', content_type=agency_ct),
            Permission.objects.get(codename='change_agency', content_type=agency_ct),
            
            # API Key permissions
            Permission.objects.get(codename='add_apikey', content_type=apikey_ct),
            Permission.objects.get(codename='change_apikey', content_type=apikey_ct),
            Permission.objects.get(codename='view_apikey', content_type=apikey_ct),
            
            # Crime data permissions
            Permission.objects.get(codename='add_crime', content_type=crime_ct),
            Permission.objects.get(codename='change_crime', content_type=crime_ct),
            Permission.objects.get(codename='view_crime', content_type=crime_ct),
            Permission.objects.get(codename='delete_crime', content_type=crime_ct),
            
            # Categories and districts
            Permission.objects.get(codename='view_crimecategory', content_type=category_ct),
            Permission.objects.get(codename='view_district', content_type=district_ct),
        ]
        agency_group.permissions.set(agency_permissions)
        
        # Regular user permissions
        user_permissions = [
            # Crime viewing permissions
            Permission.objects.get(codename='view_crime', content_type=crime_ct),
            Permission.objects.get(codename='view_crimecategory', content_type=category_ct),
            Permission.objects.get(codename='view_district', content_type=district_ct),
        ]
        user_group.permissions.set(user_permissions)
        
        self.stdout.write(self.style.SUCCESS('Successfully created user groups and permissions'))