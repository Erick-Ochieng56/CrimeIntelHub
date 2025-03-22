backend/ 
├── manage.py
├── requirements.txt
├── .env
├── README.md
├── crime_analysis/  # Main Django project
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
│   └── swagger.py  # Swagger configuration
├── accounts/  # User authentication app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── tests.py
│   └── migrations/
├── agencies/  # Agency management app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── tests.py
│   └── migrations/
├── crimes/  # Core crime data app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── filters.py
│   ├── utils.py
│   ├── tests.py
│   └── migrations/
├── alerts/  # Crime alerts app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── tasks.py  # For background alert checks
│   ├── tests.py
│   └── migrations/
├── reports/  # Report generation app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── generators.py  # For PDF/Excel report generation
│   ├── templates/
│   ├── tests.py
│   └── migrations/
├── analytics/  # Predictive analytics app
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── ml_models/  # Machine learning models
│   ├── tests.py
│   └── migrations/
├── etl/  # Data extraction and transformation
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── urls.py
│   ├── views.py
│   ├── connectors/  # Agency data source connectors
│   ├── processors.py
│   ├── tasks.py  # Celery tasks for scheduled ETL
│   ├── tests.py
│   └── migrations/
└── static/
    └── swagger/  # Swagger UI static files