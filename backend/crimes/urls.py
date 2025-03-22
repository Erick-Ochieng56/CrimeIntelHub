"""
URL configuration for crimes app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'crimes', views.CrimeViewSet)
router.register(r'categories', views.CrimeCategoryViewSet)
router.register(r'districts', views.DistrictViewSet)
router.register(r'neighborhoods', views.NeighborhoodViewSet)
router.register(r'statistics', views.CrimeStatisticViewSet)

urlpatterns = [
    path('', include(router.urls)),
]