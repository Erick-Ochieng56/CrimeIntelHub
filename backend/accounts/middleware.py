from django.utils.functional import SimpleLazyObject
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import AnonymousUser

def get_user_jwt(request):
    """Get user from JWT token."""
    user = None
    auth = JWTAuthentication()
    
    try:
        auth_tuple = auth.authenticate(request)
        if auth_tuple is not None:
            user, _ = auth_tuple
    except:
        pass
    
    return user or AnonymousUser()

class JWTAuthenticationMiddleware:
    """Middleware to authenticate via JWT."""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Only use JWT auth if user is not already authenticated via session
        if request.user.is_anonymous:
            request.user = SimpleLazyObject(lambda: get_user_jwt(request))
        return self.get_response(request)