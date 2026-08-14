import json

from rest_framework import serializers
from .models import Categoria, Producto, Combo, ProductoInsumo, ComboItem


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    insumos_detalle = serializers.SerializerMethodField()
    insumos_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    descuento_activo = serializers.SerializerMethodField()
    precio_actual = serializers.SerializerMethodField()
    precio_sugerido_carrito = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id', 'categoria', 'categoria_nombre', 'nombre', 'descripcion', 'precio',
            'imagen', 'destacado', 'es_extra', 'insumos_detalle', 'insumos_json',
            'descuento_pct', 'descuento_hasta', 'descuento_activo', 'precio_actual',
            'sugerido_carrito', 'descuento_carrito_pct', 'precio_sugerido_carrito', 'creado',
        ]

    def get_descuento_activo(self, obj):
        return obj.tiene_descuento_activo()

    def get_precio_actual(self, obj):
        return obj.precio_actual()

    def get_precio_sugerido_carrito(self, obj):
        return obj.precio_sugerido_carrito()

    def get_insumos_detalle(self, obj):
        return [
            {
                'insumo': detalle.insumo_id,
                'nombre': detalle.insumo.nombre,
                'unidad': detalle.insumo.unidad,
                'cantidad': detalle.cantidad,
            }
            for detalle in obj.detalle_insumos.select_related('insumo').all()
        ]

    def _guardar_insumos(self, producto, insumos_json):
        if insumos_json is None:
            return
        try:
            filas = json.loads(insumos_json) if insumos_json else []
        except (TypeError, ValueError):
            raise serializers.ValidationError({'insumos_json': 'Formato inválido.'})

        ProductoInsumo.objects.filter(producto=producto).delete()
        nuevas = [
            ProductoInsumo(producto=producto, insumo_id=fila['insumo'], cantidad=fila.get('cantidad') or 1)
            for fila in filas if fila.get('insumo')
        ]
        ProductoInsumo.objects.bulk_create(nuevas)

    def create(self, validated_data):
        insumos_json = validated_data.pop('insumos_json', None)
        producto = Producto.objects.create(**validated_data)
        self._guardar_insumos(producto, insumos_json)
        return producto

    def update(self, instance, validated_data):
        insumos_json = validated_data.pop('insumos_json', None)
        producto = super().update(instance, validated_data)
        self._guardar_insumos(producto, insumos_json)
        return producto


class ComboSerializer(serializers.ModelSerializer):
    productos_detalle = serializers.SerializerMethodField()
    productos_json = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Combo
        fields = [
            'id', 'nombre', 'descripcion', 'precio', 'imagen', 'activo',
            'productos_detalle', 'productos_json', 'creado',
        ]

    def get_productos_detalle(self, obj):
        return [
            {
                'id': item.producto_id,
                'nombre': item.producto.nombre,
                'precio': item.producto.precio,
                'cantidad': item.cantidad,
            }
            for item in obj.items.select_related('producto').all()
        ]

    def _guardar_items(self, combo, productos_json, requerido=False):
        try:
            filas = json.loads(productos_json) if productos_json else []
        except (TypeError, ValueError):
            raise serializers.ValidationError({'productos_json': 'Formato inválido.'})

        if requerido and not filas:
            raise serializers.ValidationError({'productos_json': 'El combo necesita al menos un producto.'})

        ComboItem.objects.filter(combo=combo).delete()
        nuevos = [
            ComboItem(combo=combo, producto_id=fila['producto'], cantidad=fila.get('cantidad') or 1)
            for fila in filas if fila.get('producto')
        ]
        ComboItem.objects.bulk_create(nuevos)

    def create(self, validated_data):
        productos_json = validated_data.pop('productos_json', '')
        combo = Combo.objects.create(**validated_data)
        self._guardar_items(combo, productos_json, requerido=True)
        return combo

    def update(self, instance, validated_data):
        productos_json = validated_data.pop('productos_json', None)
        combo = super().update(instance, validated_data)
        if productos_json is not None:
            self._guardar_items(combo, productos_json, requerido=True)
        return combo
