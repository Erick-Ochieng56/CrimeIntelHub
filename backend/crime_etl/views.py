"""
Views for the crime_etl app.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from django.db import transaction
from django.http import FileResponse
from django.utils.text import get_valid_filename
import logging
import os
import uuid
from .models import DataSource, ImportJob, ExportJob, DataTransformation, ImportLog, ScheduledImport
from .serializers import (
    DataSourceSerializer, ImportJobSerializer, ExportJobSerializer,
    DataTransformationSerializer, ImportLogSerializer, ScheduledImportSerializer
)
from accounts.permissions import IsAgencyUser
from rest_framework.permissions import IsAuthenticated
from .importer import test_source_connection
from .tasks import queue_import_job, start_scheduled_import

logger = logging.getLogger(__name__)


def _check_source_agency(serializer, user):
    """Refuse a data_source that belongs to another agency."""
    source = serializer.validated_data.get('data_source')
    if source is not None and source.created_by.agency_id != user.agency_id:
        raise PermissionDenied('Invalid data source for your agency')


def save_import_upload(upload, agency_id):
    """Store an uploaded import file under MEDIA_ROOT/imports/<agency>/ and return its relative path."""
    folder = os.path.join('imports', str(agency_id))
    os.makedirs(os.path.join(settings.MEDIA_ROOT, folder), exist_ok=True)
    name = f"{uuid.uuid4().hex}_{get_valid_filename(os.path.basename(upload.name))[:100]}"
    relative = os.path.join(folder, name)
    with open(os.path.join(settings.MEDIA_ROOT, relative), 'wb') as handle:
        for chunk in upload.chunks():
            handle.write(chunk)
    return relative

class DataSourceViewSet(viewsets.ModelViewSet):
    """API endpoint for data sources."""
    serializer_class = DataSourceSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['source_type', 'is_active']
    search_fields = ['name', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DataSource.objects.none()
        """Return data sources for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return DataSource.objects.filter(created_by__agency=user.agency)
        return DataSource.objects.none()

    def perform_create(self, serializer):
        """Create a new data source for the current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test the connection to a data source (fetches API sources once)."""
        source = self.get_object()
        ok, message = test_source_connection(source)
        return Response(
            {"success": ok, "detail": message},
            status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
        )

class ImportJobViewSet(viewsets.ModelViewSet):
    """API endpoint for import jobs."""
    serializer_class = ImportJobSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'data_source']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ImportJob.objects.none()
        """Return import jobs for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return ImportJob.objects.filter(created_by__agency=user.agency)
        return ImportJob.objects.none()

    def create(self, request, *args, **kwargs):
        """Create the job and queue it; answers 202 right away with the job id."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED, headers=headers)

    def perform_create(self, serializer):
        """Create a new import job for the current user and queue it on the worker."""
        user = self.request.user
        data_source = serializer.validated_data.get('data_source')
        if data_source and data_source.created_by.agency != user.agency:
            # perform_create return values are ignored by DRF, so raise instead
            raise PermissionDenied('Invalid data source for your agency')
        upload = serializer.validated_data.pop('file', None)
        file_path = save_import_upload(upload, user.agency_id) if upload else None
        job = serializer.save(created_by=user, file_path=file_path, status='pending')
        transaction.on_commit(lambda: queue_import_job(job))

    def perform_destroy(self, instance):
        if instance.status == 'processing':
            raise PermissionDenied('Cancel the import before deleting it.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an import job."""
        import_job = self.get_object()
        if import_job.status in ['pending', 'processing']:
            import_job.status = 'canceled'
            import_job.save(update_fields=['status'])
            # A running import notices the status change and stops; a queued one
            # is revoked so the worker skips it.
            if import_job.task_id:
                try:
                    from crime_analysis.celery import app
                    app.control.revoke(import_job.task_id)
                except Exception:
                    logger.warning('Could not revoke task %s', import_job.task_id)
            return Response({"detail": "Import job canceled."})
        return Response(
            {"detail": f"Cannot cancel job with status '{import_job.status}'."},
            status=status.HTTP_400_BAD_REQUEST
        )

class ExportJobViewSet(viewsets.ModelViewSet):
    """API endpoint for export jobs."""
    serializer_class = ExportJobSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'format']
    search_fields = ['name']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ExportJob.objects.none()
        """Return export jobs for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return ExportJob.objects.filter(created_by__agency=user.agency)
        return ExportJob.objects.none()

    def perform_create(self, serializer):
        """Create a new export job for the current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the export file."""
        export_job = self.get_object()
        
        if not export_job.file_path or not os.path.exists(export_job.file_path):
            return Response(
                {"detail": "Export file not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if export_job.status != 'completed':
            return Response(
                {"detail": f"Export is not ready for download (status: {export_job.status})."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return FileResponse(
            open(export_job.file_path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(export_job.file_path)
        )

class DataTransformationViewSet(viewsets.ModelViewSet):
    """API endpoint for data transformations."""
    serializer_class = DataTransformationSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transformation_type', 'is_active', 'data_source']
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'created_at']
    ordering = ['order', 'name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DataTransformation.objects.none()
        """Return transformations for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return DataTransformation.objects.filter(created_by__agency=user.agency)
        return DataTransformation.objects.none()

    def perform_create(self, serializer):
        """Create a new transformation for the current user."""
        _check_source_agency(serializer, self.request.user)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        _check_source_agency(serializer, self.request.user)
        serializer.save()

class ImportLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for import logs."""
    serializer_class = ImportLogSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'import_job']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ImportLog.objects.none()
        """Return import logs for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return ImportLog.objects.filter(import_job__created_by__agency=user.agency).select_related('import_job')
        return ImportLog.objects.none()

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent import logs for the agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            logs = ImportLog.objects.filter(
                import_job__created_by__agency=user.agency
            ).select_related('import_job').order_by('-created_at')[:5]
            serializer = ImportLogSerializer(logs, many=True)
            return Response(serializer.data)
        return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

class ScheduledImportViewSet(viewsets.ModelViewSet):
    """API endpoint for scheduled imports."""
    serializer_class = ScheduledImportSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['frequency', 'is_active', 'data_source']
    search_fields = ['name', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ScheduledImport.objects.none()
        """Return scheduled imports for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return ScheduledImport.objects.filter(created_by__agency=user.agency)
        return ScheduledImport.objects.none()

    def perform_create(self, serializer):
        """Create a new scheduled import for the current user."""
        _check_source_agency(serializer, self.request.user)
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        _check_source_agency(serializer, self.request.user)
        serializer.save()

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Queue a scheduled import now. Returns the new import job (202)."""
        schedule = self.get_object()
        if not schedule.data_source.is_active:
            return Response(
                {"detail": "The data source for this schedule is inactive."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        job = start_scheduled_import(schedule)
        return Response(
            {"detail": "Import queued.", "import_job": ImportJobSerializer(job).data},
            status=status.HTTP_202_ACCEPTED,
        )