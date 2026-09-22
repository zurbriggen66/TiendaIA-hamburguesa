from rest_framework import serializers
from .models import AntojoDelDia


class AntojoDelDiaConfigSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    presentacion_nombre = serializers.CharField(source='presentacion.nombre', read_only=True)

    class Meta:
        model = AntojoDelDia
        fields = [
            'id', 'producto', 'producto_nombre', 'presentacion', 'presentacion_nombre',
            'solo_base', 'descuento_pct', 'activo', 'activo_hasta',
        ]
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
            'presentacion': {'required': False, 'allow_null': True},
        }

    def validate(self, data):
        activo = data.get('activo', getattr(self.instance, 'activo', False))
        producto = data.get('producto', getattr(self.instance, 'producto', None))
        presentacion = data.get('presentacion', getattr(self.instance, 'presentacion', None))
        if activo and not producto:
            raise serializers.ValidationError('Elegí un producto para poder activar el Antojo del día.')
        solo_base = data.get('solo_base', getattr(self.instance, 'solo_base', False))
        if solo_base and presentacion:
            raise serializers.ValidationError('Elegí una variante o la clásica, no las dos.')
        if presentacion and producto and presentacion.producto_id != producto.id:
            raise serializers.ValidationError('Esa variante no corresponde al producto elegido.')
        return data
