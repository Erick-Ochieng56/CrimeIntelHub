from django.apps import AppConfig


class CrimeAlertsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'crime_alerts'

    def ready(self):
        from . import signals  # noqa: F401  (connects post_save on Crime)
