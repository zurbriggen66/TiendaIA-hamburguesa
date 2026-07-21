from rest_framework import serializers
from .models import Insumo, Gasto


class InsumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insumo
        fields = '__all__'


class GastoSerializer(serializers.ModelSerializer):
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)

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
