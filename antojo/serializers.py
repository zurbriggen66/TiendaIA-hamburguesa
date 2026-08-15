from rest_framework import serializers
from .models import AntojoDelDia


class AntojoDelDiaConfigSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = AntojoDelDia
        fields = ['id', 'producto', 'producto_nombre', 'descuento_pct', 'activo', 'activo_hasta']
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        activo = data.get('activo', getattr(self.instance, 'activo', False))
        producto = data.get('producto', getattr(self.instance, 'producto', None))
        if activo and not producto:
            raise serializers.ValidationError('Elegí un producto para poder activar el Antojo del día.')
        return data
