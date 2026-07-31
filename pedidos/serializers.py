from decimal import Decimal

from rest_framework import serializers
from .models import Pedido, DetallePedido, Localidad
from antojo.models import AntojoDelDia


class LocalidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localidad
        fields = '__all__'


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
    localidad_nombre = serializers.CharField(source='localidad.nombre', read_only=True)
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'telefono', 'tipo_entrega', 'direccion', 'estado', 'creado', 'items',
            'localidad', 'localidad_nombre', 'costo_envio', 'descuento_pct', 'hora_salida', 'subtotal', 'total',
        ]
        extra_kwargs = {
            'localidad': {'required': False, 'allow_null': True},
        }

    def get_subtotal(self, obj):
        return sum(item.cantidad * item.precio_unitario for item in obj.items.all())

    def get_total(self, obj):
        con_envio = self.get_subtotal(obj) + obj.costo_envio
        if obj.descuento_pct:
            descuento = con_envio * Decimal(obj.descuento_pct) / Decimal(100)
            return (con_envio - descuento).quantize(Decimal('1'))
        return con_envio

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError('El pedido necesita al menos un producto.')
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        pedido = Pedido.objects.create(**validated_data)

        antojo_activo = AntojoDelDia.objects.filter(activo=True).first()

        for item in items_data:
            producto = item.get('producto')
            combo = item.get('combo')

            if producto:
                precio_unitario = producto.precio
                if antojo_activo and antojo_activo.producto_id == producto.id:
                    descuento = Decimal(antojo_activo.descuento_pct) / Decimal(100)
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
