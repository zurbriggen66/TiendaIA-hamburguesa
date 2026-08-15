from decimal import Decimal

from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AntojoDelDia
from .serializers import AntojoDelDiaConfigSerializer


class AntojoDelDiaView(APIView):
    def get(self, request):
        antojo = (
            AntojoDelDia.objects
            .filter(activo=True, producto__isnull=False)
            .select_related('producto', 'producto__categoria')
            .first()
        )
        if not antojo or not antojo.esta_vigente():
            return Response(None)

        producto = antojo.producto
        descuento = Decimal(antojo.descuento_pct) / Decimal(100)
        precio_con_descuento = (producto.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))

        imagen_url = None
        if producto.imagen:
            imagen_url = request.build_absolute_uri(producto.imagen.url)

        return Response({
            'descuento_pct': antojo.descuento_pct,
            'activo_hasta': antojo.activo_hasta,
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


class AntojoDelDiaConfigViewSet(viewsets.ModelViewSet):
    queryset = AntojoDelDia.objects.select_related('producto')
    serializer_class = AntojoDelDiaConfigSerializer
