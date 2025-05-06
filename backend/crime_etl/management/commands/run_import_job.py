from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.utils import timezone
from crime_etl.models import DataSource, ImportJob, ImportLog
from crimes.models import District, CrimeStatistic, CrimeCategory, Crime, Agency
from datetime import datetime
import random
import uuid

User = get_user_model()

class Command(BaseCommand):
    help = 'Run an import job for crime statistics and county data'

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

        agency = Agency.objects.get(id=1)  # National Police

        # Create the import job
        import_job = ImportJob.objects.create(
            data_source=data_source,
            created_by=user,
            file_path='data/kenya_crime_stats_2017_2020.csv',
            parameters={'import_type': 'full'},
            status='processing',
            started_at=timezone.now(),
            records_processed=0,
            records_created=0,
            records_updated=0,
            records_failed=0
        )

        try:
            # County data
            counties = [
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

            # Crime statistics data
            crime_stats = [
                {
                    'year': 2017, 'count': 77986, 'homicide_count': 2751, 'offenses_count': 6228,
                    'robbery_count': 22295, 'other_offenses_count': 2697, 'breakings_count': 5621,
                    'theft_of_stolen_count': 1918, 'stealing_count': 10361, 'theft_by_servant_count': 240,
                    'theft_of_vehicle_count': 1355, 'dangerous_drugs_count': 6160, 'traffic_count': 139,
                    'economic_count': 4300, 'criminal_damage_count': 3503, 'units_count': 92,
                    'corruption_count': 57, 'offenses_i_count': 15, 'other_penal_count': 7047,
                    'violent_count': 8979
                },
                {
                    'year': 2018, 'count': 88268, 'homicide_count': 2856, 'offenses_count': 7233,
                    'robbery_count': 25049, 'other_offenses_count': 2935, 'breakings_count': 5970,
                    'theft_of_stolen_count': 2077, 'stealing_count': 12845, 'theft_by_servant_count': 2477,
                    'theft_of_vehicle_count': 1370, 'dangerous_drugs_count': 8021, 'traffic_count': 213,
                    'economic_count': 4783, 'criminal_damage_count': 4100, 'units_count': 119,
                    'corruption_count': 174, 'offenses_i_count': 93, 'other_penal_count': 7953,
                    'violent_count': 10089
                },
                {
                    'year': 2019, 'count': 93411, 'homicide_count': 2971, 'offenses_count': 8051,
                    'robbery_count': 27196, 'other_offenses_count': 2858, 'breakings_count': 5976,
                    'theft_of_stolen_count': 1962, 'stealing_count': 13954, 'theft_by_servant_count': 2226,
                    'theft_of_vehicle_count': 1298, 'dangerous_drugs_count': 8011, 'traffic_count': 341,
                    'economic_count': 4852, 'criminal_damage_count': 4786, 'units_count': 130,
                    'corruption_count': 77, 'offenses_i_count': 48, 'other_penal_count': 8674,
                    'violent_count': 11022
                },
                {
                    'year': 2020, 'count': 69645, 'homicide_count': 3111, 'offenses_count': 9153,
                    'robbery_count': 19288, 'other_offenses_count': 2384, 'breakings_count': 4252,
                    'theft_of_stolen_count': 1556, 'stealing_count': 8709, 'theft_by_servant_count': 1467,
                    'theft_of_vehicle_count': 1031, 'dangerous_drugs_count': 4477, 'traffic_count': 186,
                    'economic_count': 3530, 'criminal_damage_count': 3488, 'units_count': 133,
                    'corruption_count': 64, 'offenses_i_count': 26, 'other_penal_count': 6790,
                    'violent_count': 12264
                },
            ]

            # Import counties into District
            district_records_processed = 0
            district_records_created = 0
            district_records_updated = 0
            district_records_failed = 0
            district_errors = []

            for county in counties:
                district_records_processed += 1
                source_data = county
                transformed_data = county.copy()
                lat, lon = county['latitude'], county['longitude']
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    raise ValueError(f"Invalid coordinates: lat={lat}, lon={lon}")
                location = Point(x=lon, y=lat, srid=4326)
                transformed_data['location'] = str(location)

                try:
                    district, created = District.objects.update_or_create(
                        code=county['code'],
                        defaults={
                            'name': county['name'],
                            'location': location,
                            'agency': agency
                        }
                    )
                    if created:
                        district_records_created += 1
                    else:
                        district_records_updated += 1

                    ImportLog.objects.create(
                        import_job=import_job,
                        crime=None,
                        external_id=f"district_{county['code']}",
                        source_data=source_data,
                        transformed_data=transformed_data,
                        status='success',
                        message='District imported successfully'
                    )
                except Exception as e:
                    district_records_failed += 1
                    district_errors.append(str(e))
                    ImportLog.objects.create(
                        import_job=import_job,
                        crime=None,
                        external_id=f"district_{county['code']}",
                        source_data=source_data,
                        transformed_data=transformed_data,
                        status='failed',
                        message='Failed to import district',
                        errors=[str(e)]
                    )

            # Import crime statistics into CrimeStatistic
            stats_records_processed = 0
            stats_records_created = 0
            stats_records_updated = 0
            stats_records_failed = 0
            stats_errors = []

            districts = District.objects.all()
            for stat in crime_stats:
                year = stat['year']
                total_count = stat['count']
                violent_count = stat['violent_count']
                districts_per_year = len(districts)
                avg_count_per_district = total_count // districts_per_year
                avg_violent_per_district = violent_count // districts_per_year

                for district in districts:
                    stats_records_processed += 1
                    source_data = stat.copy()
                    transformed_data = stat.copy()
                    transformed_data['avg_count_per_district'] = avg_count_per_district
                    transformed_data['avg_violent_per_district'] = avg_violent_per_district

                    try:
                        crime_stat, created = CrimeStatistic.objects.update_or_create(
                            date=datetime(year, 1, 1),
                            district=district,
                            agency=agency,
                            defaults={
                                'count': avg_count_per_district,
                                'violent_count': avg_violent_per_district,
                                'property_damage': 0,
                                'arrests': 0
                            }
                        )
                        if created:
                            stats_records_created += 1
                        else:
                            stats_records_updated += 1

                        ImportLog.objects.create(
                            import_job=import_job,
                            crime=None,
                            external_id=f"crime_stat_{year}_{district.code}",
                            source_data=source_data,
                            transformed_data=transformed_data,
                            status='success',
                            message='Crime statistic imported successfully'
                        )
                    except Exception as e:
                        stats_records_failed += 1
                        stats_errors.append(str(e))
                        ImportLog.objects.create(
                            import_job=import_job,
                            crime=None,
                            external_id=f"crime_stat_{year}_{district.code}",
                            source_data=source_data,
                            transformed_data=transformed_data,
                            status='failed',
                            message='Failed to import crime statistic',
                            errors=[str(e)]
                        )

            # Generate sample crime incidents based on statistics
            crime_records_processed = 0
            crime_records_created = 0
            crime_records_failed = 0
            crime_errors = []
            categories = CrimeCategory.objects.all()

            for stat in crime_stats:
                year = stat['year']
                for district in districts:
                    for crime_index in range(random.randint(10, 20)):
                        crime_records_processed += 1
                        category = random.choice(categories)
                        # Generate a unique case_number using district code and index
                        base_case_number = f"CR-{year}-{district.code}-{crime_index:04d}"
                        case_number = base_case_number
                        attempt = 0
                        max_attempts = 10

                        while attempt < max_attempts:
                            try:
                                # Check if case_number already exists
                                if not Crime.objects.filter(case_number=case_number).exists():
                                    break
                                # If it exists, append a UUID fragment to ensure uniqueness
                                case_number = f"{base_case_number}-{uuid.uuid4().hex[:8]}"
                                attempt += 1
                            except Exception as e:
                                break

                        if attempt == max_attempts:
                            crime_records_failed += 1
                            crime_errors.append(f"Could not generate unique case_number for {base_case_number}")
                            continue

                        source_data = {
                            'case_number': case_number,
                            'category': category.name,
                            'year': year,
                            'district': district.name
                        }
                        transformed_data = source_data.copy()
                        transformed_data['location'] = str(district.location)

                        try:
                            crime = Crime.objects.create(
                                case_number=case_number,
                                category=category,
                                description=f"Incident of {category.name} in {district.name}",
                                date=datetime(year, random.randint(1, 12), random.randint(1, 28)),
                                time=datetime(year, 1, 1, random.randint(0, 23), random.randint(0, 59)).time(),
                                status='reported',
                                location=district.location,
                                block_address=f"{district.name} Block {random.randint(1, 100)}",
                                district=district,
                                agency=agency,
                                is_violent=category.severity_level >= 7,
                                property_loss=random.uniform(0, 5000) if category.severity_level < 7 else None,
                                data_source='National Police Records'
                            )
                            crime_records_created += 1

                            ImportLog.objects.create(
                                import_job=import_job,
                                crime=crime,
                                external_id=f"crime_{case_number}",
                                source_data=source_data,
                                transformed_data=transformed_data,
                                status='success',
                                message='Crime imported successfully'
                            )
                        except Exception as e:
                            crime_records_failed += 1
                            crime_errors.append(str(e))
                            ImportLog.objects.create(
                                import_job=import_job,
                                crime=None,
                                external_id=f"crime_{case_number}",
                                source_data=source_data,
                                transformed_data=transformed_data,
                                status='failed',
                                message='Failed to import crime',
                                errors=[str(e)]
                            )

            # Update import job stats
            import_job.records_processed = (district_records_processed +
                                          stats_records_processed +
                                          crime_records_processed)
            import_job.records_created = (district_records_created +
                                        stats_records_created +
                                        crime_records_created)
            import_job.records_updated = district_records_updated + stats_records_updated
            import_job.records_failed = (district_records_failed +
                                       stats_records_failed +
                                       crime_records_failed)
            import_job.status = 'completed'
            import_job.completed_at = timezone.now()
            if district_errors or stats_errors or crime_errors:
                import_job.error_message = 'Some records failed to import'
                import_job.error_details = district_errors + stats_errors + crime_errors
            import_job.save()

            self.stdout.write(self.style.SUCCESS(
                f"Import job completed: {import_job.records_created} created, "
                f"{import_job.records_updated} updated, {import_job.records_failed} failed"
            ))

        except Exception as e:
            import_job.status = 'failed'
            import_job.error_message = str(e)
            import_job.completed_at = timezone.now()
            import_job.save()
            self.stderr.write(self.style.ERROR(f"Import job failed: {str(e)}"))