"""
Django app configuration for agencies.
"""
from django.apps import AppConfig


class AgenciesConfig(AppConfig):
    """Configuration for the agencies app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'agencies'
    verbose_name = 'Law Enforcement Agencies'