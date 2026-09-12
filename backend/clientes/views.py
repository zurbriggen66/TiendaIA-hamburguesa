from collections import defaultdict
from decimal import Decimal

from django.contrib.auth import authenticate
from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import EsAdmin, EsAdminOSoloLectura
from pedidos.models import Pedido
from pedidos.serializers import DetallePedidoSerializer
from .models import Cliente, Recompensa
from .serializers import ClienteConComprasSerializer, ClienteSerializer, RecompensaSerializer, RegistroSerializer

ITEMS_DEL_PEDIDO = ('items__producto', 'items__presentacion', 'items__combo', 'items__extras__extra')


def cuenta_como_compra(pedido):
    """Lo que suma al acumulado de un cliente: confirmado y no cancelado. Un pedido web
    que el local nunca confirmó puede no haber existido, no es plata que entró."""
    return pedido.confirmado and pedido.estado != 'cancelado'


def pedido_resumido(pedido):
    # Los items traen ids de producto, variante, combo y extras: con eso la tienda
    # puede volver a armar el carrito ("Repetir pedido") con los precios de hoy.
    return {
        'id': pedido.id,
        'creado': pedido.creado,
        'estado': pedido.estado,
        'confirmado': pedido.confirmado,
        'origen': pedido.origen,
        'tipo_entrega': pedido.tipo_entrega,
        'total': pedido.calcular_total(),
        'puntos_usados': pedido.puntos_usados,
        'recompensa_nombre': pedido.recompensa_nombre,
        'items': DetallePedidoSerializer(pedido.items.all(), many=True).data,
    }


def _nombre_item(item):
    if item.combo_id:
        return f'Combo {item.combo.nombre}'
    nombre = item.producto.nombre if item.producto_id else 'Producto'
    return f'{nombre} {item.presentacion.nombre}' if item.presentacion_id else nombre


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


class MisPedidosView(APIView):
    """Los pedidos que hizo el cliente logueado con su cuenta, para verlos y repetirlos."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        cliente = getattr(request.user, 'cliente', None)
        if not cliente:
            return Response({'detail': 'Esta cuenta no es de un cliente.'}, status=status.HTTP_403_FORBIDDEN)
        pedidos = (cliente.pedidos.exclude(estado='cancelado')
                   .prefetch_related(*ITEMS_DEL_PEDIDO).order_by('-creado')[:20])
        return Response([pedido_resumido(p) for p in pedidos])


class ClienteViewSet(viewsets.ReadOnlyModelViewSet):
    """Listado para el admin del negocio."""

    permission_classes = [EsAdmin]
    queryset = Cliente.objects.select_related('usuario')
    serializer_class = ClienteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list':
            compras = (Pedido.objects.filter(confirmado=True).exclude(estado='cancelado')
                       .prefetch_related('items__extras').order_by('-creado'))
            queryset = queryset.prefetch_related(Prefetch('pedidos', queryset=compras, to_attr='compras'))
        return queryset

    def get_serializer_class(self):
        return ClienteConComprasSerializer if self.action == 'list' else ClienteSerializer

    @action(detail=True, methods=['get'])
    def resumen(self, request, pk=None):
        """Todo lo de un cliente en un lugar: cuánto compró, qué, cuándo y cada pedido."""
        cliente = self.get_object()
        pedidos = list(cliente.pedidos.prefetch_related(*ITEMS_DEL_PEDIDO).order_by('-creado'))
        compras = [p for p in pedidos if cuenta_como_compra(p)]
        total = sum((p.calcular_total() for p in compras), Decimal('0'))

        favoritos = defaultdict(lambda: {'unidades': 0, 'gastado': Decimal('0')})
        for pedido in compras:
            for item in pedido.items.all():
                fila = favoritos[_nombre_item(item)]
                fila['unidades'] += item.cantidad
                fila['gastado'] += item.calcular_subtotal()
        top = sorted(
            ({'nombre': nombre, **datos} for nombre, datos in favoritos.items()),
            key=lambda f: (-f['unidades'], -f['gastado']),
        )[:5]

        return Response({
            'cliente': ClienteSerializer(cliente).data,
            'total_comprado': total,
            'cantidad_pedidos': len(compras),
            'ticket_promedio': (total / len(compras)).quantize(Decimal('1')) if compras else 0,
            'primera_compra': compras[-1].creado if compras else None,
            'ultima_compra': compras[0].creado if compras else None,
            'puntos_canjeados': sum(p.puntos_usados or 0 for p in compras),
            'favoritos': top,
            'pedidos': [{**pedido_resumido(p), 'cuenta_como_compra': cuenta_como_compra(p)} for p in pedidos[:100]],
        })


class RecompensaViewSet(viewsets.ModelViewSet):
    """La tienda necesita leer el catálogo para ofrecerlo; editarlo es solo del admin."""

    permission_classes = [EsAdminOSoloLectura]
    queryset = Recompensa.objects.all()
    serializer_class = RecompensaSerializer
