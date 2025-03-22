"""
Django app configuration for crimes.
"""
from django.apps import AppConfig


class CrimesConfig(AppConfig):
    """Configuration for the crimes app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'crimes'
    verbose_name = 'Crime Data & Analysis'