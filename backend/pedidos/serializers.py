from decimal import Decimal

from rest_framework import serializers
from .models import Pedido, DetallePedido, DetalleExtra, Localidad, Pago
from productos.models import Producto
from antojo.models import AntojoDelDia


class LocalidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localidad
        fields = '__all__'


class PagoSerializer(serializers.ModelSerializer):
    metodo_label = serializers.CharField(source='get_metodo_display', read_only=True)

    class Meta:
        model = Pago
        fields = ['id', 'pedido', 'metodo', 'metodo_label', 'monto', 'creado']


class ExtraSeleccionadoSerializer(serializers.Serializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.filter(es_extra=True))


class DetallePedidoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.SerializerMethodField()
    combo_nombre = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    extras_detalle = serializers.SerializerMethodField()
    extras = ExtraSeleccionadoSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = DetallePedido
        fields = [
            'id', 'producto', 'producto_nombre', 'combo', 'combo_nombre', 'cantidad',
            'precio_unitario', 'subtotal', 'extras_detalle', 'extras',
        ]
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
        return obj.calcular_subtotal()

    def get_extras_detalle(self, obj):
        return [
            {'producto': e.extra_id, 'nombre': e.extra.nombre, 'precio_unitario': e.precio_unitario}
            for e in obj.extras.select_related('extra').all()
        ]

    def validate(self, data):
        producto = data.get('producto')
        combo = data.get('combo')
        if bool(producto) == bool(combo):
            raise serializers.ValidationError('Cada línea del pedido necesita un producto o un combo, no ambos ni ninguno.')
        if combo and data.get('extras'):
            raise serializers.ValidationError('Los extras solo se pueden agregar a líneas de producto, no de combo.')
        return data


class PedidoSerializer(serializers.ModelSerializer):
    items = DetallePedidoSerializer(many=True)
    localidad_nombre = serializers.CharField(source='localidad.nombre', read_only=True)
    pagos = PagoSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    cobrado = serializers.SerializerMethodField()
    estado_cobro = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'telefono', 'tipo_entrega', 'direccion', 'estado', 'creado', 'items',
            'localidad', 'localidad_nombre', 'costo_envio', 'descuento_pct', 'hora_salida', 'nota',
            'pagos', 'subtotal', 'total', 'cobrado', 'estado_cobro',
        ]
        extra_kwargs = {
            'localidad': {'required': False, 'allow_null': True},
        }

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()

    def get_total(self, obj):
        return obj.calcular_total()

    def get_cobrado(self, obj):
        return obj.calcular_cobrado()

    def get_estado_cobro(self, obj):
        return obj.calcular_estado_cobro()

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
            extras_data = item.get('extras', [])

            if producto:
                precio_unitario = producto.precio
                if antojo_activo and antojo_activo.producto_id == producto.id:
                    descuento = Decimal(antojo_activo.descuento_pct) / Decimal(100)
                    precio_unitario = (producto.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))
                detalle = DetallePedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    cantidad=item['cantidad'],
                    precio_unitario=precio_unitario,
                )
                for extra_sel in extras_data:
                    extra_producto = extra_sel['producto']
                    DetalleExtra.objects.create(
                        detalle_pedido=detalle,
                        extra=extra_producto,
                        precio_unitario=extra_producto.precio,
                    )
            else:
                DetallePedido.objects.create(
                    pedido=pedido,
                    combo=combo,
                    cantidad=item['cantidad'],
                    precio_unitario=combo.precio,
                )
        return pedido
