#!/usr/bin/env python
"""
Script to create sample data for the Crime Analysis System.
Run this script to populate the database with test data.
"""
import os
import sys
import django
import random
import datetime
from django.contrib.gis.geos import Point
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crime_analysis.settings')
django.setup()

# Import models after Django setup
from django.contrib.auth import get_user_model
from agencies.models import Agency
from crimes.models import CrimeCategory, District, Neighborhood, Crime

User = get_user_model()

def create_admin_user():
    """Create a superuser for testing."""
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')
        print("Created admin user")

def create_agencies():
    """Create sample law enforcement agencies."""
    agencies = [
        {'name': 'Metro Police Department', 'agency_type': 'Metropolitan', 'jurisdiction_description': 'City-wide jurisdiction'},
        {'name': 'County Sheriff Office', 'agency_type': 'County', 'jurisdiction_description': 'County-wide jurisdiction'},
        {'name': 'State Highway Patrol', 'agency_type': 'State', 'jurisdiction_description': 'State highways and roads'},
        {'name': 'Federal Bureau of Investigation', 'agency_type': 'Federal', 'jurisdiction_description': 'Federal jurisdiction'},
    ]
    
    for agency_data in agencies:
        agency, created = Agency.objects.get_or_create(
            name=agency_data['name'],
            defaults={
                'agency_type': agency_data['agency_type'],
                'jurisdiction_description': agency_data['jurisdiction_description'],
                'email': f"contact@{agency_data['name'].lower().replace(' ', '')}.gov",
                'phone': '555-' + ''.join([str(random.randint(0, 9)) for _ in range(7)]),
                'data_sharing_agreement': True,
                'description': f"The {agency_data['name']} is responsible for law enforcement within its {agency_data['agency_type'].lower()} jurisdiction."
            }
        )
    
    print(f"Created {len(agencies)} agencies")

def create_crime_categories():
    """Create sample crime categories."""
    categories = [
        {'name': 'Theft', 'severity_level': 3, 'color': '#FFA500', 'icon': 'theft'},
        {'name': 'Burglary', 'severity_level': 5, 'color': '#FF8C00', 'icon': 'burglary'},
        {'name': 'Assault', 'severity_level': 7, 'color': '#FF0000', 'icon': 'assault'},
        {'name': 'Vandalism', 'severity_level': 2, 'color': '#9932CC', 'icon': 'vandalism'},
        {'name': 'Robbery', 'severity_level': 6, 'color': '#B22222', 'icon': 'robbery'},
        {'name': 'Homicide', 'severity_level': 10, 'color': '#8B0000', 'icon': 'homicide'},
        {'name': 'Drug Offense', 'severity_level': 4, 'color': '#228B22', 'icon': 'drugs'},
        {'name': 'Vehicle Theft', 'severity_level': 4, 'color': '#4682B4', 'icon': 'vehicle'},
        {'name': 'Fraud', 'severity_level': 3, 'color': '#BA55D3', 'icon': 'fraud'},
        {'name': 'DUI', 'severity_level': 5, 'color': '#CD853F', 'icon': 'dui'},
    ]
    
    for cat_data in categories:
        CrimeCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={
                'severity_level': cat_data['severity_level'],
                'color': cat_data['color'],
                'icon': cat_data['icon'],
                'description': f"Crimes involving {cat_data['name'].lower()}"
            }
        )
    
    print(f"Created {len(categories)} crime categories")

def create_districts():
    """Create sample districts."""
    # Import necessary geometry modules
    from django.contrib.gis.geos import Point, MultiPolygon, Polygon
    
    # Using sample coordinates for a fictional city
    # Center point at approximately 37.7749, -122.4194 (San Francisco-like)
    center_lat, center_lng = 37.7749, -122.4194
    
    districts = [
        {'name': 'Downtown District', 'code': 'DT', 'lat_offset': 0.01, 'lng_offset': 0.01},
        {'name': 'Northern District', 'code': 'ND', 'lat_offset': 0.03, 'lng_offset': 0.0},
        {'name': 'Southern District', 'code': 'SD', 'lat_offset': -0.03, 'lng_offset': 0.0},
        {'name': 'Eastern District', 'code': 'ED', 'lat_offset': 0.0, 'lng_offset': 0.03},
        {'name': 'Western District', 'code': 'WD', 'lat_offset': 0.0, 'lng_offset': -0.03},
        {'name': 'Central District', 'code': 'CD', 'lat_offset': 0.0, 'lng_offset': 0.0},
    ]
    
    agency = Agency.objects.first()
    
    for district_data in districts:
        # Generate coordinates for district
        lat = center_lat + district_data['lat_offset']
        lng = center_lng + district_data['lng_offset']
        
        # Create a circular polygon
        circle_poly = Point(lng, lat).buffer(0.02)
        
        # Convert to MultiPolygon for compatibility with the District model
        if isinstance(circle_poly, Polygon):
            multi_poly = MultiPolygon([circle_poly])
        else:
            multi_poly = MultiPolygon(circle_poly)
        
        District.objects.get_or_create(
            name=district_data['name'],
            defaults={
                'code': district_data['code'],
                'boundary': multi_poly,
                'agency': agency,
                'population': random.randint(20000, 100000),
                'description': f"The {district_data['name']} police jurisdiction"
            }
        )
    
    print(f"Created {len(districts)} districts")

