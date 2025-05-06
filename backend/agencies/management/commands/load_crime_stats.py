from django.core.management.base import BaseCommand
from crimes.models import CrimeStatistic, District
from agencies.models import Agency
from datetime import datetime

class Command(BaseCommand):
    help = 'Load crime statistics data into the CrimeStatistic model'

    # Crime data extracted from the image
    CRIME_DATA = [
        {
            'year': 2017,
            'total': 77986,
            'homicide': 2751,
            'offenses': 6228,
            'robbery': 22295,
            'other_offenses': 2697,
            'breakings': 5621,
            'theft_of_st': 1918,
            'stealing': 10361,
            'theft_by_se': 240,
            'theft_of_ve': 1355,
            'dangerous': 6160,
            'traffic': 139,
            'economic': 4300,
            'criminal': 3503,
            'units': 92,
            'corruption': 57,
            'offenses_i': 15,
            'other_penal': 7047
        },
        {
            'year': 2018,
            'total': 88268,
            'homicide': 2856,
            'offenses': 7233,
            'robbery': 25049,
            'other_offenses': 2935,
            'breakings': 5970,
            'theft_of_st': 2077,
            'stealing': 12845,
            'theft_by_se': 2477,
            'theft_of_ve': 1370,
            'dangerous': 8021,
            'traffic': 213,
            'economic': 4783,
            'criminal': 4100,
            'units': 119,
            'corruption': 174,
            'offenses_i': 93,
            'other_penal': 7953
        },
        {
            'year': 2019,
            'total': 93411,
            'homicide': 2971,
            'offenses': 8051,
            'robbery': 27196,
            'other_offenses': 2858,
            'breakings': 5976,
            'theft_of_st': 1962,
            'stealing': 13954,
            'theft_by_se': 2226,
            'theft_of_ve': 1298,
            'dangerous': 8011,
            'traffic': 341,
            'economic': 4852,
            'criminal': 4786,
            'units': 130,
            'corruption': 77,
            'offenses_i': 48,
            'other_penal': 8674
        },
        {
            'year': 2020,
            'total': 69645,
            'homicide': 3111,
            'offenses': 9153,
            'robbery': 19288,
            'other_offenses': 2384,
            'breakings': 4252,
            'theft_of_st': 1556,
            'stealing': 8709,
            'theft_by_se': 1467,
            'theft_of_ve': 1031,
            'dangerous': 4477,
            'traffic': 186,
            'economic': 3530,
            'criminal': 3488,
            'units': 133,
            'corruption': 64,
            'offenses_i': 26,
            'other_penal': 6790
        },
    ]

    def handle(self, *args, **options):
        # Get the agency (ID=1, "National Police")
        try:
            agency = Agency.objects.get(id=1)
        except Agency.DoesNotExist:
            self.stderr.write("Agency with ID 1 does not exist. Please create the 'National Police' agency first.")
            return

        # Get all districts
        districts = District.objects.all()
        if not districts.exists():
            self.stderr.write("No districts found. Please load district data first.")
            return

        created_count = 0

        for year_data in self.CRIME_DATA:
            year = year_data['year']
            total_count = year_data['total']
            violent_count = year_data['homicide'] + year_data['offenses']  # Proxy for violent crimes

            # Distribute data across all districts
            districts_per_year = len(districts)
            avg_count_per_district = total_count // districts_per_year
            avg_violent_per_district = violent_count // districts_per_year

            for district in districts:
                # Create CrimeStatistic for each district and year
                stat, created = CrimeStatistic.objects.update_or_create(
                    date=datetime(year, 1, 1),
                    district=district,
                    agency=agency,
                    defaults={
                        'count': avg_count_per_district,
                        'violent_count': avg_violent_per_district,
                        'property_damage': 0,  # No monetary data provided
                        'arrests': 0,  # No arrest data provided
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(
                        f"Created CrimeStatistic for {district.name} in {year}"
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully loaded {created_count} CrimeStatistic entries."
            )
        )