"""
Utility functions for the crime_analysis project.
"""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
from django.http import Http404
from django.utils.translation import gettext_lazy as _
import os

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler to standardize error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Standardize the error response format
        if isinstance(response.data, dict):
            # Ensure consistent error structure
            if 'detail' in response.data:
                response.data = {
                    'error': True,
                    'message': response.data['detail'],
                    'code': response.status_code,
                    'details': response.data.get('details', {})
                }
            elif 'message' not in response.data:
                response.data = {
                    'error': True,
                    'message': str(response.data),
                    'code': response.status_code,
                    'details': response.data
                }
        else:
            # Handle non-dict responses
            response.data = {
                'error': True,
                'message': str(response.data),
                'code': response.status_code,
                'details': {}
            }
        
        # Log the error
        logger.error(
            f"API Error: {response.status_code} - {response.data.get('message', 'Unknown error')}",
            extra={
                'status_code': response.status_code,
                'view': context.get('view').__class__.__name__ if context.get('view') else 'Unknown',
                'user': context.get('request').user.username if context.get('request') and context.get('request').user else 'Anonymous',
                'data': response.data
            }
        )
        
        return response
    
    # Handle Django-specific exceptions
    if isinstance(exc, ValidationError):
        logger.warning(f"Validation Error: {exc}")
        return Response({
            'error': True,
            'message': _('Validation error occurred'),
            'code': status.HTTP_400_BAD_REQUEST,
            'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if isinstance(exc, Http404):
        logger.warning(f"Not Found: {exc}")
        return Response({
            'error': True,
            'message': _('Resource not found'),
            'code': status.HTTP_404_NOT_FOUND,
            'details': {}
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Handle unexpected exceptions
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return Response({
        'error': True,
        'message': _('An unexpected error occurred'),
        'code': status.HTTP_500_INTERNAL_SERVER_ERROR,
        'details': {}
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def validate_environment_variables():
    """
    Validate that all required environment variables are set.
    """
    required_vars = [
        'SECRET_KEY',
        'DB_NAME',
        'DB_USER',
        'DB_PASSWORD',
        'DB_HOST',
        'REDIS_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
    
    return True


def sanitize_log_data(data):
    """
    Remove sensitive information from log data.
    """
    if not isinstance(data, dict):
        return data
    
    sensitive_keys = ['password', 'token', 'secret', 'key', 'authorization']
    sanitized = data.copy()
    
    for key in sensitive_keys:
        if key in sanitized:
            sanitized[key] = '***REDACTED***'
    
    return sanitized
