"""
URL configuration for crime_reports app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .import views

app_name = 'crime_reports'

router = DefaultRouter()
router.register('reports', views.ReportViewSet, basename='report')
router.register('templates', views.ReportTemplateViewSet, basename='template')
router.register('scheduled', views.ScheduledReportViewSet, basename='scheduled')
router.register('analyses', views.SavedAnalysisViewSet, basename='analysis')
router.register('sections', views.ReportSectionViewSet, basename='section')

urlpatterns = [
    path('', include(router.urls)),
]