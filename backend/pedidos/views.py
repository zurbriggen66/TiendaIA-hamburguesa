from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from core.permissions import EsAdmin, EsAdminOSoloLectura, es_staff
from .models import Pedido, Localidad, Pago, Caja
from .serializers import PedidoSerializer, LocalidadSerializer, PagoSerializer, CajaSerializer, mover_stock_item
from clientes.puntos import acreditar as acreditar_puntos


class PedidoPermiso(BasePermission):
    """Crear un pedido (POST) es público — así piden los clientes de la tienda, con o
    sin cuenta. Todo lo demás (listar, ver el detalle, confirmar, cancelar, borrar)
    es del panel de administración."""

    def has_permission(self, request, view):
        if request.method == 'POST':
            return True
        return es_staff(request)


class PedidosPagination(PageNumberPagination):
    """Paginación solo para pedidos: el resto de la API sigue devolviendo listas planas."""

    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class PedidoViewSet(viewsets.ModelViewSet):
    permission_classes = [PedidoPermiso]
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
            pedido = serializer.save(caja=caja_abierta, confirmado=True)
            acreditar_puntos(pedido)

    @action(detail=True, methods=['post'])
    def confirmar(self, request, pk=None):
        pedido = self.get_object()
        if pedido.confirmado:
            return Response({'detail': 'Este pedido ya está confirmado.'}, status=status.HTTP_400_BAD_REQUEST)
        caja_abierta = Caja.objects.filter(cerrada_en__isnull=True).order_by('-abierta_en').first()
        pedido.confirmado = True
        pedido.caja = caja_abierta
        pedido.save()
        # Los puntos se acreditan recién acá: un pedido web sin confirmar podría no
        # haber existido nunca, y no queremos que se acumulen puntos por pedidos falsos.
        acreditar_puntos(pedido)
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
    # Lectura publica: la tienda web necesita listar las zonas y su costo de envio
    # para que el cliente elija a donde se lo mandan. Escribir sigue siendo del admin.
    permission_classes = [EsAdminOSoloLectura]
    queryset = Localidad.objects.all()
    serializer_class = LocalidadSerializer


class PagoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Pago.objects.select_related('pedido')
    serializer_class = PagoSerializer


class CajaViewSet(mixins.DestroyModelMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [EsAdmin]
    # Sin el prefetch, cada caja del historial resolvia sus totales con sus propias
    # consultas: 22 queries por fila, o ~2.000 para tres meses de turnos.
    queryset = Caja.objects.prefetch_related(
        'pedidos__items__extras', 'pedidos__pagos', 'gastos',
    )
    serializer_class = CajaSerializer

    def get_queryset(self):
        """El historial se filtra por mes (?mes=YYYY-MM).

        Sin filtro devuelve todo, que es como venia: al principio son cuatro turnos,
        pero al año son 300 y la pantalla deja de servir para encontrar un día puntual.
        """
        qs = super().get_queryset()
        mes = self.request.query_params.get('mes')
        if mes:
            try:
                anio, numero = (int(x) for x in mes.split('-'))
                qs = qs.filter(dia__year=anio, dia__month=numero)
            except (ValueError, TypeError):
                pass  # Un mes mal escrito no vacia el historial: se ignora el filtro.
        return qs

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
        caja = Caja.objects.create(
            dia=dia,
            nota_apertura=request.data.get('nota_apertura', ''),
            monto_inicial=request.data.get('monto_inicial') or 0,
            metodo_inicial=request.data.get('metodo_inicial') or 'efectivo',
        )
        return Response(self.get_serializer(caja).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        caja = self.get_object()
        if not caja.esta_abierta:
            return Response(
                {'detail': 'Esta caja ya está cerrada.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Arqueo opcional: si se cuenta el cajon, queda guardado para poder mirar despues
        # de que turno salio una diferencia. Vacio = no se conto.
        #
        # Se convierte a Decimal ACA, en la frontera: `save()` escribe bien en la base
        # pero deja el string crudo en el atributo en memoria, y el serializer despues
        # intenta restarle un Decimal para calcular la diferencia. Ademas, asi un valor
        # no numerico responde 400 en vez de reventar en 500.
        contado = request.data.get('efectivo_contado')
        if contado in (None, ''):
            caja.efectivo_contado = None
        else:
            try:
                caja.efectivo_contado = Decimal(str(contado))
            except (InvalidOperation, ValueError):
                return Response(
                    {'detail': 'El efectivo contado tiene que ser un número.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        caja.cerrada_en = timezone.now()
        caja.nota_cierre = request.data.get('nota_cierre', '')
        caja.save()
        return Response(self.get_serializer(caja).data)
