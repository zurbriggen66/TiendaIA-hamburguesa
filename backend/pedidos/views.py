from rest_framework import viewsets
from .models import Pedido, Localidad, Pago
from .serializers import PedidoSerializer, LocalidadSerializer, PagoSerializer


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.prefetch_related('items__producto', 'items__extras__extra', 'pagos').select_related('localidad')
    serializer_class = PedidoSerializer


class LocalidadViewSet(viewsets.ModelViewSet):
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.select_related('pedido')
    serializer_class = PagoSerializer
