"""
URL configuration for maps app.
"""
from django.urls import path
from . import views

app_name = 'maps'

urlpatterns = [
    path('layers/', views.map_layers, name='map-layers'),
]
