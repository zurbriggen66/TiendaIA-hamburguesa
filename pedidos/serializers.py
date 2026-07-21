from rest_framework import serializers
from .models import Pedido, DetallePedido


class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = DetallePedido
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'precio_unitario', 'subtotal']
        read_only_fields = ['precio_unitario']

    def get_subtotal(self, obj):
        return obj.cantidad * obj.precio_unitario


class PedidoSerializer(serializers.ModelSerializer):
    items = DetallePedidoSerializer(many=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = ['id', 'cliente', 'estado', 'creado', 'items', 'total']

    def get_total(self, obj):
        return sum(item.cantidad * item.precio_unitario for item in obj.items.all())

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('El pedido necesita al menos un producto.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        pedido = Pedido.objects.create(**validated_data)
        for item in items_data:
            producto = item['producto']
            DetallePedido.objects.create(
                pedido=pedido,
                producto=producto,
                cantidad=item['cantidad'],
                precio_unitario=producto.precio,
            )
        return pedido
