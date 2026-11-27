"""
Generic crime importer used by the Celery import task.

Supported sources:
- file: CSV or JSON at ImportJob.file_path (inside MEDIA_ROOT, usually an upload)
- api:  JSON fetched from DataSource.configuration["url"]

DataSource.mapping maps Crime fields to source columns, for example
{"case_number": "ref", "category": "offence", "date": "reported_on",
 "latitude": "lat", "longitude": "lng"}. A nested {"crimes": {...}} is also
accepted. Fields without a mapping are read from a column of the same name.
"""
import csv
import io
import json
import logging
import os
import urllib.request
from datetime import date, datetime, time as dt_time
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from crimes.models import Crime, CrimeCategory, District, Neighborhood

from .models import ImportJob, ImportLog

logger = logging.getLogger(__name__)

MAX_FETCH_BYTES = 20 * 1024 * 1024
FETCH_TIMEOUT = 30
CANCEL_CHECK_EVERY = 100

CRIME_FIELDS = (
    'case_number', 'external_id', 'category', 'description', 'date', 'time', 'status',
    'latitude', 'longitude', 'block_address', 'district', 'neighborhood',
    'weapon_used', 'weapon_type', 'drug_related', 'domestic', 'arrests_made',
    'gang_related', 'property_loss',
)
BOOL_FIELDS = ('weapon_used', 'drug_related', 'domestic', 'arrests_made', 'gang_related')
DATE_FORMATS = ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d')
TIME_FORMATS = ('%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M:%S %p')


class SourceError(Exception):
    """A problem that fails the whole job (bad source, unreadable file)."""


class RowError(Exception):
    """A problem with one record; the job continues."""


# ---------------------------------------------------------------- loading

def resolve_media_path(file_path):
    """Return an absolute path inside MEDIA_ROOT, refusing anything outside it."""
    if not file_path:
        raise SourceError('The import job has no file.')
    root = os.path.realpath(settings.MEDIA_ROOT)
    candidate = file_path if os.path.isabs(file_path) else os.path.join(root, file_path)
    candidate = os.path.realpath(candidate)
    if os.path.commonpath([root, candidate]) != root:
        raise SourceError('Import files must be inside the media directory.')
    if not os.path.isfile(candidate):
        raise SourceError(f'Import file not found: {os.path.basename(file_path)}')
    return candidate


def parse_records(raw_text, fmt, records_key=None):
    fmt = (fmt or '').lower()
    if fmt == 'json':
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise SourceError(f'Invalid JSON: {exc}') from exc
        if isinstance(data, dict):
            key = records_key or next(
                (k for k in ('results', 'records', 'data', 'crimes', 'features') if k in data), None
            )
            data = data.get(key, []) if key else [data]
        if not isinstance(data, list):
            raise SourceError('JSON must be a list of records.')
        records = []
        for item in data:
            if isinstance(item, dict) and item.get('type') == 'Feature':
                # GeoJSON feature: flatten properties and point coordinates
                flat = dict(item.get('properties') or {})
                coords = (item.get('geometry') or {}).get('coordinates') or []
                if len(coords) >= 2:
                    flat.setdefault('longitude', coords[0])
                    flat.setdefault('latitude', coords[1])
                item = flat
            if isinstance(item, dict):
                records.append(item)
        return records
    if fmt == 'csv':
        return list(csv.DictReader(io.StringIO(raw_text.lstrip('\ufeff'))))
    raise SourceError(f'Unsupported file format: {fmt or "unknown"} (use CSV or JSON).')


