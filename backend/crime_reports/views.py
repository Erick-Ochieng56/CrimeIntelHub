"""
Views for the crime_reports app.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.http import FileResponse
import os

from .models import Report, ReportTemplate, ScheduledReport, ReportSection, SavedAnalysis
from .serializers import (
    ReportSectionSerializer,
    ReportSerializer,
    ReportTemplateSerializer,
    ScheduledReportSerializer,
    SavedAnalysisSerializer,
)
from .generation import create_report_from_params, content_type_for_format


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
            return Report.objects.none()
        if self.request.user.is_superuser:
            return Report.objects.all()
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

        filename = os.path.basename(report.file_path)
        response = FileResponse(
            open(report.file_path, 'rb'),
            as_attachment=True,
            filename=filename,
            content_type=content_type_for_format(report.format),
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get report history for the current user."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ReportTemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for report templates."""
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['report_type', 'is_default', 'is_public']
    search_fields = ['name', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ReportTemplate.objects.none()

        if self.request.user.is_superuser:
            return ReportTemplate.objects.all()
        return ReportTemplate.objects.filter(
            created_by=self.request.user
        ) | ReportTemplate.objects.filter(is_public=True)

    def perform_create(self, serializer):
        """Create a new template for the current user."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate a report from this template (sync)."""
        template = self.get_object()
        try:
            report = create_report_from_params(
                user=request.user,
                params=request.data,
                template=template,
            )
            return Response(
                ReportSerializer(report, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )
        except Exception as exc:
            return Response(
                {"detail": f"Report generation failed: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ScheduledReportViewSet(viewsets.ModelViewSet):
    """API endpoint for scheduled reports."""
    serializer_class = ScheduledReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['frequency', 'is_active']
    search_fields = ['name', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return ScheduledReport.objects.none()

        if self.request.user.is_superuser:
            return ScheduledReport.objects.all()
        return ScheduledReport.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create a new scheduled report for the current user."""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def run_now(self, request, pk=None):
        """Run a scheduled report immediately (synchronous generation)."""
        scheduled_report = self.get_object()
        override = scheduled_report.parameters_override or {}
        override = {**override, **(request.data or {})}
        override.setdefault('title', scheduled_report.name)

        try:
            report = create_report_from_params(
                user=request.user,
                params=override,
                template=scheduled_report.report_template,
            )
            scheduled_report.last_run = timezone.now()
            scheduled_report.save(update_fields=['last_run', 'updated_at'])
            return Response({
                "detail": "Report generated successfully.",
                "report": ReportSerializer(report, context={'request': request}).data,
            })
        except Exception as exc:
            return Response(
                {"detail": f"Report generation failed: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class SavedAnalysisViewSet(viewsets.ModelViewSet):
    """API endpoint for saved analyses."""
    serializer_class = SavedAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['analysis_type', 'is_public']
    search_fields = ['name', 'description']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return SavedAnalysis.objects.none()

        if self.request.user.is_superuser:
            return SavedAnalysis.objects.all()

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
            return ReportSection.objects.none()

        if self.request.user.is_superuser:
            return ReportSection.objects.all()
        return ReportSection.objects.filter(report__user=self.request.user)

    def perform_create(self, serializer):
        """Create a new report section."""
        report_id = self.request.data.get('report')
        if report_id:
            try:
                Report.objects.get(id=report_id, user=self.request.user)
                serializer.save()
            except Report.DoesNotExist:
                raise ValidationError(
                    {"report": "Report not found or you don't have access to it."}
                )
        else:
            serializer.save()
