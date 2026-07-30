from rest_framework import serializers
from .models import Categoria, Producto, Combo


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    insumos_nombres = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = '__all__'

    def get_insumos_nombres(self, obj):
        return [i.nombre for i in obj.insumos.all()]

    def to_internal_value(self, data):
        # El formulario de admin manda 'insumos' vacío como marcador de "sin insumos"
        # cuando no hay ninguno tildado (multipart no permite mandar una clave sin valores);
        # limpiamos esos strings vacíos antes de que DRF intente resolverlos como PK.
        if hasattr(data, 'getlist') and 'insumos' in data:
            # En lugar de data.copy(), habilitamos la mutabilidad del QueryDict directamente
            if hasattr(data, '_mutable'):
                data._mutable = True

            valores = [v for v in data.getlist('insumos') if v not in ('', None)]
            data.setlist('insumos', valores)

        return super().to_internal_value(data)


class ComboSerializer(serializers.ModelSerializer):
    productos_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Combo
        fields = '__all__'

    def get_productos_detalle(self, obj):
        return [{'id': p.id, 'nombre': p.nombre, 'precio': p.precio} for p in obj.productos.all()]

    def validate_productos(self, value):
        if not value:
            raise serializers.ValidationError('El combo necesita al menos un producto.')
        return value