def create_neighborhoods():
    """Create sample neighborhoods within districts."""
    # Import necessary geometry modules
    from django.contrib.gis.geos import MultiPolygon, Polygon
    
    districts = District.objects.all()
    
    for district in districts:
        # Create 3-5 neighborhoods per district
        num_neighborhoods = random.randint(3, 5)
        
        for i in range(num_neighborhoods):
            name = f"{district.name.split(' ')[0]} Neighborhood {i+1}"
            
            # Create a smaller polygon within the district
            center_point = district.boundary.centroid
            poly = center_point.buffer(0.005 + (0.002 * i))  # Varying sizes
            
            # Convert to MultiPolygon for compatibility
            if isinstance(poly, Polygon):
                multi_poly = MultiPolygon([poly])
            else:
                multi_poly = MultiPolygon(poly)
            
            Neighborhood.objects.get_or_create(
                name=name,
                defaults={
                    'boundary': multi_poly,
                    'district': district,
                    'population': random.randint(5000, 30000),
                    'description': f"A neighborhood in the {district.name}"
                }
            )
    
    num_neighborhoods = Neighborhood.objects.count()
    print(f"Created {num_neighborhoods} neighborhoods")

def create_crimes():
    """Create sample crime incidents."""
    # Check if crimes already exist
    existing_count = Crime.objects.count()
    if existing_count > 0:
        print(f"Skipping crime creation - {existing_count} crimes already exist")
        return
    
    categories = list(CrimeCategory.objects.all())
    districts = list(District.objects.all())
    neighborhoods = list(Neighborhood.objects.all())
    agencies = list(Agency.objects.all())
    
    # Status options
    statuses = ['reported', 'under_investigation', 'solved', 'closed', 'unfounded']
    
    # Create 100 sample crimes over the past 3 years (reduced for performance)
    num_crimes = 100
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=3*365)
    
    # Add a Point import
    from django.contrib.gis.geos import Point
    
    created_count = 0
    for i in range(num_crimes):
        try:
            # Assign random attributes
            category = random.choice(categories)
            is_violent = category.severity_level > 5
            district = random.choice(districts)
            
            # Make sure we have neighborhoods for this district
            district_neighborhoods = [n for n in neighborhoods if n.district == district]
            if not district_neighborhoods:
                continue
                
            neighborhood = random.choice(district_neighborhoods)
            agency = district.agency
            
            # Random date within range
            days_offset = random.randint(0, (end_date - start_date).days)
            incident_date = start_date + datetime.timedelta(days=days_offset)
            
            # Random time
            hour = random.randint(0, 23)
            minute = random.randint(0, 59)
            incident_time = datetime.time(hour, minute)
            
            # Location within the neighborhood
            boundary_centroid = neighborhood.boundary.centroid
            lng, lat = boundary_centroid.x, boundary_centroid.y
            
            # Add some randomness to the location
            lat_offset = random.uniform(-0.003, 0.003)
            lng_offset = random.uniform(-0.003, 0.003)
            location = Point(lng + lng_offset, lat + lat_offset)
            
            # Create crime record
            case_number = f"CASE-{incident_date.year}-{random.randint(10000, 99999)}"
            
            Crime.objects.create(
                case_number=case_number,
                category=category,
                description=f"{category.name} incident reported at {incident_time}",
                date=incident_date,
                time=incident_time,
                status=random.choice(statuses),
                location=location,
                block_address=f"{random.randint(1, 999)} block of Example Street",
                district=district,
                neighborhood=neighborhood,
                agency=agency,
                is_violent=is_violent,
                property_loss=random.randint(0, 10000) if random.random() > 0.3 else None,
                weapon_used=random.random() > 0.7 if is_violent else False,
                weapon_type="Firearm" if random.random() > 0.5 else "Knife" if random.random() > 0.5 else None,
                drug_related=random.random() > 0.8,
                domestic=random.random() > 0.8,
                arrests_made=random.random() > 0.7,
                gang_related=random.random() > 0.9,
                external_id=f"EXT-{random.randint(10000, 99999)}",
                data_source="Sample Data"
            )
            created_count += 1
            # Print progress for every 10 crimes
            if created_count % 10 == 0:
                print(f"Created {created_count} crimes so far...")
        except Exception as e:
            print(f"Error creating crime: {e}")
            continue
    
    print(f"Created {created_count} crime incidents")

def main():
    """Run all data creation functions."""
    print("Creating sample data for Crime Analysis System...")
    
    create_admin_user()
    create_agencies()
    create_crime_categories()
    create_districts()
    create_neighborhoods()
    create_crimes()
    
    print("Sample data creation complete.")

if __name__ == "__main__":
    main()