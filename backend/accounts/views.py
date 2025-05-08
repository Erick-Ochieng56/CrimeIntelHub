"""
Views for accounts app.
"""
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model, authenticate, logout
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import PasswordResetToken
from .serializers import (
    RegisterSerializer, AgencyRegisterSerializer, LoginSerializer, ChangePasswordSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    UserSerializer, UserPreferenceSerializer, LogoutSerializer
)
from .permissions import IsAdminUser, IsAgencyUser
from agencies.models import Agency

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    """API endpoint for user registration."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        """Create a new regular user and return tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(user_type='user')
        user_group = Group.objects.get(name='Regular Users')
        user.groups.add(user_group)
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

class AgencyRegisterView(generics.CreateAPIView):
    """API endpoint for agency registration."""
    serializer_class = AgencyRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        """Create a new agency user and return tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(user_type='agency')
        user_group = Group.objects.get(name='Agency Users')
        user.groups.add(user_group)
        refresh = RefreshToken.for_user(user)
        agency_id = user.agency.id if user.agency else None
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
            'agency_id': agency_id
        }, status=status.HTTP_201_CREATED)

class LoginView(generics.GenericAPIView):
    """API endpoint for user login."""
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """Authenticate user and return tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        agency_id = user.agency.id if user.agency else None
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
            'agency_id': agency_id
        })

class AgencyLoginView(generics.GenericAPIView):
    """API endpoint for agency user login."""
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """Authenticate agency user and return tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_active:
            return Response({'error': 'Account is disabled'}, status=status.HTTP_401_UNAUTHORIZED)
        if user.user_type != 'agency' or not user.agency:
            return Response({'error': 'Account does not have agency privileges'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
            'agency_id': user.agency.id
        })

class AdminLoginView(generics.GenericAPIView):
    """API endpoint for admin login."""
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """Authenticate admin user and return tokens."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_active or not user.is_staff:
            return Response({'error': 'Account does not have admin privileges'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data
        # Override user_type for admins
        user_data['user_type'] = 'admin'
        user_data['is_staff'] = user.is_staff
        user_data['is_superuser'] = user.is_superuser
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user_data
        })

class LogoutView(generics.GenericAPIView):
    """API endpoint for user logout."""
    serializer_class = LogoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Logout user and blacklist refresh token."""
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            logout(request)
            return Response({'detail': 'Successfully logged out.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(generics.GenericAPIView):
    """API endpoint for changing password."""
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """Change user password."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Wrong password.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Password successfully changed.'})

class PasswordResetRequestView(generics.GenericAPIView):
    """API endpoint for requesting password reset."""
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """Send password reset email."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(email=serializer.validated_data['email'])
            token = PasswordResetToken.objects.create(user=user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token.token}&email={user.email}"
            send_mail(
                'Password Reset Request',
                f'Click the following link to reset your password: {reset_url}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return Response({'detail': 'Password reset email sent.'})
        except User.DoesNotExist:
            return Response({'detail': 'Password reset email sent.'})

class PasswordResetConfirmView(generics.GenericAPIView):
    """API endpoint for confirming password reset."""
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        """Reset user password."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = PasswordResetToken.objects.get(
            token=serializer.validated_data['token'],
            user__email=serializer.validated_data['email'],
            used=False
        )
        user = token.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        token.used = True
        token.used_at = timezone.now()
        token.save()
        return Response({'detail': 'Password successfully reset.'})

class UserProfileView(generics.RetrieveUpdateAPIView):
    """API endpoint for user profile."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Return the authenticated user."""
        return self.request.user

    def update(self, request, *args, **kwargs):
        """Update user profile, restrict agency and user_type for agency users."""
        instance = self.get_object()
        if instance.user_type == 'agency':
            if 'user_type' in request.data or 'agency' in request.data:
                return Response({'error': 'Agency users cannot modify user_type or agency'}, status=status.HTTP_403_FORBIDDEN)
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class UserPreferenceView(generics.RetrieveUpdateAPIView):
    """API endpoint for user preferences."""
    serializer_class = UserPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Return the user's preferences."""
        return self.request.user.preferences

    def update(self, request, *args, **kwargs):
        """Update user preferences."""
        instance = self.get_object()
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

