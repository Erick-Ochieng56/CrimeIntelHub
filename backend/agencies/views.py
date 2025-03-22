"""
Views for agencies app.
"""
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Agency, AgencyContact, APIKey, DataImportLog
from .serializers import (
    AgencySerializer, AgencyListSerializer, AgencyContactSerializer,
    APIKeySerializer, DataImportLogSerializer
)


class IsAgencyUserOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow agency users to edit agencies.
    Non-agency users can only perform read operations.
    """

    def has_permission(self, request, view):
        # Allow read operations for authenticated users
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)

        # Allow write operations only for agency users
        return bool(request.user and request.user.is_authenticated and request.user.is_agency_user)


class AgencyViewSet(viewsets.ModelViewSet):
    """API endpoint for agencies."""

    queryset = Agency.objects.all()
    permission_classes = [IsAgencyUserOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['agency_type', 'state', 'country', 'data_sharing_agreement']
    search_fields = ['name', 'description', 'city', 'state']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        """Return appropriate serializer class based on action."""
        if self.action == 'list':
            return AgencyListSerializer
        return AgencySerializer

    @action(detail=True, methods=['get'])
    def contacts(self, request, pk=None):
        """Get contacts for an agency."""
        agency = self.get_object()
        contacts = agency.contacts.all()
        serializer = AgencyContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def api_keys(self, request, pk=None):
        """Get API keys for an agency."""
        agency = self.get_object()
        if not request.user.is_agency_user:
            return Response({"detail": "Not authorized."}, status=403)

        api_keys = agency.api_keys.all()
        serializer = APIKeySerializer(api_keys, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def import_logs(self, request, pk=None):
        """Get import logs for an agency."""
        agency = self.get_object()
        if not request.user.is_agency_user:
            return Response({"detail": "Not authorized."}, status=403)

        import_logs = agency.import_logs.all()
        serializer = DataImportLogSerializer(import_logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get statistics for an agency."""
        agency = self.get_object()
        stats = {
            'contact_count': agency.contacts.count(),
            'active_api_keys': agency.api_keys.filter(is_active=True).count(),
            'total_imports': agency.import_logs.count(),
            'successful_imports': agency.import_logs.filter(status='completed').count(),
        }
        return Response(stats)