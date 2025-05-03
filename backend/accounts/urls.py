"""
URL configuration for accounts app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'accounts'

urlpatterns = [
    # User registration and authentication
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('agency-login/', views.AgencyLoginView.as_view(), name='agency_login'),
    path('admin-login/', views.AdminLoginView.as_view(), name='admin_login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Agency registration
    path('agencies/register/', views.AgencyRegisterView.as_view(), name='agency_register'),
    
    # Password management
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('password-reset-request/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset-confirm/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # User profile and preferences
    path('profile/', views.UserProfileView.as_view(), name='user_profile'),
    path('preferences/', views.UserPreferenceView.as_view(), name='user_preferences'),
    
    # Current user
    path('me/', views.UserMeView.as_view(), name='user_me'),
    
    # Admin user management
    path('admin/users/', views.AdminUserManagement.as_view(), name='admin_users'),
    path('admin/users/<int:pk>/', views.AdminUserDetail.as_view(), name='admin_user_detail'),
    
    # Agency user management
    path('agency/users/', views.AgencyUserManagement.as_view(), name='agency_users'),
    path('agency/users/<int:pk>/', views.AgencyUserDetail.as_view(), name='agency_user_detail'),
]