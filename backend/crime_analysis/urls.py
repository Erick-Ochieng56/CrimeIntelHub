"""
URL configuration for crime_analysis project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.http import HttpResponse

# Swagger/OpenAPI documentation setup
schema_view = get_schema_view(
    openapi.Info(
        title="Crime Analysis API",
        default_version='v1',
        description="API for crime data analysis and visualization",
        terms_of_service="https://www.crimespace.org/terms/",
        contact=openapi.Contact(email="contact@crimespace.org"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

# Simple home page view function
def home_page(request):
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Crime Analysis System API</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 { color: #2c3e50; }
            h2 { 
                color: #3498db; 
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }
            a { 
                color: #3498db; 
                text-decoration: none;
            }
            a:hover { text-decoration: underline; }
            .endpoint {
                background: #f8f9fa;
                border-left: 4px solid #3498db;
                padding: 15px;
                margin: 15px 0;
                border-radius: 4px;
            }
            .endpoint h3 {
                margin-top: 0;
                margin-bottom: 10px;
            }
            .endpoint p {
                margin: 0;
            }
        </style>
    </head>
    <body>
        <h1>Crime Analysis System API</h1>
        <p>Welcome to the Crime Analysis System API. This backend provides comprehensive crime data analysis, visualization, and reporting capabilities.</p>
        
        <h2>API Endpoints</h2>
        
        <div class="endpoint">
            <h3><a href="/api/auth/">Authentication API</a></h3>
            <p>User authentication, registration, and profile management (includes /auth/admin-login/, /auth/agency-login/, /agencies/register/)</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/api/agencies/">Agencies API</a></h3>
            <p>Law enforcement agency management and data import</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/api/crimes/">Crimes API</a></h3>
            <p>Crime incident data and management</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/api/analytics/">Analytics API</a></h3>
            <p>Crime analytics, patterns, and predictions</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/api/alerts/">Alerts API</a></h3>
            <p>Crime alerts and notifications</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/api/reports/">Reports API</a></h3>
            <p>Crime reporting and visualization</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/api/etl/">ETL API</a></h3>
            <p>Data import/export and transformations</p>
        </div>
        
        <h2>API Documentation</h2>
        
        <div class="endpoint">
            <h3><a href="/swagger/">Swagger UI</a></h3>
            <p>Interactive API documentation</p>
        </div>
        
        <div class="endpoint">
            <h3><a href="/redoc/">ReDoc</a></h3>
            <p>Alternative API documentation</p>
        </div>
        
        <h2>Administration</h2>
        <div class="endpoint">
            <h3><a href="/admin/">Admin Interface</a></h3>
            <p>Django administration interface (login required)</p>
        </div>
    </body>
    </html>
    """
    return HttpResponse(html)

urlpatterns = [
    # Home page
    path('', home_page, name='home'),
    
    # Admin and documentation
    path('admin/', admin.site.urls),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # API endpoints for each app
    path('api/auth/', include('accounts.urls', namespace='accounts')),
    path('api/agencies/', include('agencies.urls', namespace='agencies')),
    path('api/crimes/', include('crimes.urls', namespace='crimes')),
    path('api/analytics/', include('crime_analytics.urls', namespace='crime_analytics')),
    path('api/alerts/', include('crime_alerts.urls', namespace='crime_alerts')),
    path('api/reports/', include('crime_reports.urls', namespace='crime_reports')),
    path('api/etl/', include('crime_etl.urls', namespace='crime_etl')),
    
    # API authentication
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)