"""
URL configuration for agencies app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'agencies', views.AgencyViewSet)

urlpatterns = [
    path('', include(router.urls)),
]