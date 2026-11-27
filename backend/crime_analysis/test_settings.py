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

# Celery tasks run inline during tests (no broker or worker needed)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = 'memory://localhost/'
CELERY_RESULT_BACKEND = 'cache+memory://'

# Uploaded import files go to a throwaway directory
import tempfile  # noqa: E402
MEDIA_ROOT = tempfile.mkdtemp(prefix='crimeintel-test-media-')

# WhiteNoise warns when STATIC_ROOT does not exist yet (no collectstatic in tests)
os.makedirs(STATIC_ROOT, exist_ok=True)  # noqa: F405
