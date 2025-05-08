"""
Views for agencies app.
"""
from django.utils.decorators import method_decorator
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from dateutil.relativedelta import relativedelta
from django.db.models import Count
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from .models import Agency, AgencyContact, APIKey, DataImportLog
from .serializers import (
    AgencySerializer, AgencyListSerializer, AgencyContactSerializer,
    APIKeySerializer, DataImportLogSerializer, AgencyAdminSerializer
)
from crime_etl.models import ImportJob, ImportLog, DataSource
from crimes.models import Crime, CrimeCategory
from crimes.serializers import CrimeCreateSerializer
import pandas as pd
import json
from django.db import transaction

class IsAgencyUserOrReadOnly(permissions.BasePermission):
    """Custom permission to allow agency users to edit agencies, read-only for others."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(request.user and request.user.is_authenticated and request.user.user_type == 'agency')

class AgencyViewSet(viewsets.ModelViewSet):
    """API endpoint for agencies."""
    queryset = Agency.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['agency_type', 'state', 'country', 'data_sharing_agreement', 'status']
    search_fields = ['name', 'description', 'city', 'state']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        """Return appropriate serializer class based on action."""
        if self.action == 'list':
            return AgencyListSerializer
        return AgencySerializer
    
    def get_permissions(self):
        """Return appropriate permissions based on action."""
        if self.action in ['approve', 'reject', 'disable', 'enable']:
            return [IsAdminUser()]
        elif self.action in ['upload_data', 'api_keys', 'import_logs']:
            return [IsAuthenticated(), IsAgencyUserOrReadOnly()]
        return [IsAgencyUserOrReadOnly()]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an agency registration."""
        agency = self.get_object()
        agency.status = 'approved'
        agency.save()
        return Response(AgencySerializer(agency).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an agency registration."""
        agency = self.get_object()
        agency.status = 'rejected'
        agency.save()
        return Response(AgencySerializer(agency).data)
    
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable an agency."""
        agency = self.get_object()
        agency.status = 'disabled'
        agency.save()
        return Response(AgencySerializer(agency).data)
    
    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        """Enable a disabled agency."""
        agency = self.get_object()
        agency.status = 'approved'
        agency.save()
        return Response(AgencySerializer(agency).data)

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
        if not (request.user.user_type == 'agency' and request.user.agency == agency or request.user.is_staff):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        api_keys = agency.api_keys.all()
        serializer = APIKeySerializer(api_keys, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['post'])
    def generate_api_key(self, request, pk=None):
        """Generate a new API key for an agency."""
        agency = self.get_object()
        if not (request.user.user_type == 'agency' and request.user.agency == agency or request.user.is_staff):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        import secrets
        name = request.data.get('name', 'API Key')
        key = secrets.token_hex(32)
        api_key = APIKey.objects.create(
            agency=agency,
            name=name,
            key=key
        )
        serializer = APIKeySerializer(api_key)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def import_logs(self, request, pk=None):
        """Get import logs for an agency."""
        agency = self.get_object()
        if not (request.user.user_type == 'agency' and request.user.agency == agency or request.user.is_staff):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        import_logs = agency.import_logs.all()
        serializer = DataImportLogSerializer(import_logs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_data(self, request, pk=None):
        """Handle data upload for an agency."""
        agency = self.get_object()
        if not (request.user.user_type == 'agency' and request.user.agency == agency or request.user.is_staff):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        
        import_log = None
        import_job = None
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create ImportJob
            data_source = DataSource.objects.filter(created_by__agency=agency, source_type='file').first()
            if not data_source:
                data_source = DataSource.objects.create(
                    created_by=request.user,
                    name="Agency File Upload",
                    source_type="file",
                    is_active=True
                )
            
            import_job = ImportJob.objects.create(
                created_by=request.user,
                data_source=data_source,
                status='pending',
                started_at=timezone.now()
            )
            
            # Create DataImportLog
            import_log = DataImportLog.objects.create(
                agency=agency,
                import_date=timezone.now(),
                data_start_date=request.data.get('start_date', timezone.now().date()),
                data_end_date=request.data.get('end_date', timezone.now().date()),
                import_method=request.data.get('method', 'file_upload'),
                status='in_progress'
            )
            
            # Process file based on type
            file_extension = file.name.split('.')[-1].lower()
            records = []
            
            if file_extension == 'csv':
                df = pd.read_csv(file)
                records = df.to_dict('records')
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file)
                records = df.to_dict('records')
            elif file_extension == 'json':
                data = json.load(file)
                records = data if isinstance(data, list) else [data]
            else:
                import_log.status = 'failed'
                import_log.error_message = 'Unsupported file format'
                import_log.save()
                import_job.status = 'failed'
                import_job.completed_at = timezone.now()
                import_job.save()
                return Response({"error": "Unsupported file format"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Process records and create Crimes
            record_count = 0
            with transaction.atomic():
                for record in records:
                    try:
                        # Map fields to Crime model
                        category_name = record.get('category') or record.get('crime_type', 'Unknown')
                        category, _ = CrimeCategory.objects.get_or_create(name=category_name)
                        
                        crime_data = {
                            'agency': agency.id,
                            'category': category.id,
                            'case_number': record.get('case_number', ''),
                            'description': record.get('description', ''),
                            'date': record.get('date', timezone.now().date()),
                            'time': record.get('time', None),
                            'latitude': record.get('latitude'),
                            'longitude': record.get('longitude'),
                            'block_address': record.get('block_address', ''),
                            'status': record.get('status', 'reported'),
                            'is_violent': record.get('is_violent', False),
                            'arrests_made': record.get('arrests_made', False),
                            'property_loss': record.get('property_loss', None)
                        }
                        
                        serializer = CrimeCreateSerializer(data=crime_data)
                        if serializer.is_valid():
                            serializer.save(agency=agency)
                            record_count += 1
                        else:
                            continue  # Skip invalid records
                    except Exception as e:
                        continue  # Skip records with errors
                
                # Update import job and log
                import_log.status = 'completed'
                import_log.record_count = record_count
                import_log.completed_at = timezone.now()
                import_log.save()
                
                import_job.status = 'completed'
                import_job.completed_at = timezone.now()
                import_job.record_count = record_count
                import_job.save()
                
                # Create ImportLog for crime_etl
                import_log_entry = ImportLog.objects.create(
                    import_job=import_job,
                    status='completed',
                    message=f'Imported {record_count} crime records',
                    created_at=timezone.now()
                )
                
                agency.last_data_upload = timezone.now()
                agency.save()
            
            return Response({"status": "success", "import_id": import_log.id, "record_count": record_count})
        except Exception as e:
            error_message = str(e)
            if import_log:
                import_log.status = 'failed'
                import_log.error_message = error_message
                import_log.completed_at = timezone.now()
                import_log.save()
            if import_job:
                import_job.status = 'failed'
                import_job.completed_at = timezone.now()
                import_job.save()
            return Response({"error": error_message}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get statistics for an agency."""
        agency = self.get_object()
        if not (request.user.user_type == 'agency' and request.user.agency == agency or request.user.is_staff):
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)
        
        # Crime statistics
        crimes = Crime.objects.filter(agency=agency)
        crime_types = crimes.values('category__name').annotate(count=Count('id')).order_by('-count')
        
        # Monthly trends (last 6 months)
        end_date = timezone.now().date()
        start_date = end_date - relativedelta(months=6)
        monthly_trends = []
        current_date = start_date.replace(day=1)
        while current_date <= end_date:
            next_month = current_date + relativedelta(months=1)
            month_crimes = crimes.filter(date__gte=current_date, date__lt=next_month)
            monthly_trends.append({
                'date': current_date.strftime('%Y-%m'),
                'total': month_crimes.count()
            })
            current_date = next_month
        
        stats = {
            'contact_count': agency.contacts.count(),
            'active_api_keys': agency.api_keys.filter(is_active=True).count(),
            'total_imports': agency.import_logs.count(),
            'successful_imports': agency.import_logs.filter(status='completed').count(),
            'status': agency.status,
            'last_data_upload': agency.last_data_upload,
            'total_crimes': crimes.count(),
            'crime_types': list(crime_types),
            'monthly_trends': monthly_trends
        }
        return Response(stats)

class AdminAgencyViewSet(viewsets.ModelViewSet):
    """API endpoint for admin-only agency management."""
    queryset = Agency.objects.all()
    serializer_class = AgencyAdminSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['agency_type', 'state', 'country', 'data_sharing_agreement', 'status']
    search_fields = ['name', 'description', 'city', 'state']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get all pending agency registrations."""
        agencies = Agency.objects.filter(status='pending')
        serializer = AgencyAdminSerializer(agencies, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def disabled(self, request):
        """Get all disabled agencies."""
        agencies = Agency.objects.filter(status='disabled')
        serializer = AgencyAdminSerializer(agencies, many=True)
        return Response(serializer.data)
        
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active (approved) agencies."""
        agencies = Agency.objects.filter(status='approved')
        serializer = AgencyAdminSerializer(agencies, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an agency registration."""
        agency = self.get_object()
        agency.status = 'approved'
        agency.save()
        return Response(AgencyAdminSerializer(agency).data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an agency registration."""
        agency = self.get_object()
        agency.status = 'rejected'
        agency.save()
        return Response(AgencyAdminSerializer(agency).data)
    
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        """Disable an agency."""
        agency = self.get_object()
        agency.status = 'disabled'
        agency.save()
        return Response(AgencyAdminSerializer(agency).data)
    
    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        """Enable a disabled agency."""
        agency = self.get_object()
        agency.status = 'approved'
        agency.save()
        return Response(AgencyAdminSerializer(agency).data)
    
    @action(detail=False, methods=['get'])
    def system_stats(self, request):
        """Get system-wide statistics for admin dashboard."""
        stats = {
            'total_agencies': Agency.objects.count(),
            'approved_agencies': Agency.objects.filter(status='approved').count(),
            'pending_agencies': Agency.objects.filter(status='pending').count(),
            'disabled_agencies': Agency.objects.filter(status='disabled').count(),
            'total_api_keys': APIKey.objects.count(),
            'active_api_keys': APIKey.objects.filter(is_active=True).count(),
            'total_imports': DataImportLog.objects.count(),
            'successful_imports': DataImportLog.objects.filter(status='completed').count(),
            'failed_imports': DataImportLog.objects.filter(status='failed').count(),
            'latest_registrations': AgencyAdminSerializer(
                Agency.objects.order_by('-created_at')[:5], 
                many=True
            ).data,
            'latest_imports': DataImportLogSerializer(
                DataImportLog.objects.order_by('-import_date')[:5], 
                many=True
            ).data
        }
        return Response(stats)

class AgencyContactViewSet(viewsets.ModelViewSet):
    """API endpoint for agency contacts."""
    queryset = AgencyContact.objects.all()
    serializer_class = AgencyContactSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['agency', 'is_primary']
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        if getattr(self, 'swagger_fake_view', False):
            return queryset.none()
        return queryset.filter(agency=self.request.user.agency)


    def get_permissions(self):
        """Return appropriate permissions based on action."""
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def perform_create(self, serializer):
        """Create a new agency contact."""
        if not self.request.user.is_staff and self.request.user.user_type != 'agency':
            raise permissions.PermissionDenied("Only agency users or admins can create contacts.")
        serializer.save(agency=self.request.user.agency)

    def perform_update(self, serializer):
        """Update an existing agency contact."""
        if not self.request.user.is_staff and self.request.user.user_type != 'agency':
            raise permissions.PermissionDenied("Only agency users or admins can update contacts.")
        serializer.save(agency=self.request.user.agency)

    def perform_destroy(self, instance):
        """Delete an agency contact."""
        if not self.request.user.is_staff and self.request.user.user_type != 'agency':
            raise permissions.PermissionDenied("Only agency users or admins can delete contacts.")
        instance.delete()