"""Celery tasks for crime_etl: run imports in the background."""
import calendar
import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .importer import run_import
from .models import ImportJob, ScheduledImport

logger = logging.getLogger(__name__)


@shared_task(ignore_result=False)
def run_import_job(job_id):
    """Run one import job and return a short status summary."""
    job = run_import(job_id)
    return {
        'job_id': job.id,
        'status': job.status,
        'records_processed': job.records_processed,
        'records_failed': job.records_failed,
    }


def queue_import_job(job):
    """Queue an ImportJob on the worker and remember the Celery task id."""
    result = run_import_job.apply_async(args=[job.id])
    ImportJob.objects.filter(pk=job.pk).update(task_id=result.id or '')
    job.task_id = result.id or ''
    return result


def compute_next_run(schedule, after=None):
    """Next time a ScheduledImport should run, strictly after `after`."""
    after = timezone.localtime(after or timezone.now())
    run_time = schedule.time_of_day or after.time().replace(second=0, microsecond=0)

    if schedule.frequency == 'hourly':
        return after.replace(second=0, microsecond=0) + timedelta(hours=1)

    candidate = after.replace(hour=run_time.hour, minute=run_time.minute, second=0, microsecond=0)
    if schedule.frequency == 'daily':
        return candidate if candidate > after else candidate + timedelta(days=1)

    if schedule.frequency == 'weekly':
        weekday = ((schedule.day_of_week or 1) - 1) % 7  # model uses 1-7, Monday first
        candidate += timedelta(days=(weekday - candidate.weekday()) % 7)
        return candidate if candidate > after else candidate + timedelta(weeks=1)

    # monthly
    def on_day(year, month):
        day = min(schedule.day_of_month or 1, calendar.monthrange(year, month)[1])
        return candidate.replace(year=year, month=month, day=day)

    result = on_day(after.year, after.month)
    if result <= after:
        year, month = (after.year + 1, 1) if after.month == 12 else (after.year, after.month + 1)
        result = on_day(year, month)
    return result


def start_scheduled_import(schedule):
    """Create an ImportJob for a schedule and queue it. Returns the job."""
    job = ImportJob.objects.create(
        data_source=schedule.data_source,
        created_by=schedule.created_by,
        parameters={**(schedule.parameters or {}), 'scheduled_import_id': schedule.id},
        status='pending',
    )
    now = timezone.now()
    ScheduledImport.objects.filter(pk=schedule.pk).update(
        last_run=now, next_run=compute_next_run(schedule, now)
    )
    transaction.on_commit(lambda: queue_import_job(job))
    return job


@shared_task(ignore_result=True)
def run_due_scheduled_imports():
    """Beat task: start every active schedule whose next_run has passed."""
    now = timezone.now()
    started = 0
    for schedule in ScheduledImport.objects.filter(is_active=True, data_source__is_active=True):
        if schedule.next_run is None:
            # First sighting: plan it instead of running immediately
            ScheduledImport.objects.filter(pk=schedule.pk).update(
                next_run=compute_next_run(schedule, now)
            )
            continue
        if schedule.next_run <= now:
            try:
                start_scheduled_import(schedule)
                started += 1
            except Exception:
                logger.exception('Scheduled import %s failed to start', schedule.pk)
    return started
