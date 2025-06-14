from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'crimes'

router = DefaultRouter()
router.register(r'crimes', views.CrimeViewSet, basename='crimes')
router.register(r'categories', views.CrimeCategoryViewSet, basename='categories')
router.register(r'districts', views.DistrictViewSet, basename='districts')
router.register(r'neighborhoods', views.NeighborhoodViewSet, basename='neighborhoods')
router.register(r'statistics', views.CrimeStatisticViewSet, basename='statistics')
router.register(r'media', views.CrimeMediaViewSet, basename='media')
router.register(r'notes', views.CrimeNoteViewSet, basename='notes')

urlpatterns = [
    path('', include(router.urls)),
    path('public/', views.public_crimes, name='public-crimes'),
    path('stats/', views.CrimeViewSet.as_view({'get': 'stats'}), name='crime-stats'),
    path('trends/', views.CrimeViewSet.as_view({'get': 'trends'}), name='crime-trends'),
]