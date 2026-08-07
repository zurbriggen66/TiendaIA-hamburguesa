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
    cantidad = serializers.IntegerField(min_value=1, default=1)


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
            'precio_unitario', 'descuento_pct', 'subtotal', 'extras_detalle', 'extras',
        ]
        read_only_fields = ['precio_unitario', 'descuento_pct']
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
            {'producto': e.extra_id, 'nombre': e.extra.nombre, 'cantidad': e.cantidad, 'precio_unitario': e.precio_unitario}
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


def calcular_precio_producto(producto, antojo_activo):
    candidatos = []
    if producto.tiene_descuento_activo():
        candidatos.append((producto.descuento_pct, producto.precio_actual()))
    if antojo_activo and antojo_activo.producto_id == producto.id:
        descuento = Decimal(antojo_activo.descuento_pct) / Decimal(100)
        precio_antojo = (producto.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))
        candidatos.append((antojo_activo.descuento_pct, precio_antojo))

    if candidatos:
        return min(candidatos, key=lambda c: c[1])
    return 0, producto.precio


def mover_stock_item(item, signo):
    if item.producto_id:
        item.producto.ajustar_stock(signo * item.cantidad)
        for extra in item.extras.all():
            extra.extra.ajustar_stock(signo * extra.cantidad * item.cantidad)
    elif item.combo_id:
        for ci in item.combo.items.select_related('producto'):
            ci.producto.ajustar_stock(signo * ci.cantidad * item.cantidad)


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
                descuento_pct_aplicado, precio_unitario = calcular_precio_producto(producto, antojo_activo)
                detalle = DetallePedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    cantidad=item['cantidad'],
                    precio_unitario=precio_unitario,
                    descuento_pct=descuento_pct_aplicado,
                )
                for extra_sel in extras_data:
                    extra_producto = extra_sel['producto']
                    DetalleExtra.objects.create(
                        detalle_pedido=detalle,
                        extra=extra_producto,
                        cantidad=extra_sel.get('cantidad', 1),
                        precio_unitario=extra_producto.precio,
                    )
            else:
                detalle = DetallePedido.objects.create(
                    pedido=pedido,
                    combo=combo,
                    cantidad=item['cantidad'],
                    precio_unitario=combo.precio,
                )
            mover_stock_item(detalle, signo=-1)
        return pedido

    def update(self, instance, validated_data):
        se_cancela = validated_data.get('estado') == 'cancelado' and instance.estado != 'cancelado'
        pedido = super().update(instance, validated_data)
        if se_cancela:
            items = pedido.items.prefetch_related('extras__extra', 'combo__items__producto')
            for item in items:
                mover_stock_item(item, signo=1)
        return pedido
