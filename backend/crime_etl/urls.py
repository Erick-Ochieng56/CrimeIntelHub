"""
URL configuration for crime_etl app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('datasources', views.DataSourceViewSet, basename='datasource')
router.register('imports', views.ImportJobViewSet, basename='import')
router.register('exports', views.ExportJobViewSet, basename='export')
router.register('transformations', views.DataTransformationViewSet, basename='transformation')
router.register('logs', views.ImportLogViewSet, basename='log')
router.register('schedules', views.ScheduledImportViewSet, basename='schedule')

urlpatterns = [
    path('', include(router.urls)),
    # For future custom non-ViewSet endpoints
]