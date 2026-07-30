from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers
from .models import Pedido, DetallePedido
from antojo.models import AntojoDelDia


class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.SerializerMethodField()
    combo_nombre = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = DetallePedido
        fields = ['id', 'producto', 'producto_nombre', 'combo', 'combo_nombre', 'cantidad', 'precio_unitario', 'subtotal']
        read_only_fields = ['precio_unitario']
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
            'combo': {'required': False, 'allow_null': True},
        }

    def get_producto_nombre(self, obj):
        return obj.producto.nombre if obj.producto else None

    def get_combo_nombre(self, obj):
        return obj.combo.nombre if obj.combo else None

    def get_subtotal(self, obj):
        return obj.cantidad * obj.precio_unitario

    def validate(self, data):
        producto = data.get('producto')
        combo = data.get('combo')
        if bool(producto) == bool(combo):
            raise serializers.ValidationError('Cada línea del pedido necesita un producto o un combo, no ambos ni ninguno.')
        return data


class PedidoSerializer(serializers.ModelSerializer):
    items = DetallePedidoSerializer(many=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = ['id', 'cliente', 'telefono', 'tipo_entrega', 'direccion', 'estado', 'creado', 'items', 'total']

    def get_total(self, obj):
        return sum(item.cantidad * item.precio_unitario for item in obj.items.all())

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('El pedido necesita al menos un producto.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        pedido = Pedido.objects.create(**validated_data)

        antojo_hoy = AntojoDelDia.objects.filter(fecha=timezone.localdate()).first()

        for item in items_data:
            producto = item.get('producto')
            combo = item.get('combo')

            if producto:
                precio_unitario = producto.precio
                if antojo_hoy and antojo_hoy.producto_id == producto.id:
                    descuento = Decimal(antojo_hoy.descuento_pct) / Decimal(100)
                    precio_unitario = (producto.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))
                DetallePedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    cantidad=item['cantidad'],
                    precio_unitario=precio_unitario,
                )
            else:
                DetallePedido.objects.create(
                    pedido=pedido,
                    combo=combo,
                    cantidad=item['cantidad'],
                    precio_unitario=combo.precio,
                )
        return pedido
