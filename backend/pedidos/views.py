from rest_framework import viewsets
from .models import Pedido, Localidad, Pago
from .serializers import PedidoSerializer, LocalidadSerializer, PagoSerializer, mover_stock_item


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.prefetch_related('items__producto', 'items__extras__extra', 'pagos').select_related('localidad')
    serializer_class = PedidoSerializer

    def perform_destroy(self, instance):
        # Si el pedido no estaba cancelado, el stock que descontó al crearse sigue "afuera" —
        # hay que devolverlo antes de borrarlo. Si ya estaba cancelado, la cancelación ya lo devolvió.
        if instance.estado != 'cancelado':
            items = instance.items.prefetch_related('extras__extra', 'combo__items__producto')
            for item in items:
                mover_stock_item(item, signo=1)
        instance.delete()


class LocalidadViewSet(viewsets.ModelViewSet):
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer


class PagoViewSet(viewsets.ModelViewSet):
    queryset = Pago.objects.select_related('pedido')
    serializer_class = PagoSerializer
