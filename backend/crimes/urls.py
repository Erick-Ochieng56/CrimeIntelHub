from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'crimes'

# Secondary resources only — crime list lives at /api/crimes/ (not /api/crimes/crimes/)
router = DefaultRouter()
router.register(r'categories', views.CrimeCategoryViewSet, basename='categories')
router.register(r'districts', views.DistrictViewSet, basename='districts')
router.register(r'neighborhoods', views.NeighborhoodViewSet, basename='neighborhoods')
router.register(r'statistics', views.CrimeStatisticViewSet, basename='statistics')
router.register(r'media', views.CrimeMediaViewSet, basename='media')
router.register(r'notes', views.CrimeNoteViewSet, basename='notes')

crime_list = views.CrimeViewSet.as_view({
    'get': 'list',
    'post': 'create',
})
crime_detail = views.CrimeViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns = [
    # Explicit action aliases (stable paths for the frontend)
    path('public/', views.public_crimes, name='public-crimes'),
    path('stats/', views.CrimeViewSet.as_view({'get': 'stats'}), name='crime-stats'),
    path('trends/', views.CrimeViewSet.as_view({'get': 'trends'}), name='crime-trends'),
    path('heatmap/', views.CrimeViewSet.as_view({'get': 'heatmap'}), name='crime-heatmap'),
    path('search/', views.CrimeViewSet.as_view({'post': 'search'}), name='crime-search'),
    path('download_summary/', views.CrimeViewSet.as_view({'get': 'download_summary'}), name='crime-download-summary'),
    path('map_data/', views.CrimeViewSet.as_view({'get': 'map_data'}), name='crime-map-data'),
    path('viewport/', views.CrimeViewSet.as_view({'get': 'viewport'}), name='crime-viewport'),
    # Primary crime CRUD at /api/crimes/ and /api/crimes/<pk>/
    path('', crime_list, name='crime-list'),
    path('<int:pk>/', crime_detail, name='crime-detail'),
    # Nested routers: /api/crimes/categories/, districts/, etc.
    path('', include(router.urls)),
]
