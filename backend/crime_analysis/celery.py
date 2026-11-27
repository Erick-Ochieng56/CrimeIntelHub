"""
Celery application for background work (ETL imports, alert notifications).

Start a worker with:
    celery -A crime_analysis worker -l info
and the scheduler (scheduled imports, notification digests) with:
    celery -A crime_analysis beat -l info
"""
import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crime_analysis.settings')

app = Celery('crime_analysis')

# All Celery settings live in Django settings with a CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Finds tasks.py in every installed app
app.autodiscover_tasks()
