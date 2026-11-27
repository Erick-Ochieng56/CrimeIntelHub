"""
Tests for background ETL imports (Celery runs eagerly in test settings).
"""
import json
from datetime import datetime, time, timedelta, timezone as dt_timezone
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from agencies.models import Agency
from crimes.models import Crime, CrimeCategory

from .importer import SourceError, resolve_media_path, run_import
from .models import DataSource, ImportJob, ImportLog, ScheduledImport
from .tasks import compute_next_run, run_due_scheduled_imports

User = get_user_model()
PASSWORD = 'Str0ng!Passw0rd'

CSV = (
    "ref,offence,reported_on,lat,lng,where\n"
    "KE-1,Theft,2024-03-01,-1.2864,36.8219,Moi Avenue\n"
    "KE-2,theft,02/03/2024,-1.30,36.80,Ngong Road\n"
    "KE-3,Unknown Thing,2024-03-03,-1.30,36.80,Somewhere\n"
)
MAPPING = {
    'case_number': 'ref', 'category': 'offence', 'date': 'reported_on',
    'latitude': 'lat', 'longitude': 'lng', 'block_address': 'where',
}


class EtlTestMixin:

    def setUp(self):
        self.agency = Agency.objects.create(name='Agency A')
        self.other_agency = Agency.objects.create(name='Agency B')
        CrimeCategory.objects.create(name='Theft', severity_level=4)
        self.user = User.objects.create_user(
            username='agent', email='agent@example.com', password=PASSWORD,
            user_type='agency', agency=self.agency,
        )
        self.other = User.objects.create_user(
            username='agent_b', email='b@example.com', password=PASSWORD,
            user_type='agency', agency=self.other_agency,
        )
        self.source = DataSource.objects.create(
            name='Uploads', source_type='file', mapping=MAPPING, created_by=self.user
        )

    def upload(self, content=CSV, name='crimes.csv'):
        return SimpleUploadedFile(name, content.encode(), content_type='text/csv')


