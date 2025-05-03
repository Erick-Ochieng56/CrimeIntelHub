"""
URL configuration for agencies app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgencyViewSet, AdminAgencyViewSet, AgencyContactViewSet

router = DefaultRouter()
router.register(r'agencies', AgencyViewSet, basename='agency')
router.register(r'admin-agencies', AdminAgencyViewSet, basename='admin-agency')
router.register(r'contacts', AgencyContactViewSet, basename='agency-contact')

app_name = 'agencies'

urlpatterns = [
    path('', include(router.urls)),
]