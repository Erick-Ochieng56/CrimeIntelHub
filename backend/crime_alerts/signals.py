"""Queue alert matching whenever a new crime is saved."""
import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from crimes.models import Crime

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Crime, dispatch_uid='crime_alerts_match_new_crime')
def queue_alert_matching(sender, instance, created, raw=False, **kwargs):
    if not created or raw:
        return

    def dispatch():
        from .tasks import match_crime_alerts
        try:
            match_crime_alerts.delay(instance.pk)
        except Exception:
            # Broker down: still notify, inline, rather than lose the alert
            logger.exception('Could not queue alert matching; running inline')
            try:
                match_crime_alerts(instance.pk)
            except Exception:
                logger.exception('Alert matching failed for crime %s', instance.pk)

    transaction.on_commit(dispatch)