def fetch_url(url, headers=None):
    if not isinstance(url, str) or not url.lower().startswith(('http://', 'https://')):
        raise SourceError('Data source configuration needs an http(s) "url".')
    request = urllib.request.Request(url, headers={'Accept': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT) as response:  # noqa: S310
            body = response.read(MAX_FETCH_BYTES + 1)
            charset = response.headers.get_content_charset() or 'utf-8'
    except Exception as exc:
        raise SourceError(f'Could not fetch {url}: {exc}') from exc
    if len(body) > MAX_FETCH_BYTES:
        raise SourceError('Remote data is larger than 20 MB.')
    return body.decode(charset, errors='replace')


def load_records(job):
    source = job.data_source
    config = source.configuration or {}
    params = job.parameters or {}
    if job.file_path:
        path = resolve_media_path(job.file_path)
        fmt = params.get('format') or os.path.splitext(path)[1].lstrip('.')
        with open(path, encoding='utf-8-sig', errors='replace') as handle:
            return parse_records(handle.read(), fmt, params.get('records_key'))
    if source.source_type == 'api':
        text = fetch_url(config.get('url'), config.get('headers'))
        return parse_records(text, 'json', config.get('records_key') or params.get('records_key'))
    raise SourceError(
        f"Source type '{source.source_type}' needs an uploaded file for imports."
    )


def test_source_connection(source):
    """Check that a data source can be read. Returns (ok, message)."""
    config = source.configuration or {}
    if source.source_type == 'api':
        try:
            records = parse_records(
                fetch_url(config.get('url'), config.get('headers')), 'json', config.get('records_key')
            )
        except SourceError as exc:
            return False, str(exc)
        return True, f'Connection OK: {len(records)} record(s) available.'
    if source.source_type == 'file':
        return True, 'File sources are read from uploads; there is no remote connection to test.'
    return False, f"Connection testing is not supported for '{source.source_type}' sources."


# ---------------------------------------------------------------- mapping

def field_mapping(source):
    mapping = source.mapping or {}
    if isinstance(mapping.get('crimes'), dict):
        mapping = mapping['crimes']
    return {field: mapping.get(field, field) for field in CRIME_FIELDS if isinstance(mapping.get(field, field), str)}


def _blank(value):
    return value is None or (isinstance(value, str) and not value.strip())


def parse_date(value):
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = str(value).strip()
    try:
        return datetime.fromisoformat(text.replace('Z', '+00:00')).date()
    except ValueError:
        pass
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise RowError(f'Unrecognised date: {text}')


def parse_time(value):
    text = str(value).strip()
    try:
        return dt_time.fromisoformat(text)
    except ValueError:
        pass
    for fmt in TIME_FORMATS:
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            continue
    raise RowError(f'Unrecognised time: {text}')


def parse_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ('1', 'true', 'yes', 'y', 't')


def transform(record, mapping):
    """Map one source record to a dict of cleaned Crime values."""
    get = lambda field: record.get(mapping.get(field, field))  # noqa: E731
    out = {}

    case_number = get('case_number')
    external_id = get('external_id')
    if _blank(case_number) and _blank(external_id):
        raise RowError('Each record needs a case_number or external_id.')
    out['external_id'] = None if _blank(external_id) else str(external_id).strip()[:100]
    out['case_number'] = (
        str(case_number).strip() if not _blank(case_number) else f"EXT-{out['external_id']}"
    )[:50]

    category = get('category')
    if _blank(category):
        raise RowError('Missing category.')
    out['category'] = str(category).strip()

    if _blank(get('date')):
        raise RowError('Missing date.')
    out['date'] = parse_date(get('date'))
    if out['date'] > timezone.localdate():
        raise RowError('Crime date cannot be in the future.')
    out['time'] = None if _blank(get('time')) else parse_time(get('time'))

    lat, lng = get('latitude'), get('longitude')
    if not _blank(lat) and not _blank(lng):
        try:
            lat, lng = float(lat), float(lng)
        except (TypeError, ValueError) as exc:
            raise RowError('Latitude and longitude must be numbers.') from exc
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            raise RowError(f'Coordinates out of range: {lat}, {lng}')
        out['latitude'], out['longitude'] = lat, lng

    status = get('status')
    valid = {choice for choice, _ in Crime.STATUS_CHOICES}
    status = str(status).strip().lower().replace(' ', '_') if not _blank(status) else 'reported'
    out['status'] = status if status in valid else 'reported'

    out['description'] = '' if _blank(get('description')) else str(get('description'))
    out['block_address'] = (
        'Unknown' if _blank(get('block_address')) else str(get('block_address')).strip()
    )[:255]
    for field in ('district', 'neighborhood', 'weapon_type'):
        value = get(field)
        out[field] = None if _blank(value) else str(value).strip()
    for field in BOOL_FIELDS:
        value = get(field)
        out[field] = False if _blank(value) else parse_bool(value)
    loss = get('property_loss')
    if not _blank(loss):
        try:
            out['property_loss'] = Decimal(str(loss).replace(',', ''))
        except InvalidOperation as exc:
            raise RowError(f'Invalid property_loss: {loss}') from exc
        if out['property_loss'] < 0:
            raise RowError('Property loss cannot be negative.')
    return out


def _json_safe(values):
    return {k: (v.isoformat() if hasattr(v, 'isoformat') else str(v) if isinstance(v, Decimal) else v)
            for k, v in values.items()}


# ---------------------------------------------------------------- saving

def save_crime(values, job, agency):
    category = CrimeCategory.objects.filter(name__iexact=values['category']).first()
    if category is None:
        raise RowError(f"Unknown crime category: {values['category']}")
    district = neighborhood = None
    if values.get('district'):
        district = District.objects.filter(name__iexact=values['district']).first()
    if values.get('neighborhood'):
        neighborhood = Neighborhood.objects.filter(name__iexact=values['neighborhood']).first()

    source_name = job.data_source.name[:100]
    crime = None
    if values['external_id']:
        crime = Crime.objects.filter(external_id=values['external_id'], data_source=source_name).first()
    if crime is None:
        crime = Crime.objects.filter(case_number=values['case_number']).first()
        if crime is not None and crime.agency_id != agency.id:
            raise RowError(f"Case number {values['case_number']} belongs to another agency.")
    created = crime is None
    if created:
        crime = Crime(case_number=values['case_number'], agency=agency)

    crime.category = category
    crime.district = district
    crime.neighborhood = neighborhood
    crime.data_source = source_name
    crime.external_id = values['external_id']
    for field in ('description', 'date', 'time', 'status', 'block_address', 'weapon_type',
                  'property_loss', *BOOL_FIELDS):
        if field in values:
            setattr(crime, field, values[field])
    if 'latitude' in values:
        crime.location = Point(values['longitude'], values['latitude'], srid=4326)
    try:
        crime.clean()
        crime.save()
    except ValidationError as exc:
        raise RowError('; '.join(exc.messages)) from exc
    return crime, created


def run_import(job_id):
    """Run one ImportJob to completion. Returns the updated job."""
    job = ImportJob.objects.select_related('data_source', 'created_by__agency').get(pk=job_id)
    if job.status not in ('pending', 'processing'):
        return job  # canceled or already finished

    job.status = 'processing'
    job.started_at = job.started_at or timezone.now()
    job.save(update_fields=['status', 'started_at'])

    counts = {'processed': 0, 'created': 0, 'updated': 0, 'failed': 0}
    errors = []
    try:
        agency = job.created_by.agency
        if agency is None:
            raise SourceError('The user who created this import has no agency.')
        records = load_records(job)
        mapping = field_mapping(job.data_source)

        for index, record in enumerate(records, start=1):
            if index % CANCEL_CHECK_EVERY == 0:
                if ImportJob.objects.filter(pk=job.pk, status='canceled').exists():
                    break
            counts['processed'] += 1
            values = {}
            ref = str(record.get(mapping.get('external_id', 'external_id'))
                      or record.get(mapping.get('case_number', 'case_number')) or f'row-{index}')[:100]
            try:
                values = transform(record, mapping)
                with transaction.atomic():
                    crime, created = save_crime(values, job, agency)
                counts['created' if created else 'updated'] += 1
                ImportLog.objects.create(
                    import_job=job, crime=crime, external_id=ref,
                    source_data=_json_safe(record), transformed_data=_json_safe(values),
                    status='created' if created else 'updated',
                )
            except RowError as exc:
                counts['failed'] += 1
                if len(errors) < 100:
                    errors.append({'row': index, 'ref': ref, 'error': str(exc)})
                ImportLog.objects.create(
                    import_job=job, external_id=ref, source_data=_json_safe(record),
                    transformed_data=_json_safe(values), status='failed',
                    message=str(exc), errors=[str(exc)],
                )
    except SourceError as exc:
        job.status = 'failed'
        job.error_message = str(exc)
    except Exception as exc:  # unexpected: record and re-raise for the worker log
        logger.exception('Import job %s crashed', job.pk)
        job.status = 'failed'
        job.error_message = f'Unexpected error: {exc}'
        _finish(job, counts, errors)
        raise
    else:
        canceled = ImportJob.objects.filter(pk=job.pk, status='canceled').exists()
        if canceled:
            job.status = 'canceled'
        elif counts['processed'] and counts['failed'] == counts['processed']:
            job.status = 'failed'
            job.error_message = 'Every record failed. See error_details.'
        else:
            job.status = 'completed'
    _finish(job, counts, errors)
    return job


def _finish(job, counts, errors):
    job.records_processed = counts['processed']
    job.records_created = counts['created']
    job.records_updated = counts['updated']
    job.records_failed = counts['failed']
    job.error_details = errors
    job.completed_at = timezone.now()
    job.save(update_fields=[
        'status', 'error_message', 'records_processed', 'records_created',
        'records_updated', 'records_failed', 'error_details', 'completed_at',
    ])
