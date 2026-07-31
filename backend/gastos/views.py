from django.db.models import ProtectedError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Insumo, Gasto
from .serializers import InsumoSerializer, GastoSerializer


class InsumoViewSet(viewsets.ModelViewSet):
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


class GastoViewSet(viewsets.ModelViewSet):
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
