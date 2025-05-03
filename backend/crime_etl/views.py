"""
Views for the crime_etl app.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import FileResponse
import os
from .models import DataSource, ImportJob, ExportJob, DataTransformation, ImportLog, ScheduledImport
from .serializers import (
    DataSourceSerializer, ImportJobSerializer, ExportJobSerializer,
    DataTransformationSerializer, ImportLogSerializer, ScheduledImportSerializer
)
from accounts.permissions import IsAgencyUser
from rest_framework.permissions import IsAuthenticated

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
        """Test the connection to a data source."""
        data_source = self.get_object()
        return Response({"detail": "Connection test successful."})

class ImportJobViewSet(viewsets.ModelViewSet):
    """API endpoint for import jobs."""
    serializer_class = ImportJobSerializer
    permission_classes = [IsAuthenticated, IsAgencyUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'data_source']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ImportJob.objects.none()
        """Return import jobs for the user's agency."""
        user = self.request.user
        if user.is_authenticated and user.user_type == 'agency' and user.agency:
            return ImportJob.objects.filter(created_by__agency=user.agency)
        return ImportJob.objects.none()

    def perform_create(self, serializer):
        """Create a new import job for the current user."""
        user = self.request.user
        data_source = serializer.validated_data.get('data_source')
        if data_source and data_source.created_by.agency != user.agency:
            return Response({'error': 'Invalid data source for your agency'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save(created_by=user, started_at=timezone.now())

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an import job."""
        import_job = self.get_object()
        if import_job.status in ['pending', 'processing']:
            import_job.status = 'canceled'
            import_job.save()
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
        serializer.save(created_by=self.request.user)

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
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Run a scheduled import immediately."""
        scheduled_import = self.get_object()
        return Response({"detail": "Import has been queued."})