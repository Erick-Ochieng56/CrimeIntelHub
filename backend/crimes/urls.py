"""
URL configuration for crimes app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'crimes', views.CrimeViewSet, basename='crimes')
router.register(r'categories', views.CrimeCategoryViewSet, basename='categories')
router.register(r'districts', views.DistrictViewSet, basename='districts')
router.register(r'neighborhoods', views.NeighborhoodViewSet,basename='neighborhoods')
router.register(r'statistics', views.CrimeStatisticViewSet, basename='statistics')

urlpatterns = [
    path('', include(router.urls)),
    path('trends/', views.CrimeViewSet.as_view({'get': 'trends'}), name='crime-trends'),
]