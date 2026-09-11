from django.core.management.base import BaseCommand
from crime_analytics.ml_service import CrimePredictor, default_model_path


class Command(BaseCommand):
    help = 'Train the unified crime prediction model (same features used by predict API)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model-path',
            type=str,
            default=None,
            help='Optional override path for the joblib artifact',
        )
        parser.add_argument(
            '--hotspots',
            type=int,
            default=10,
            help='Number of KMeans hotspot centers',
        )

    def handle(self, *args, **options):
        path = options['model_path'] or default_model_path()
        self.stdout.write(f'Training crime predictor → {path}')
        predictor = CrimePredictor(model_path=path, n_hotspots=options['hotspots'])
        metrics = predictor.train()
        self.stdout.write(self.style.SUCCESS(
            f"Trained v{metrics['version']}: accuracy={metrics['accuracy'] * 100:.2f}% "
            f"(train={metrics['n_train']}, test={metrics['n_test']})"
        ))
        if 'roc_auc' in metrics:
            self.stdout.write(f"ROC-AUC: {metrics['roc_auc']:.3f}")
        self.stdout.write(f'Model saved to {path}')
