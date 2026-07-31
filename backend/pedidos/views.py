from rest_framework import viewsets
from .models import Pedido, Localidad
from .serializers import PedidoSerializer, LocalidadSerializer


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.prefetch_related('items__producto').select_related('localidad')
    serializer_class = PedidoSerializer


class LocalidadViewSet(viewsets.ModelViewSet):
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer
