from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum, F, DecimalField
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from pedidos.models import Pedido, DetallePedido, DetalleExtra, Pago, Caja
from gastos.models import Gasto

MONTO = DecimalField(max_digits=12, decimal_places=2)


class EstadisticasView(APIView):
    def get(self, request):
        desde_periodo = parse_date(request.query_params.get('desde') or '')
        hasta_periodo = parse_date(request.query_params.get('hasta') or '')

        # Un pedido de la tienda web que todavía no fue confirmado por el dueño no es una
        # venta real todavía (puede que el cliente nunca haya mandado el WhatsApp) — no
        # cuenta acá, igual que no cuenta en la caja ni en el dashboard de "Inicio".
        pedidos_validos = Pedido.objects.filter(confirmado=True).exclude(estado='cancelado')
        items_validos = DetallePedido.objects.filter(pedido__confirmado=True).exclude(pedido__estado='cancelado')
        gastos_qs = Gasto.objects.all()

        if desde_periodo:
            pedidos_validos = pedidos_validos.filter(creado__date__gte=desde_periodo)
            items_validos = items_validos.filter(pedido__creado__date__gte=desde_periodo)
            gastos_qs = gastos_qs.filter(fecha__date__gte=desde_periodo)
        if hasta_periodo:
            pedidos_validos = pedidos_validos.filter(creado__date__lte=hasta_periodo)
            items_validos = items_validos.filter(pedido__creado__date__lte=hasta_periodo)
            gastos_qs = gastos_qs.filter(fecha__date__lte=hasta_periodo)

        # El total real de cada pedido (items + extras + envío - descuento) es la misma cuenta
        # que Pedido.calcular_total(), pero acá la hacemos a mano sobre filas livianas
        # (values()) en vez de instanciar objetos completos de Pedido/DetallePedido/
        # DetalleExtra con prefetch_related — con años de historial, traer y armar esos
        # objetos completos es lo que hace lenta a "General" (que no tiene rango de fecha
        # y por eso no se puede acotar). Así, "General" crece mucho más lento con el tiempo,
        # y el resultado es matemáticamente idéntico al de antes.
        pedidos_datos = list(pedidos_validos.values('id', 'creado', 'costo_envio', 'descuento_pct'))

        extras_por_item = defaultdict(lambda: Decimal('0'))
        for fila in DetalleExtra.objects.filter(detalle_pedido__pedido__in=pedidos_validos).values('detalle_pedido_id', 'precio_unitario', 'cantidad'):
            extras_por_item[fila['detalle_pedido_id']] += fila['precio_unitario'] * fila['cantidad']

        subtotal_por_pedido = defaultdict(lambda: Decimal('0'))
        for fila in DetallePedido.objects.filter(pedido__in=pedidos_validos).values('id', 'pedido_id', 'precio_unitario', 'cantidad'):
            precio_por_unidad = fila['precio_unitario'] + extras_por_item[fila['id']]
            subtotal_por_pedido[fila['pedido_id']] += fila['cantidad'] * precio_por_unidad

        def calcular_total(pedido):
            con_envio = subtotal_por_pedido[pedido['id']] + pedido['costo_envio']
            if pedido['descuento_pct']:
                descuento = con_envio * Decimal(pedido['descuento_pct']) / Decimal(100)
                return (con_envio - descuento).quantize(Decimal('1'))
            return con_envio

        totales_por_pedido = {p['id']: calcular_total(p) for p in pedidos_datos}

        ventas_totales = sum(totales_por_pedido.values(), Decimal('0'))
        gastos_totales = gastos_qs.aggregate(total=Sum('monto'))['total'] or 0
        total_pedidos = len(pedidos_datos)
        ticket_promedio = (ventas_totales / total_pedidos) if total_pedidos else 0

        if desde_periodo and hasta_periodo:
            pedidos_para_grafico = pedidos_datos
        else:
            desde_grafico = (timezone.now() - timedelta(days=14)).date()
            pedidos_para_grafico = [p for p in pedidos_datos if timezone.localtime(p['creado']).date() >= desde_grafico]

        por_dia = defaultdict(lambda: Decimal('0'))
        for p in pedidos_para_grafico:
            dia = timezone.localtime(p['creado']).date()
            por_dia[dia] += totales_por_pedido[p['id']]

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
        caja = Caja.objects.filter(cerrada_en__isnull=True).order_by('-abierta_en').first()
        pedidos_por_confirmar = Pedido.objects.filter(
            origen='web', confirmado=False,
        ).exclude(estado='cancelado').count()

        if not caja:
            return Response({
                'caja_abierta': False,
                'caja': None,
                'ventas_totales': 0,
                'ticket_promedio': 0,
                'total_pedidos': 0,
                'pedidos_por_confirmar': pedidos_por_confirmar,
                'pedidos': [],
            })

        pedidos_totales = Pedido.objects.filter(caja=caja, confirmado=True).exclude(estado='cancelado')

        # Los "últimos pedidos de la caja" muestran cualquier estado (no solo listo/entregado)
        # para que el dueño vea todo lo que entró desde que abrió, con un tope para no
        # mandar una lista gigante en un turno muy activo.
        ultimos_pedidos = pedidos_totales.select_related('localidad').order_by('-creado')[:20]

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
            for pedido in ultimos_pedidos
        ]

        totales = [pedido.calcular_total() for pedido in pedidos_totales]
        ventas_totales = sum(totales, Decimal('0'))
        ticket_promedio = (ventas_totales / len(totales)) if totales else 0

        return Response({
            'caja_abierta': True,
            'caja': {'id': caja.id, 'dia': caja.dia.isoformat(), 'abierta_en': caja.abierta_en.isoformat()},
            'ventas_totales': float(ventas_totales),
            'ticket_promedio': float(ticket_promedio),
            'total_pedidos': len(totales),
            'pedidos_por_confirmar': pedidos_por_confirmar,
            'pedidos': pedidos_data,
        })


class CobranzasView(APIView):
    def get(self, request):
        desde_periodo = parse_date(request.query_params.get('desde') or '')
        hasta_periodo = parse_date(request.query_params.get('hasta') or '')
        caja_id = request.query_params.get('caja')

        pagos_qs = Pago.objects.all()
        if caja_id:
            pagos_qs = pagos_qs.filter(pedido__caja_id=caja_id)
        else:
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

        # El estado de cobro es una foto del presente, no se filtra por período. Tampoco
        # incluye pedidos web sin confirmar todavía: no tiene sentido pedir que se cobre
        # algo que el dueño ni siquiera validó como una venta real.
        pedidos_activos = Pedido.objects.filter(confirmado=True).exclude(estado='cancelado').prefetch_related('items__extras', 'pagos')
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
