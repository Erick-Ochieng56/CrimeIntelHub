"""
Settings for running the test suite.

Usage (needs a reachable PostGIS server; Redis is not needed):
    python manage.py test --settings=crime_analysis.test_settings
"""
from .settings import *  # noqa: F401,F403

# Keep tests independent of Redis
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Faster password hashing and captured outgoing mail
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
