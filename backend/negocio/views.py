from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import EsAdminOSoloLectura
from .models import ConfiguracionSitio
from .serializers import ConfiguracionSitioSerializer

class ConfiguracionViewSet(viewsets.ModelViewSet):
    # Lectura pública (logo, colores, si la tienda está abierta); escribir es solo admin.
    permission_classes = [EsAdminOSoloLectura]
    queryset = ConfiguracionSitio.objects.all()
    serializer_class = ConfiguracionSitioSerializer


class AdminLoginView(APIView):
    """Login del panel de administración: un único usuario/contraseña compartido
    (no hay altas de cuentas nuevas). Devuelve un token que no vence solo — el
    panel lo guarda y no vuelve a pedir la contraseña hasta que alguien cierre sesión."""

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        usuario = authenticate(
            username=(request.data.get('usuario') or '').strip(),
            password=request.data.get('password') or '',
        )
        if not usuario or not usuario.is_staff:
            return Response({'detail': 'Usuario o contraseña incorrectos.'}, status=status.HTTP_401_UNAUTHORIZED)
        token, _ = Token.objects.get_or_create(user=usuario)
        return Response({'token': token.key})