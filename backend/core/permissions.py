from rest_framework.permissions import BasePermission, SAFE_METHODS


def es_staff(request):
    return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class EsAdmin(BasePermission):
    """Todo el endpoint requiere estar logueado como staff (panel de administración)."""

    def has_permission(self, request, view):
        return es_staff(request)


class EsAdminOSoloLectura(BasePermission):
    """Cualquiera puede leer (GET/HEAD/OPTIONS, para la tienda pública); escribir
    requiere estar logueado como staff."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return es_staff(request)
