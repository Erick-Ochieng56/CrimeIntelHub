"""
Views for the crime_etl app.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import FileResponse
import os
from .models import DataSource, ImportJob, ExportJob, DataTransformation, ImportLog, ScheduledImport
from .serializers import (
    DataSourceSerializer,
    ImportJobSerializer,
    ExportJobSerializer,
    DataTransformationSerializer,
    ImportLogSerializer,
    ScheduledImportSerializer
)
class DataSourceViewSet(viewsets.ModelViewSet):
    """API endpoint for data sources."""
    serializer_class = DataSourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['source_type', 'is_active']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DataSource.objects.none()
        """Return data sources for the current user."""
        return DataSource.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new data source for the current user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test the connection to a data source."""
        data_source = self.get_object()
        # Will implement connection testing logic later
        return Response({"detail": "Connection test successful."})

class ImportJobViewSet(viewsets.ModelViewSet):
    """API endpoint for import jobs."""
    serializer_class = ImportJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'data_source']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ImportJob.objects.none()
        """Return import jobs for the current user."""
        return ImportJob.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new import job for the current user."""
        serializer.save(created_by=self.request.user)
    
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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'format']
    search_fields = ['name']
    ordering_fields = ['created_at', 'started_at', 'completed_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ExportJob.objects.none()
        """Return export jobs for the current user."""
        return ExportJob.objects.filter(created_by=self.request.user)
    
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
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['transformation_type', 'is_active', 'data_source']
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'created_at']
    ordering = ['order', 'name']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return DataTransformation.objects.none()
        
        """Return transformations for the current user."""
        return DataTransformation.objects.filter(created_by=self.request.user)
    
    
    
    def perform_create(self, serializer):
        """Create a new transformation for the current user."""
        serializer.save(created_by=self.request.user)

class ImportLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for import logs."""
    serializer_class = ImportLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'import_job']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ImportLog.objects.none()
        """Return import logs for the current user's import jobs."""
        return ImportLog.objects.filter(import_job__created_by=self.request.user)

class ScheduledImportViewSet(viewsets.ModelViewSet):
    """API endpoint for scheduled imports."""
    serializer_class = ScheduledImportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['frequency', 'is_active', 'data_source']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ScheduledImport.objects.none()
        
        """Return scheduled imports for the current user."""
        return ScheduledImport.objects.filter(created_by=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new scheduled import for the current user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Run a scheduled import immediately."""
        scheduled_import = self.get_object()
        # Will implement import logic later
        return Response({"detail": "Import has been queued."})