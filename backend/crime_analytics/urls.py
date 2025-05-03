"""
URL configuration for crime_analytics app.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .import views

app_name = 'crime_analytics'
# Define the router and register your viewsets
# with the appropriate base names.
router = DefaultRouter()
router.register('prediction-models', views.PredictionModelViewSet, basename='prediction-model')
router.register('hotspots', views.HotspotZoneViewSet, basename='hotspot')
router.register('predictions', views.CrimePredictionViewSet, basename='prediction')
router.register('patterns', views.PatternAnalysisViewSet, basename='pattern')
router.register('demographics', views.DemographicCorrelationViewSet, basename='demographic')

# In your urls.py
router.register(r'crime-predictions', views.CrimePredictionViewSet, basename='crime-predictions')
urlpatterns = [
    path('', include(router.urls)),
    # For future custom non-ViewSet endpoints
]