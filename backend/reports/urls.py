from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReportViewSet, ReportTemplateViewSet, ScheduledReportViewSet,
    ReportGeneratorView, ReportPreviewView
)

router = DefaultRouter()
router.register(r'', ReportViewSet, basename='report')
router.register(r'templates', ReportTemplateViewSet, basename='report-template')
router.register(r'schedule', ScheduledReportViewSet, basename='scheduled-report')

urlpatterns = [
    path('', include(router.urls)),
    path('generate/', ReportGeneratorView.as_view(), name='report-generate'),
    path('preview/', ReportPreviewView.as_view(), name='report-preview'),
]