class UserMeView(generics.RetrieveAPIView):
    """API endpoint to get current authenticated user."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Return the authenticated user."""
        user = self.request.user
        return user

    def retrieve(self, request, *args, **kwargs):
        """Return user data with overridden user_type for admins."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        user_data = serializer.data
        if instance.is_staff or instance.is_superuser:
            user_data['user_type'] = 'admin'
            user_data['is_staff'] = instance.is_staff
            user_data['is_superuser'] = instance.is_superuser
        return Response(user_data)

class AdminUserManagement(generics.ListCreateAPIView):
    """Admin endpoint for managing users."""
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def perform_create(self, serializer):
        """Create a new user with specified role."""
        user_type = self.request.data.get('user_type', 'user')
        agency_id = self.request.data.get('agency')
        user = serializer.save(user_type=user_type)
        if user_type == 'admin':
            group = Group.objects.get(name='Administrators')
        elif user_type == 'agency':
            group = Group.objects.get(name='Agency Users')
            if agency_id:
                try:
                    agency = Agency.objects.get(id=agency_id)
                    user.agency = agency
                    user.save()
                except Agency.DoesNotExist:
                    pass
        else:
            group = Group.objects.get(name='Regular Users')
        user.groups.add(group)

class AdminUserDetail(generics.RetrieveUpdateDestroyAPIView):
    """Admin endpoint for managing specific users."""
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def perform_update(self, serializer):
        """Update user details including role if specified."""
        user_type = self.request.data.get('user_type')
        agency_id = self.request.data.get('agency')
        user = serializer.save()
        if user_type and user_type != user.user_type:
            user.user_type = user_type
            user.groups.clear()
            if user_type == 'admin':
                group = Group.objects.get(name='Administrators')
            elif user_type == 'agency':
                group = Group.objects.get(name='Agency Users')
            else:
                group = Group.objects.get(name='Regular Users')
            user.groups.add(group)
        if user.user_type == 'agency' and agency_id:
            try:
                agency = Agency.objects.get(id=agency_id)
                user.agency = agency
                user.save()
            except Agency.DoesNotExist:
                pass

class AdminUserList(generics.ListAPIView):
    """Admin endpoint for listing users."""
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.all()

    def get_queryset(self):
        """Filter users by agency if specified."""
        queryset = super().get_queryset()
        agency_id = self.request.query_params.get('agency')
        if agency_id:
            queryset = queryset.filter(agency__id=agency_id)
        return queryset

class AgencyUserManagement(generics.ListCreateAPIView):
    """API endpoint for agency user management."""
    serializer_class = UserSerializer
    permission_classes = [IsAgencyUser]

    def get_queryset(self):
        """Return users associated with the authenticated agency."""
        return User.objects.filter(agency=self.request.user.agency)

    def perform_create(self, serializer):
        """Create a new agency user."""
        if 'user_type' in self.request.data and self.request.data['user_type'] != 'agency':
            return Response({'error': 'Agency users can only create agency users'}, status=status.HTTP_403_FORBIDDEN)
        if 'agency' in self.request.data and self.request.data['agency'] != str(self.request.user.agency.id):
            return Response({'error': 'Cannot assign users to another agency'}, status=status.HTTP_403_FORBIDDEN)
        user = serializer.save(user_type='agency', agency=self.request.user.agency)
        user_group = Group.objects.get(name='Agency Users')
        user.groups.add(user_group)

class AgencyUserDetail(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint for agency user detail."""
    serializer_class = UserSerializer
    permission_classes = [IsAgencyUser]

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return User.objects.none()
        return User.objects.filter(agency=self.request.user.agency)
       

    def perform_update(self, serializer):
        """Update user details, restrict critical fields."""
        if 'user_type' in self.request.data or 'agency' in self.request.data:
            return Response({'error': 'Agency users cannot modify user_type or agency'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save(agency=self.request.user.agency)

    def perform_destroy(self, instance):
        """Prevent deletion of the requesting user."""
        if instance.id == self.request.user.id:
            return Response({'error': 'Cannot delete your own account'}, status=status.HTTP_403_FORBIDDEN)
        instance.delete()