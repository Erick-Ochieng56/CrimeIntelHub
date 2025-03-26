"""
URL configuration for accounts app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentication endpoints
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    

    # Password management
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('request-password-reset/', views.PasswordResetRequestView.as_view(), name='request_password_reset'),
    path('confirm-password-reset/', views.PasswordResetConfirmView.as_view(), name='confirm_password_reset'),
    
        # User me endpoint
    path('me/', views.UserMeView.as_view(), name='user_me'),

    # Profile management
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('preferences/', views.UserPreferenceView.as_view(), name='preferences'),
]