from django.db.models import ProtectedError
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from .models import Categoria, Producto, Combo
from .serializers import CategoriaSerializer, ProductoSerializer, ComboSerializer


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar la categoría porque tiene productos asociados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        categoria_id = self.request.query_params.get('categoria')
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar el producto porque aparece en pedidos existentes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ComboViewSet(viewsets.ModelViewSet):
    queryset = Combo.objects.prefetch_related('productos')
    serializer_class = ComboSerializer

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'No se puede eliminar el combo porque aparece en pedidos existentes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
