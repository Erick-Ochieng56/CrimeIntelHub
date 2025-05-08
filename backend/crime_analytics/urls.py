"""
URL configuration for crime_analytics app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PredictionModelViewSet, HotspotZoneViewSet, CrimePredictionViewSet,
    PatternAnalysisViewSet, DemographicCorrelationViewSet, CrimeDataViewSet,
    predict_crime
)

app_name = 'crime_analytics'
# Define the router and register your viewsets
# with the appropriate base names.
router = DefaultRouter()
router.register(r'prediction-models', PredictionModelViewSet)
router.register(r'hotspots', HotspotZoneViewSet)
router.register(r'crime-predictions', CrimePredictionViewSet)
router.register(r'pattern-analysis', PatternAnalysisViewSet, basename='pattern-analysis')
router.register(r'demographic-correlations', DemographicCorrelationViewSet)
router.register(r'crime-data', CrimeDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('predict/', predict_crime, name='predict-crime'),
]