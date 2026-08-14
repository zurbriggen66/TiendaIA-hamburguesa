from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from .models import Pedido, Localidad, Pago, Caja
from .serializers import PedidoSerializer, LocalidadSerializer, PagoSerializer, CajaSerializer, mover_stock_item


class PedidosPagination(PageNumberPagination):
    """Paginación solo para pedidos: el resto de la API sigue devolviendo listas planas."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all()
    serializer_class = PedidoSerializer
    pagination_class = PedidosPagination

    def get_queryset(self):
        queryset = Pedido.objects.prefetch_related(
            'items__producto', 'items__combo', 'items__extras__extra', 'pagos',
        ).select_related('localidad')
        desde = parse_date(self.request.query_params.get('desde') or '')
        hasta = parse_date(self.request.query_params.get('hasta') or '')
        if desde:
            queryset = queryset.filter(creado__date__gte=desde)
        if hasta:
            queryset = queryset.filter(creado__date__lte=hasta)

        confirmado = self.request.query_params.get('confirmado')
        if confirmado is not None:
            queryset = queryset.filter(confirmado=(confirmado.lower() == 'true'))
        origen = self.request.query_params.get('origen')
        if origen:
            queryset = queryset.filter(origen=origen)

        ultimas_horas = self.request.query_params.get('ultimas_horas')
        if ultimas_horas:
            try:
                horas = int(ultimas_horas)
            except ValueError:
                horas = None
            if horas:
                queryset = queryset.filter(creado__gte=timezone.now() - timedelta(hours=horas))

        return queryset

    def perform_create(self, serializer):
        origen = serializer.validated_data.get('origen', 'admin')
        if origen == 'web':
            # Los pedidos de la tienda web quedan sin caja y sin confirmar hasta que el
            # dueño los confirme a mano (ver acción `confirmar`) — recién ahí se suman
            # a las ventas de la caja que esté abierta en ese momento.
            serializer.save(caja=None, confirmado=False)
        else:
            caja_abierta = Caja.objects.filter(cerrada_en__isnull=True).order_by('-abierta_en').first()
            serializer.save(caja=caja_abierta, confirmado=True)

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        pedido = self.get_object()
        if pedido.confirmado:
            return Response({'detail': 'Este pedido ya está confirmado.'}, status=status.HTTP_400_BAD_REQUEST)
        caja_abierta = Caja.objects.filter(cerrada_en__isnull=True).order_by('-abierta_en').first()
        pedido.confirmado = True
        pedido.caja = caja_abierta
        pedido.save()
        return Response(self.get_serializer(pedido).data)

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


class CajaViewSet(mixins.DestroyModelMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Caja.objects.all()
    serializer_class = CajaSerializer

    def destroy(self, request, *args, **kwargs):
        caja = self.get_object()
        if caja.esta_abierta:
            return Response(
                {'detail': 'No se puede eliminar la caja abierta. Cerrala primero.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def actual(self, request):
        caja = Caja.objects.filter(cerrada_en__isnull=True).order_by('-abierta_en').first()
        if not caja:
            # Response(None) de DRF devuelve un body vacío en vez del literal JSON "null"
            # (lo trata como un 204). Usamos JsonResponse para que el frontend reciba
            # realmente `null` y pueda distinguirlo de una respuesta vacía/con error.
            return JsonResponse(None, safe=False)
        return Response(self.get_serializer(caja).data)

    @action(detail=False, methods=['post'])
    def abrir(self, request):
        if Caja.objects.filter(cerrada_en__isnull=True).exists():
            return Response(
                {'detail': 'Ya hay una caja abierta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dia = parse_date(request.data.get('dia') or '') or timezone.localtime().date()
        caja = Caja.objects.create(dia=dia, nota_apertura=request.data.get('nota_apertura', ''))
        return Response(self.get_serializer(caja).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        caja = self.get_object()
        if not caja.esta_abierta:
            return Response(
                {'detail': 'Esta caja ya está cerrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        caja.cerrada_en = timezone.now()
        caja.nota_cierre = request.data.get('nota_cierre', '')
        caja.save()
        return Response(self.get_serializer(caja).data)
