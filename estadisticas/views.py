from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, F, DecimalField
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from pedidos.models import Pedido, DetallePedido, Pago
from gastos.models import Gasto

MONTO = DecimalField(max_digits=12, decimal_places=2)


class EstadisticasView(APIView):
    def get(self, request):
        desde_periodo = parse_date(request.query_params.get('desde') or '')
        hasta_periodo = parse_date(request.query_params.get('hasta') or '')

        pedidos_validos = Pedido.objects.exclude(estado='cancelado').prefetch_related('items__extras')
        items_validos = DetallePedido.objects.exclude(pedido__estado='cancelado')
        gastos_qs = Gasto.objects.all()

        if desde_periodo:
            pedidos_validos = pedidos_validos.filter(creado__date__gte=desde_periodo)
            items_validos = items_validos.filter(pedido__creado__date__gte=desde_periodo)
            gastos_qs = gastos_qs.filter(fecha__date__gte=desde_periodo)
        if hasta_periodo:
            pedidos_validos = pedidos_validos.filter(creado__date__lte=hasta_periodo)
            items_validos = items_validos.filter(pedido__creado__date__lte=hasta_periodo)
            gastos_qs = gastos_qs.filter(fecha__date__lte=hasta_periodo)

        # El total real de cada pedido (items + envío - descuento) vive en Pedido.calcular_total(),
        # la misma cuenta que ya usa PedidoSerializer — la reusamos para que "ventas totales" no
        # ignore el envío ni el descuento como pasaba sumando solo los items.
        pedidos_lista = list(pedidos_validos)
        totales_por_pedido = {p.id: p.calcular_total() for p in pedidos_lista}

        ventas_totales = sum(totales_por_pedido.values(), Decimal('0'))
        gastos_totales = gastos_qs.aggregate(total=Sum('monto'))['total'] or 0
        total_pedidos = len(pedidos_lista)
        ticket_promedio = (ventas_totales / total_pedidos) if total_pedidos else 0

        if desde_periodo and hasta_periodo:
            pedidos_para_grafico = pedidos_lista
        else:
            desde_grafico = (timezone.now() - timedelta(days=14)).date()
            pedidos_para_grafico = [p for p in pedidos_lista if timezone.localtime(p.creado).date() >= desde_grafico]

        por_dia = defaultdict(lambda: Decimal('0'))
        for p in pedidos_para_grafico:
            dia = timezone.localtime(p.creado).date()
            por_dia[dia] += totales_por_pedido[p.id]

        productos_mas_vendidos_qs = (
            items_validos.filter(producto__isnull=False)
            .values('producto__id', 'producto__nombre')
            .annotate(
                cantidad_total=Sum('cantidad'),
                total=Sum(F('cantidad') * F('precio_unitario'), output_field=MONTO),
            )
            .order_by('-cantidad_total')[:5]
        )

        return Response({
            'ventas_totales': ventas_totales,
            'gastos_totales': gastos_totales,
            'ganancia_neta': ventas_totales - gastos_totales,
            'total_pedidos': total_pedidos,
            'ticket_promedio': ticket_promedio,
            'ventas_por_dia': [
                {'dia': dia, 'total': por_dia[dia]} for dia in sorted(por_dia.keys())
            ],
            'productos_mas_vendidos': [
                {
                    'producto_id': p['producto__id'],
                    'producto_nombre': p['producto__nombre'],
                    'cantidad_total': p['cantidad_total'],
                    'total': p['total'],
                }
                for p in productos_mas_vendidos_qs
            ],
        })


class HoyView(APIView):
    def get(self, request):
        hoy = timezone.localtime().date()
        pedidos_totales_hoy = Pedido.objects.exclude(estado='cancelado').filter(creado__date=hoy)
        pedidos_salidos_hoy = pedidos_totales_hoy.filter(estado__in=['listo', 'entregado']).select_related('localidad')

        pedidos_data = [
            {
                'id': pedido.id,
                'cliente': pedido.cliente,
                'tipo_entrega': pedido.tipo_entrega,
                'hora_salida': pedido.hora_salida.isoformat() if pedido.hora_salida else None,
                'creado': pedido.creado.isoformat(),
                'estado': pedido.estado,
                'total': float(pedido.calcular_total()),
            }
            for pedido in pedidos_salidos_hoy
        ]

        ventas_totales_hoy = sum((pedido.calcular_total() for pedido in pedidos_totales_hoy), Decimal('0'))

        return Response({
            'ventas_totales': float(ventas_totales_hoy),
            'pedidos': pedidos_data,
        })


class CobranzasView(APIView):
    def get(self, request):
        desde_periodo = parse_date(request.query_params.get('desde') or '')
        hasta_periodo = parse_date(request.query_params.get('hasta') or '')

        pagos_qs = Pago.objects.all()
        if desde_periodo:
            pagos_qs = pagos_qs.filter(creado__date__gte=desde_periodo)
        if hasta_periodo:
            pagos_qs = pagos_qs.filter(creado__date__lte=hasta_periodo)

        por_metodo_qs = pagos_qs.values('metodo').annotate(total=Sum('monto')).order_by('-total')
        etiquetas_metodo = dict(Pago.METODOS)
        por_metodo = [
            {'metodo': m['metodo'], 'metodo_label': etiquetas_metodo.get(m['metodo'], m['metodo']), 'total': m['total']}
            for m in por_metodo_qs if m['total']
        ]
        total_cobrado = sum((m['total'] for m in por_metodo), Decimal('0'))

        # El estado de cobro es una foto del presente, no se filtra por período.
        pedidos_activos = Pedido.objects.exclude(estado='cancelado').prefetch_related('items__extras', 'pagos')
        pedidos_pendientes = []
        for pedido in pedidos_activos:
            estado_cobro = pedido.calcular_estado_cobro()
            if estado_cobro == 'pagado':
                continue
            total = pedido.calcular_total()
            cobrado = pedido.calcular_cobrado()
            pedidos_pendientes.append({
                'id': pedido.id,
                'cliente': pedido.cliente,
                'total': total,
                'cobrado': cobrado,
                'falta': total - cobrado,
                'estado_cobro': estado_cobro,
            })
        pedidos_pendientes.sort(key=lambda p: p['id'], reverse=True)

        return Response({
            'total_cobrado': total_cobrado,
            'por_metodo': por_metodo,
            'pedidos_pendientes': pedidos_pendientes,
        })
