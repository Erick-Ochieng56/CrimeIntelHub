from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from crime_analytics.management.commands.predict import CrimePredictor
from crime_analytics.models import CrimePrediction, PredictionModel, HotspotZone
from crimes.models import CrimeCategory, District, Neighborhood
from django.contrib.gis.geos import Point
from datetime import datetime, timedelta
import json


class Command(BaseCommand):
    help = 'Generate crime predictions for specified date range'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Prediction date (YYYY-MM-DD)',
            default=timezone.now().date().isoformat()
        )
        parser.add_argument(
            '--days-ahead',
            type=int,
            default=7,
            help='Number of days to generate predictions for'
        )
        parser.add_argument(
            '--crime-types',
            type=str,
            nargs='*',
            help='Specific crime types to predict (default: all)',
            default=None
        )

    def handle(self, *args, **options):
        predictor = CrimePredictor()
        prediction_date = datetime.fromisoformat(options['date']).date()
        days_ahead = options['days_ahead']

        self.stdout.write(f'Generating predictions for {days_ahead} days starting from {prediction_date}')

        # Get all crime categories or filter by specified types
        if options['crime_types']:
            crime_types = CrimeCategory.objects.filter(name__in=options['crime_types'])
        else:
            crime_types = CrimeCategory.objects.all()

        # Get active prediction model or create one
        prediction_model, created = PredictionModel.objects.get_or_create(
            name='Crime Predictor v1.0',
            defaults={
                'description': 'Random Forest based crime prediction model',
                'algorithm_type': 'Random Forest',
                'is_active': True,
                'version': '1.0'
            }
        )

        if created:
            self.stdout.write('Created new prediction model')

        total_predictions = 0

        # Generate predictions for each day
        for day_offset in range(days_ahead):
            current_date = prediction_date + timedelta(days=day_offset)

            for crime_type in crime_types:
                try:
                    self.stdout.write(f'Generating predictions for {crime_type.name} on {current_date}')

                    # Generate predictions for major urban areas
                    # This is a simplified approach - in production you'd use a grid or known hotspots
                    urban_centers = [
                        {'lat': -4.0435, 'lng': 39.6682, 'name': 'Mombasa CBD'},
                        {'lat': -1.2921, 'lng': 36.8219, 'name': 'Nairobi CBD'},
                        {'lat': -0.3031, 'lng': 36.0800, 'name': 'Nakuru CBD'},
                    ]

                    for center in urban_centers:
                        # Generate predictions for this location and crime type
                        predictions = predictor.predict(
                            lat=center['lat'],
                            lng=center['lng'],
                            date=current_date.isoformat(),
                            crime_type=crime_type.name
                        )

                        # Save predictions to database
                        for feature in predictions.get('features', []):
                            coords = feature['geometry']['coordinates']
                            properties = feature['properties']

                            # Create CrimePrediction record
                            prediction = CrimePrediction.objects.create(
                                location=Point(coords[0], coords[1], srid=4326),
                                crime_type=crime_type,
                                prediction_date=current_date,
                                confidence=properties['probability'] * 100,  # Convert to percentage
                                prediction_model=prediction_model,
                                features={
                                    'time_of_day': properties.get('time_of_day'),
                                    'factors': properties.get('factors', []),
                                    'radius': properties.get('radius', 300)
                                }
                            )

                            # Try to assign district/neighborhood
                            try:
                                # Find nearest district (simplified - in production use proper spatial queries)
                                district = District.objects.filter(
                                    agency__isnull=False
                                ).first()  # Just get first district for demo
                                if district:
                                    prediction.district = district
                                    prediction.save()
                            except:
                                pass

                            total_predictions += 1

                except Exception as e:
                    self.stderr.write(f'Error generating predictions for {crime_type.name}: {e}')
                    continue

        self.stdout.write(f'Successfully generated {total_predictions} crime predictions')
        self.stdout.write(f'Predictions available for date range: {prediction_date} to {prediction_date + timedelta(days=days_ahead-1)}')
