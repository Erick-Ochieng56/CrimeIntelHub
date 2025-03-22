from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework import permissions

schema_view = get_schema_view(
    openapi.Info(
        title="Crime Analysis API",
        default_version='v1',
        description="API for crime analysis, geospatial visualization, and predictive analytics",
        terms_of_service="https://www.crimeanalysis.com/terms/",
        contact=openapi.Contact(email="contact@crimeanalysis.com"),
        license=openapi.License(name="MIT License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)