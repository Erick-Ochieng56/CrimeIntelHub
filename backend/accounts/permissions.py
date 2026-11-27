from rest_framework import permissions


def is_platform_admin(user):
    """Admin rights come from Django staff/superuser flags only, never from user_type."""
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


class IsAdminUser(permissions.BasePermission):
    """
    Permission for system administrators
    """
    def has_permission(self, request, view):
        return is_platform_admin(request.user)

class IsAgencyUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'agency' and request.user.agency is not None

class IsRegularUser(permissions.BasePermission):
    """
    Permission for regular users
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.user_type == 'user'

class IsAgencyMemberOrAdmin(permissions.BasePermission):
    """
    Permission to check if user belongs to the agency that owns a resource
    or is an admin
    """
    def has_object_permission(self, request, view, obj):
        if is_platform_admin(request.user):
            return True
            
        # Check if object has agency attribute and user belongs to that agency
        return (hasattr(obj, 'agency') and 
                request.user.agency is not None and 
                request.user.agency == obj.agency)
        
class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to check if user is the owner of the object or has read-only access
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner of the object
        return obj.owner == request.user or is_platform_admin(request.user)
