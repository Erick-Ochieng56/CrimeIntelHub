"""
Django settings for crime_analysis project.
"""

import logging
import os
from pathlib import Path
from datetime import timedelta
import dotenv
from urllib.parse import urlparse

# Load environment variables from .env file
dotenv.load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is required")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# Production security settings
if not DEBUG:
    ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')
    if not ALLOWED_HOSTS or ALLOWED_HOSTS == ['']:
        raise ValueError("ALLOWED_HOSTS must be configured in production")
else:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',  # Geographic information system support
    
    # Third-party apps
    'rest_framework',
    'rest_framework_gis',  # GIS support for DRF
    'rest_framework_simplejwt',  # JWT authentication
    'rest_framework_simplejwt.token_blacklist',  # Refresh token blacklist on logout/rotate
    'django_filters',  # Filtering support
    'corsheaders',  # CORS handling
    'drf_yasg',  # API documentation
    
    # Project apps
    'accounts',
    'agencies',
    'crimes',
    'crime_analytics',
    'crime_alerts',
    'crime_reports',
    'crime_etl',
    'maps',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # CORS middleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'accounts.middleware.JWTAuthenticationMiddleware',
]

ROOT_URLCONF = 'crime_analysis.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'crime_analysis.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

# Validate required database environment variables
DB_NAME = os.environ.get('DB_NAME')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_HOST = os.environ.get('DB_HOST')
DB_PORT = os.environ.get('DB_PORT')

if not all([DB_NAME, DB_USER, DB_PASSWORD, DB_HOST]):
    raise ValueError("Database environment variables (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST) are required")

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': DB_PORT or '5432',
        'OPTIONS': {
            'sslmode': os.environ.get('DB_SSLMODE', 'disable'),
        },
        'CONN_MAX_AGE': 600,  # Connection pooling: 10 minutes
        'CONN_HEALTH_CHECKS': True,
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # Stronger password requirement
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom User model
AUTH_USER_MODEL = 'accounts.User'

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
# Serve STATIC_ROOT in production (DEBUG=False) — needed for /admin/ CSS via nginx
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

MEDIA_URL = 'media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'crimes.pagination.FlexiblePageNumberPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_THROTTLE_CLASSES': [] if DEBUG else [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Map viewport pans generate many requests; keep prod limits generous
        'anon': '2000/hour',
        'user': '10000/hour',
    },
    'EXCEPTION_HANDLER': 'crime_analysis.utils.custom_exception_handler',
}

# JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS settings - Secure configuration
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
CORS_ALLOWED_ORIGIN_REGEXES = [
    regex.strip()
    for regex in os.environ.get('CORS_ALLOWED_ORIGIN_REGEXES', '').split(',')
    if regex.strip()
] if os.environ.get('CORS_ALLOWED_ORIGIN_REGEXES') else []

if DEBUG:
    CORS_ALLOWED_ORIGINS.extend([
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
    ])
# Deduplicate while preserving order
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(CORS_ALLOWED_ORIGINS))

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Behind Cloudflare Flexible / nginx: opt-in trust of X-Forwarded-Proto so
# request.is_secure(), secure cookies, and CSRF behave correctly over HTTPS at the edge.
# Enable only when clients cannot hit the origin directly (prefer Cloudflare-only / OCI
# locked to Cloudflare IP ranges); otherwise a client could spoof the header. See README.
_TRUST_X_FORWARDED_PROTO = os.environ.get('TRUST_X_FORWARDED_PROTO', '').strip().lower() in (
    'true',
    '1',
    'yes',
)
if _TRUST_X_FORWARDED_PROTO:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True
else:
    USE_X_FORWARDED_HOST = False

# Email settings
EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@crimespace.org')

# Frontend URL for password reset links etc.
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

if (
    not DEBUG
    and FRONTEND_URL.startswith('https://')
    and not _TRUST_X_FORWARDED_PROTO
):
    logging.getLogger(__name__).warning(
        'HTTPS FRONTEND_URL without TRUST_X_FORWARDED_PROTO may break cookies/CSRF behind a reverse proxy'
    )

# CSRF trusted origins — explicit env list, or derive from https FRONTEND_URL
_csrf_trusted = [
    origin.strip()
    for origin in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]
if not _csrf_trusted and FRONTEND_URL.startswith('https://'):
    _csrf_trusted = [FRONTEND_URL.rstrip('/')]
CSRF_TRUSTED_ORIGINS = _csrf_trusted

# GIS Library configurations
GDAL_LIBRARY_PATH = os.environ.get('GDAL_LIBRARY_PATH')
GEOS_LIBRARY_PATH = os.environ.get('GEOS_LIBRARY_PATH')
PROJ_LIB = os.environ.get('PROJ_LIB')
PROJ_DATA = os.environ.get('PROJ_DATA')
PROJ_DB = os.environ.get('PROJ_DB')

# Set environment variables for GDAL if provided
if GDAL_LIBRARY_PATH:
    os.environ['GDAL_LIBRARY_PATH'] = GDAL_LIBRARY_PATH
if GEOS_LIBRARY_PATH:
    os.environ['GEOS_LIBRARY_PATH'] = GEOS_LIBRARY_PATH
if PROJ_LIB:
    os.environ['PROJ_LIB'] = PROJ_LIB
if PROJ_DATA:
    os.environ['PROJ_DATA'] = PROJ_DATA
if PROJ_DB:
    os.environ['PROJ_DB'] = PROJ_DB

# Redis configuration - Secure
REDIS_URL = os.environ.get('REDIS_URL')
if not REDIS_URL:
    raise ValueError("REDIS_URL environment variable is required")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 50,
                "retry_on_timeout": True,
            },
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
        },
        "KEY_PREFIX": "crime_analysis",
        "TIMEOUT": 300,  # 5 minutes default
    }
}

# Session configuration
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'django.log'),
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG' if DEBUG else 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
os.makedirs(os.path.join(BASE_DIR, 'logs'), exist_ok=True)