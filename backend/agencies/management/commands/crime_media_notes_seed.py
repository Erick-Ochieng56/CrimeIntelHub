from django.core.management.base import BaseCommand
from crimes.models import Crime, CrimeMedia, CrimeNote
import random

class Command(BaseCommand):
    help = 'Seed initial crime media and notes'

    def handle(self, *args, **options):
        crimes = Crime.objects.all()
        if not crimes.exists():
            self.stderr.write("No crimes found. Please seed crimes first.")
            return

        # Seed media for 20% of crimes
        media_count = 0
        for crime in random.sample(list(crimes), int(len(crimes) * 0.2)):
            media, created = CrimeMedia.objects.update_or_create(
                crime=crime,
                file_type=random.choice(['image', 'video', 'document']),
                file_path=f"media/{crime.case_number}_{random.randint(1, 3)}.{random.choice(['jpg', 'mp4', 'pdf'])}",
                defaults={'description': f"Evidence for {crime.case_number}"}
            )
            if created:
                media_count += 1
                self.stdout.write(f"Created media for {crime.case_number}")

        # Seed notes for 30% of crimes
        note_count = 0
        for crime in random.sample(list(crimes), int(len(crimes) * 0.3)):
            note, created = CrimeNote.objects.update_or_create(
                crime=crime,
                content=f"Investigation note for {crime.case_number}: {random.choice(['Suspect identified', 'Witness interviewed', 'Case pending'])}",
                author=f"Officer_{random.randint(1, 10)}",
            )
            if created:
                note_count += 1
                self.stdout.write(f"Created note for {crime.case_number}")

        self.stdout.write(self.style.SUCCESS(f"Successfully created {media_count} media and {note_count} notes"))