"""
Script to create sample crime data for the Crime Analysis System.
This script only creates crime incidents using existing categories, districts, and neighborhoods.
"""

import os
import sys
import random
import datetime

# Setup Django environment
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crime_analysis.settings')
django.setup()

# Import models
from django.contrib.gis.geos import Point
from agencies.models import Agency
from crimes.models import Crime, CrimeCategory, District, Neighborhood

def create_crimes(num_crimes=50):
    """Create sample crime incidents."""
    # Check if crimes already exist
    existing_count = Crime.objects.count()
    if existing_count > 0:
        print(f"Skipping crime creation - {existing_count} crimes already exist")
        return
    
    # Get required data
    categories = list(CrimeCategory.objects.all())
    if not categories:
        print("No crime categories found. Please run create_sample_data.py first.")
        return
        
    districts = list(District.objects.all())
    if not districts:
        print("No districts found. Please run create_sample_data.py first.")
        return
        
    neighborhoods = list(Neighborhood.objects.all())
    if not neighborhoods:
        print("No neighborhoods found. Please run create_sample_data.py first.")
        return
        
    agencies = list(Agency.objects.all())
    if not agencies:
        print("No agencies found. Please run create_sample_data.py first.")
        return
    
    # Status options
    statuses = ['reported', 'under_investigation', 'solved', 'closed', 'unfounded']
    
    # Date range for crimes (past 3 years)
    end_date = datetime.date.today()
    start_date = end_date - datetime.timedelta(days=3*365)
    
    created_count = 0
    print(f"Creating {num_crimes} sample crime incidents...")
    
    for i in range(num_crimes):
        try:
            # Assign random attributes
            category = random.choice(categories)
            is_violent = category.severity_level > 5
            district = random.choice(districts)
            
            # Make sure we have neighborhoods for this district
            district_neighborhoods = [n for n in neighborhoods if n.district == district]
            if not district_neighborhoods:
                print(f"No neighborhoods found for district {district.name}. Skipping this crime.")
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
            
            # Print progress for every 5 crimes
            if created_count % 5 == 0:
                print(f"Created {created_count} crimes so far...")
                
        except Exception as e:
            print(f"Error creating crime: {e}")
            continue
    
    print(f"Created {created_count} crime incidents")

if __name__ == "__main__":
    # Get number of crimes from command line argument, default to 50
    num_crimes = 50
    if len(sys.argv) > 1:
        try:
            num_crimes = int(sys.argv[1])
        except ValueError:
            print(f"Invalid number of crimes: {sys.argv[1]}. Using default value 50.")
    
    create_crimes(num_crimes)
    print("Sample crime data creation complete.")