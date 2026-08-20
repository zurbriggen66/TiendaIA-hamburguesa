from django.contrib.auth import authenticate
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import EsAdmin
from .models import Cliente
from .serializers import ClienteSerializer, RegistroSerializer


def _respuesta_con_token(cliente):
    token, _ = Token.objects.get_or_create(user=cliente.usuario)
    return Response({'token': token.key, 'cliente': ClienteSerializer(cliente).data})


class RegistroView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return _respuesta_con_token(serializer.save())


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        usuario = authenticate(username=email, password=request.data.get('password') or '')
        # Mensaje único a propósito: no revelamos si el email existe o si falló la contraseña.
        if not usuario or not hasattr(usuario, 'cliente'):
            return Response({'detail': 'Email o contraseña incorrectos.'}, status=status.HTTP_401_UNAUTHORIZED)
        return _respuesta_con_token(usuario.cliente)


class MiCuentaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'detail': 'Esta cuenta no es de un cliente.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(ClienteSerializer(cliente).data)


class ClienteViewSet(viewsets.ReadOnlyModelViewSet):
    """Listado para el admin del negocio."""

    permission_classes = [EsAdmin]
    queryset = Cliente.objects.select_related('usuario')
    serializer_class = ClienteSerializer
