from datetime import timedelta

from django.db.models import Sum, F, DecimalField
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.response import Response
from rest_framework.views import APIView

from pedidos.models import DetallePedido
from gastos.models import Gasto

MONTO = DecimalField(max_digits=12, decimal_places=2)


class EstadisticasView(APIView):
    def get(self, request):
        desde_periodo = parse_date(request.query_params.get('desde') or '')
        hasta_periodo = parse_date(request.query_params.get('hasta') or '')

        items_validos = DetallePedido.objects.exclude(pedido__estado='cancelado')
        gastos_qs = Gasto.objects.all()

        if desde_periodo:
            items_validos = items_validos.filter(pedido__creado__date__gte=desde_periodo)
            gastos_qs = gastos_qs.filter(fecha__date__gte=desde_periodo)
        if hasta_periodo:
            items_validos = items_validos.filter(pedido__creado__date__lte=hasta_periodo)
            gastos_qs = gastos_qs.filter(fecha__date__lte=hasta_periodo)

        ventas_totales = items_validos.aggregate(
            total=Sum(F('cantidad') * F('precio_unitario'), output_field=MONTO)
        )['total'] or 0

        gastos_totales = gastos_qs.aggregate(total=Sum('monto'))['total'] or 0

        total_pedidos = (
            items_validos.values('pedido_id').distinct().count()
        )
        ticket_promedio = (ventas_totales / total_pedidos) if total_pedidos else 0

        if desde_periodo and hasta_periodo:
            ventas_por_dia_qs = (
                items_validos
                .annotate(dia=TruncDate('pedido__creado'))
                .values('dia')
                .annotate(total=Sum(F('cantidad') * F('precio_unitario'), output_field=MONTO))
                .order_by('dia')
            )
        else:
            desde_grafico = timezone.now() - timedelta(days=14)
            ventas_por_dia_qs = (
                items_validos.filter(pedido__creado__gte=desde_grafico)
                .annotate(dia=TruncDate('pedido__creado'))
                .values('dia')
                .annotate(total=Sum(F('cantidad') * F('precio_unitario'), output_field=MONTO))
                .order_by('dia')
            )

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
                {'dia': v['dia'], 'total': v['total']} for v in ventas_por_dia_qs
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
