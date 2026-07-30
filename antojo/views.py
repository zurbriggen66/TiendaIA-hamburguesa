from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from productos.models import Producto
from pedidos.models import DetallePedido
from .models import AntojoDelDia


class AntojoDelDiaView(APIView):
    def get(self, request):
        hoy = timezone.localdate()
        antojo = AntojoDelDia.objects.filter(fecha=hoy).select_related('producto', 'producto__categoria').first()
        if not antojo:
            antojo = self._calcular_antojo(hoy)
        if not antojo:
            return Response(None)

        producto = antojo.producto
        descuento = Decimal(antojo.descuento_pct) / Decimal(100)
        precio_con_descuento = (producto.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))

        imagen_url = None
        if producto.imagen:
            imagen_url = request.build_absolute_uri(producto.imagen.url)

        return Response({
            'fecha': antojo.fecha,
            'descuento_pct': antojo.descuento_pct,
            'motivo': antojo.motivo,
            'producto': {
                'id': producto.id,
                'nombre': producto.nombre,
                'descripcion': producto.descripcion,
                'imagen': imagen_url,
                'categoria_nombre': producto.categoria.nombre,
            },
            'precio_original': producto.precio,
            'precio_con_descuento': precio_con_descuento,
        })

    def _calcular_antojo(self, hoy):
        productos = list(
            Producto.objects.filter(es_extra=False)
            .prefetch_related('insumos')
            .select_related('categoria')
        )
        if not productos:
            return None

        desde = timezone.now() - timedelta(days=14)
        ventas_qs = (
            DetallePedido.objects
            .exclude(pedido__estado='cancelado')
            .filter(pedido__creado__gte=desde)
            .values('producto_id')
            .annotate(total=Sum('cantidad'))
        )
        ventas_por_producto = {v['producto_id']: v['total'] for v in ventas_qs}

        candidatos = []
        for producto in productos:
            vendidos = ventas_por_producto.get(producto.id, 0)
            insumos = list(producto.insumos.all())
            stock_bonus = (
                sum(float(i.cantidad_disponible) for i in insumos) / len(insumos)
                if insumos else 0.0
            )
            candidatos.append({
                'producto': producto,
                'vendidos': vendidos,
                'stock_bonus': stock_bonus,
                'insumos': insumos,
            })

        max_vendidos = max((c['vendidos'] for c in candidatos), default=0) or 1
        max_stock = max((c['stock_bonus'] for c in candidatos), default=0) or 1

        elegido = None
        mejor_score = -1
        for c in candidatos:
            ventas_norm = c['vendidos'] / max_vendidos
            stock_norm = c['stock_bonus'] / max_stock
            score = 0.6 * (1 - ventas_norm) + 0.4 * stock_norm
            if score > mejor_score:
                mejor_score = score
                elegido = c

        partes_motivo = []
        if elegido['vendidos'] == 0:
            partes_motivo.append('todavía no tuvo ventas')
        elif elegido['vendidos'] <= max_vendidos * 0.3:
            partes_motivo.append('vendió poco en los últimos 14 días')
        if elegido['insumos'] and elegido['stock_bonus'] >= max_stock * 0.5:
            nombres = ', '.join(i.nombre for i in elegido['insumos'])
            partes_motivo.append(f'stock alto de {nombres}')
        motivo = ' + '.join(partes_motivo) if partes_motivo else 'Elegido del menú de hoy'

        return AntojoDelDia.objects.create(
            fecha=hoy,
            producto=elegido['producto'],
            descuento_pct=15,
            motivo=motivo,
        )
