from decimal import Decimal

from django.db.models import ProtectedError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import EsAdmin
from .models import Insumo, Gasto, GastoFijo
from .serializers import InsumoSerializer, GastoSerializer, GastoFijoSerializer


class InsumoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Insumo.objects.all()
    serializer_class = InsumoSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar el insumo porque está vinculado a productos existentes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        """Compras registradas de este insumo (Gasto con categoria='insumos' que lo
        referencia), para ver cuánto se le viene pagando y cuándo fue la última vez."""
        insumo = self.get_object()
        compras = insumo.gastos.filter(categoria='insumos').order_by('-fecha')

        total_gastado = sum((c.monto for c in compras), Decimal('0'))
        total_cantidad = sum((c.cantidad or Decimal('0') for c in compras), Decimal('0'))
        precio_promedio = (total_gastado / total_cantidad) if total_cantidad else None

        ultima = compras.first()
        ultimo_precio = (ultima.monto / ultima.cantidad) if ultima and ultima.cantidad else None

        return Response({
            'total_gastado': total_gastado,
            'total_cantidad': total_cantidad,
            'precio_promedio_unidad': precio_promedio,
            'ultimo_precio_unidad': ultimo_precio,
            'compras': [
                {
                    'id': c.id,
                    'fecha': c.fecha,
                    'cantidad': c.cantidad,
                    'monto': c.monto,
                    'precio_unidad': (c.monto / c.cantidad) if c.cantidad else None,
                    'metodo_pago_label': c.get_metodo_pago_display(),
                    'descripcion': c.descripcion,
                }
                for c in compras[:20]
            ],
        })


class GastoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = Gasto.objects.select_related('insumo')
    serializer_class = GastoSerializer

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        gastos = self.get_queryset()
        total = sum(g.monto for g in gastos)
        por_categoria = []
        for clave, etiqueta in Gasto.CATEGORIAS:
            monto_categoria = sum(g.monto for g in gastos if g.categoria == clave)
            por_categoria.append({'categoria': clave, 'categoria_label': etiqueta, 'total': monto_categoria})
        return Response({'total': total, 'por_categoria': por_categoria})


class GastoFijoViewSet(viewsets.ModelViewSet):
    permission_classes = [EsAdmin]
    queryset = GastoFijo.objects.all()
    serializer_class = GastoFijoSerializer

    @action(detail=True, methods=['post'])
    def pagar(self, request, pk=None):
        gasto_fijo = self.get_object()
        # Se crea el Gasto real para que impacte en Estadísticas/ganancia neta,
        # y recién después se corre la fecha al próximo vencimiento.
        Gasto.objects.create(
            categoria=gasto_fijo.categoria,
            descripcion=gasto_fijo.nombre,
            monto=gasto_fijo.monto,
            metodo_pago=request.data.get('metodo_pago') or 'efectivo',
        )
        gasto_fijo.avanzar_vencimiento()
        return Response(self.get_serializer(gasto_fijo).data)

    @action(detail=False, methods=['get'])
    def alertas(self, request):
        activos = self.get_queryset().filter(activo=True)
        total_pendiente = sum((g.monto for g in activos), Decimal('0'))
        return Response({
            'total_pendiente': total_pendiente,
            'gastos': self.get_serializer(activos, many=True).data,
        })
