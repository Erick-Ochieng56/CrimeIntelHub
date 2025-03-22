"""
Views for the crime_reports app.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import FileResponse
import os

from accounts import serializers
from .models import Report, ReportTemplate, ScheduledReport, ReportSection, SavedAnalysis
from .serializers import (
    ReportSectionSerializer,
    ReportSerializer, 
    ReportTemplateSerializer, 
    ScheduledReportSerializer, 
    SavedAnalysisSerializer,
    
)

class ReportViewSet(viewsets.ModelViewSet):
    """API endpoint for reports."""
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report_type', 'status', 'format']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'completed_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            # queryset just for schema generation metadata
            return Report.objects.none()
        if self.request.user.is_superuser:
            return Report.objects.all()
        """Return reports for the current user."""
        return Report.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new report for the current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the report file."""
        report = self.get_object()
        
        if not report.file_path or not os.path.exists(report.file_path):
            return Response(
                {"detail": "Report file not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if report.status != 'completed':
            return Response(
                {"detail": f"Report is not ready for download (status: {report.status})."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return FileResponse(
            open(report.file_path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(report.file_path)
        )

class ReportTemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for report templates."""
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['report_type', 'is_default', 'is_public']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            # queryset just for schema generation metadata
            return ReportTemplate.objects.none()
        
        if self.request.user.is_superuser:
            return ReportTemplate.objects.all()
        """Return templates for the current user or public templates."""
        return ReportTemplate.objects.filter(
            created_by=self.request.user
        ) | ReportTemplate.objects.filter(is_public=True)
    
    def perform_create(self, serializer):
        """Create a new template for the current user."""
        serializer.save(created_by=self.request.user)

class ScheduledReportViewSet(viewsets.ModelViewSet):
    """API endpoint for scheduled reports."""
    serializer_class = ScheduledReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['frequency', 'is_active']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            # queryset just for schema generation metadata
            return ScheduledReport.objects.none()
        
        if self.request.user.is_superuser:
            return ScheduledReport.objects.all()
        """Return scheduled reports for the current user."""
        return ScheduledReport.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new scheduled report for the current user."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Run a scheduled report immediately."""
        scheduled_report = self.get_object()
        # Will implement actual report generation later
        return Response({"detail": "Report generation has been queued."})

class SavedAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoint for saved analyses."""
    serializer_class = SavedAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['analysis_type', 'is_public']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        
        if getattr(self, 'swagger_fake_view', False):
            # queryset just for schema generation metadata
            return SavedAnalysis.objects.none()
        
        if self.request.user.is_superuser:
            return SavedAnalysis.objects.all()
        
        """Return analyses for the current user or public analyses."""
        return SavedAnalysis.objects.filter(
            user=self.request.user
        ) | SavedAnalysis.objects.filter(is_public=True)
    
    def perform_create(self, serializer):
        """Create a new analysis for the current user."""
        serializer.save(user=self.request.user)
        
        
class ReportSectionViewSet(viewsets.ModelViewSet):
    """API endpoint for report sections."""
    serializer_class = ReportSectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['report', 'section_type']
    search_fields = ['title', 'content']
    ordering_fields = ['order', 'created_at']
    ordering = ['order']
    
    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            # queryset just for schema generation metadata
            return ReportSection.objects.none()
        
        if self.request.user.is_superuser:
            return ReportSection.objects.all()
        """Return report sections that the current user has access to."""
        # Get sections from reports owned by the current user
        return ReportSection.objects.filter(report__user=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new report section."""
        # The report FK will be provided in the request data
        # We just need to validate that the user has access to that report
        report_id = self.request.data.get('report')
        if report_id:
            try:
                report = Report.objects.get(id=report_id, user=self.request.user)
                serializer.save()
            except Report.DoesNotExist:
                raise serializers.ValidationError({"report": "Report not found or you don't have access to it."})
        else:
            serializer.save()