from rest_framework import serializers
from .models import Insumo, Gasto, GastoFijo


class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = '__all__'

    def validate_cantidad_disponible(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError('El mínimo no puede ser negativo.')
        return value


class GastoSerializer(serializers.ModelSerializer):
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    metodo_pago_label = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    categoria_label = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model = Gasto
        fields = '__all__'

    def create(self, validated_data):
        gasto = Gasto.objects.create(**validated_data)
        insumo = gasto.insumo
        if gasto.categoria == 'insumos' and insumo and gasto.cantidad:
            insumo.cantidad_disponible += gasto.cantidad
            insumo.save()
        return gasto


class GastoFijoSerializer(serializers.ModelSerializer):
    categoria_label = serializers.CharField(source='get_categoria_display', read_only=True)
    frecuencia_label = serializers.CharField(source='get_frecuencia_display', read_only=True)
    dias_restantes = serializers.SerializerMethodField()
    esta_por_vencer = serializers.SerializerMethodField()

    class Meta:
        model = GastoFijo
        fields = [
            'id', 'nombre', 'categoria', 'categoria_label', 'monto', 'frecuencia',
            'frecuencia_label', 'proximo_vencimiento', 'dias_aviso', 'activo',
            'dias_restantes', 'esta_por_vencer', 'creado',
        ]

    def get_dias_restantes(self, obj):
        return obj.dias_restantes()

    def get_esta_por_vencer(self, obj):
        return obj.esta_por_vencer()
