"""
URL configuration for crime_reports app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .import views

router = DefaultRouter()
router.register('reports', views.ReportViewSet, basename='report')
router.register('templates', views.ReportTemplateViewSet, basename='template')
router.register('scheduled', views.ScheduledReportViewSet, basename='scheduled')
router.register('analyses', views.SavedAnalysisViewSet, basename='analysis')

urlpatterns = [
    path('', include(router.urls)),
    # For future custom non-ViewSet endpoints
]