class ImportApiTests(EtlTestMixin, APITestCase):

    def test_upload_returns_202_and_runs_in_background(self):
        self.client.force_authenticate(self.user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                '/api/etl/imports/', {'data_source': self.source.id, 'file': self.upload()},
                format='multipart',
            )
        self.assertEqual(response.status_code, 202, response.data)
        self.assertEqual(response.data['status'], 'pending')
        job = ImportJob.objects.get(pk=response.data['id'])
        self.assertEqual(job.status, 'completed')
        self.assertTrue(job.task_id)
        self.assertEqual(job.records_processed, 3)
        self.assertEqual(job.records_created, 2)
        self.assertEqual(job.records_failed, 1)
        self.assertIn('Unknown crime category', job.error_details[0]['error'])
        self.assertEqual(Crime.objects.filter(agency=self.agency).count(), 2)
        self.assertEqual(ImportLog.objects.filter(import_job=job).count(), 3)

        status_response = self.client.get(f'/api/etl/imports/{job.id}/')
        self.assertEqual(status_response.data['status'], 'completed')

    def test_reimport_updates_instead_of_duplicating(self):
        self.client.force_authenticate(self.user)
        for _ in range(2):
            with self.captureOnCommitCallbacks(execute=True):
                self.client.post(
                    '/api/etl/imports/', {'data_source': self.source.id, 'file': self.upload()},
                    format='multipart',
                )
        latest = ImportJob.objects.order_by('-id').first()
        self.assertEqual(latest.records_updated, 2)
        self.assertEqual(Crime.objects.count(), 2)

    def test_file_required_for_file_sources_and_type_checked(self):
        self.client.force_authenticate(self.user)
        response = self.client.post('/api/etl/imports/', {'data_source': self.source.id}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.post(
            '/api/etl/imports/',
            {'data_source': self.source.id, 'file': self.upload(name='evil.exe')},
            format='multipart',
        )
        self.assertEqual(response.status_code, 400)

    def test_client_cannot_set_file_path_or_status(self):
        self.client.force_authenticate(self.user)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                '/api/etl/imports/',
                {'data_source': self.source.id, 'file': self.upload(),
                 'file_path': '../../etc/passwd', 'status': 'completed'},
                format='multipart',
            )
        self.assertEqual(response.status_code, 202)
        job = ImportJob.objects.get(pk=response.data['id'])
        self.assertTrue(job.file_path.startswith('imports/'))

    def test_other_agency_source_is_rejected(self):
        self.client.force_authenticate(self.other)
        response = self.client.post(
            '/api/etl/imports/', {'data_source': self.source.id, 'file': self.upload()},
            format='multipart',
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(ImportJob.objects.exists())

    def test_cancel_pending_job(self):
        job = ImportJob.objects.create(data_source=self.source, created_by=self.user)
        self.client.force_authenticate(self.user)
        response = self.client.post(f'/api/etl/imports/{job.id}/cancel/')
        self.assertEqual(response.status_code, 200)
        job.refresh_from_db()
        self.assertEqual(job.status, 'canceled')
        # A canceled job is skipped by the worker
        self.assertEqual(run_import(job.id).status, 'canceled')

    def test_run_now_queues_scheduled_import(self):
        api_source = DataSource.objects.create(
            name='Feed', source_type='api', created_by=self.user, mapping=MAPPING,
            configuration={'url': 'https://feed.example.com/crimes.json'},
        )
        schedule = ScheduledImport.objects.create(
            name='Nightly', data_source=api_source, frequency='daily',
            time_of_day=time(2, 0), created_by=self.user,
        )
        payload = json.dumps({'results': [
            {'ref': 'API-1', 'offence': 'Theft', 'reported_on': '2024-05-01',
             'lat': -1.28, 'lng': 36.82, 'where': 'Kenyatta Avenue'},
        ]})
        self.client.force_authenticate(self.user)
        with mock.patch('crime_etl.importer.fetch_url', return_value=payload):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(f'/api/etl/schedules/{schedule.id}/run_now/')
        self.assertEqual(response.status_code, 202, response.data)
        job = ImportJob.objects.get(pk=response.data['import_job']['id'])
        self.assertEqual(job.status, 'completed')
        self.assertEqual(job.records_created, 1)
        schedule.refresh_from_db()
        self.assertIsNotNone(schedule.last_run)
        self.assertGreater(schedule.next_run, schedule.last_run)

    def test_connection_check_for_api_source(self):
        api_source = DataSource.objects.create(
            name='Feed', source_type='api', created_by=self.user,
            configuration={'url': 'https://feed.example.com/crimes.json'},
        )
        self.client.force_authenticate(self.user)
        with mock.patch('crime_etl.importer.fetch_url', return_value='[{"a": 1}, {"a": 2}]'):
            response = self.client.post(f'/api/etl/datasources/{api_source.id}/test_connection/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        with mock.patch('crime_etl.importer.fetch_url', side_effect=SourceError('timed out')):
            response = self.client.post(f'/api/etl/datasources/{api_source.id}/test_connection/')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data['success'])


class ImporterUnitTests(EtlTestMixin, TestCase):

    def test_media_path_must_stay_inside_media_root(self):
        with self.assertRaises(SourceError):
            resolve_media_path('../../etc/passwd')
        with self.assertRaises(SourceError):
            resolve_media_path('/etc/passwd')

    def test_future_dates_fail_the_row(self):
        future = (timezone.localdate() + timedelta(days=5)).isoformat()
        payload = json.dumps([{'ref': 'F-1', 'offence': 'Theft', 'reported_on': future}])
        api_source = DataSource.objects.create(
            name='Feed', source_type='api', created_by=self.user, mapping=MAPPING,
            configuration={'url': 'https://feed.example.com/x.json'},
        )
        job = ImportJob.objects.create(data_source=api_source, created_by=self.user)
        with mock.patch('crime_etl.importer.fetch_url', return_value=payload):
            job = run_import(job.id)
        self.assertEqual(job.status, 'failed')
        self.assertEqual(job.records_failed, 1)

    def test_due_schedules_are_started_by_beat(self):
        schedule = ScheduledImport.objects.create(
            name='Hourly', data_source=self.source, frequency='hourly', created_by=self.user,
        )
        run_due_scheduled_imports()  # first pass only plans next_run
        schedule.refresh_from_db()
        self.assertIsNotNone(schedule.next_run)
        self.assertFalse(ImportJob.objects.exists())

        ScheduledImport.objects.filter(pk=schedule.pk).update(
            next_run=timezone.now() - timedelta(minutes=1)
        )
        with self.captureOnCommitCallbacks(execute=True):
            run_due_scheduled_imports()
        job = ImportJob.objects.get()
        # File source with no upload: the job fails cleanly with a reason
        self.assertEqual(job.status, 'failed')
        self.assertIn('needs an uploaded file', job.error_message)

    def test_compute_next_run(self):
        base = datetime(2026, 1, 31, 10, 0, tzinfo=dt_timezone.utc)
        daily = ScheduledImport(frequency='daily', time_of_day=time(2, 0))
        self.assertEqual(compute_next_run(daily, base), base.replace(day=1, month=2, hour=2))
        weekly = ScheduledImport(frequency='weekly', time_of_day=time(9, 0), day_of_week=1)
        self.assertEqual(compute_next_run(weekly, base).weekday(), 0)
        monthly = ScheduledImport(frequency='monthly', time_of_day=time(9, 0), day_of_month=31)
        self.assertEqual(compute_next_run(monthly, base).date().isoformat(), '2026-02-28')
