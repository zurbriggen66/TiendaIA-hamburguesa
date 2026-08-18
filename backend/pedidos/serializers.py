from decimal import Decimal

from rest_framework import serializers
from .models import Pedido, DetallePedido, DetalleExtra, Localidad, Pago, Caja
from productos.models import Producto, Presentacion
from antojo.models import AntojoDelDia
from clientes.puntos import calcular_descuento as calcular_descuento_puntos


class LocalidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localidad
        fields = '__all__'


class CajaSerializer(serializers.ModelSerializer):
    esta_abierta = serializers.BooleanField(read_only=True)
    total_ventas = serializers.SerializerMethodField()
    total_pedidos = serializers.SerializerMethodField()
    metodo_inicial_label = serializers.CharField(source='get_metodo_inicial_display', read_only=True)

    class Meta:
        model = Caja
        fields = [
            'id', 'dia', 'abierta_en', 'cerrada_en', 'nota_apertura', 'nota_cierre',
            'esta_abierta', 'total_ventas', 'total_pedidos',
            'monto_inicial', 'metodo_inicial', 'metodo_inicial_label',
        ]
        read_only_fields = ['dia', 'abierta_en', 'cerrada_en']

    def get_total_ventas(self, obj):
        return sum((p.calcular_total() for p in obj.pedidos.filter(confirmado=True).exclude(estado='cancelado')), Decimal('0'))

    def get_total_pedidos(self, obj):
        return obj.pedidos.filter(confirmado=True).exclude(estado='cancelado').count()


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
    presentacion_nombre = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    extras_detalle = serializers.SerializerMethodField()
    extras = ExtraSeleccionadoSerializer(many=True, required=False, write_only=True)

    class Meta:
        model = DetallePedido
        fields = [
            'id', 'producto', 'producto_nombre', 'combo', 'combo_nombre',
            'presentacion', 'presentacion_nombre', 'cantidad',
            'precio_unitario', 'descuento_pct', 'sugerido_carrito', 'subtotal', 'extras_detalle', 'extras',
        ]
        read_only_fields = ['precio_unitario', 'descuento_pct']
        extra_kwargs = {
            'producto': {'required': False, 'allow_null': True},
            'combo': {'required': False, 'allow_null': True},
            'presentacion': {'required': False, 'allow_null': True},
        }

    def get_producto_nombre(self, obj):
        return obj.producto.nombre if obj.producto else None

    def get_combo_nombre(self, obj):
        return obj.combo.nombre if obj.combo else None

    def get_presentacion_nombre(self, obj):
        return obj.presentacion.nombre if obj.presentacion else None

    def get_subtotal(self, obj):
        return obj.calcular_subtotal()

    def get_extras_detalle(self, obj):
        # Sin .select_related() a propósito: eso armaría un queryset nuevo y descartaría el
        # prefetch_related del viewset (items__extras__extra), volviendo a la base una vez
        # por cada línea del pedido. Así se usa el cache que ya vino cargado.
        return [
            {'producto': e.extra_id, 'nombre': e.extra.nombre, 'cantidad': e.cantidad, 'precio_unitario': e.precio_unitario}
            for e in obj.extras.all()
        ]

    def validate(self, data):
        producto = data.get('producto')
        combo = data.get('combo')
        presentacion = data.get('presentacion')
        if bool(producto) == bool(combo):
            raise serializers.ValidationError('Cada línea del pedido necesita un producto o un combo, no ambos ni ninguno.')
        if combo and data.get('extras'):
            raise serializers.ValidationError('Los extras solo se pueden agregar a líneas de producto, no de combo.')
        if combo and data.get('sugerido_carrito'):
            raise serializers.ValidationError('La sugerencia del carrito solo aplica a líneas de producto, no de combo.')
        if combo and presentacion:
            raise serializers.ValidationError('Las presentaciones solo se pueden elegir en líneas de producto, no de combo.')
        # Frontera de confianza: nunca aceptar la presentación de un producto distinto
        # al que viene en la misma línea (el cliente podría intentar mandar la más barata).
        if presentacion and producto and presentacion.producto_id != producto.id:
            raise serializers.ValidationError('La presentación elegida no corresponde a ese producto.')
        return data


def calcular_precio_producto(producto, antojo_activo, via_sugerencia_carrito=False, presentacion=None):
    precio_base = presentacion.precio if presentacion else producto.precio
    candidatos = []
    if producto.tiene_descuento_activo():
        descuento = Decimal(producto.descuento_pct) / Decimal(100)
        candidatos.append((producto.descuento_pct, (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))))
    if antojo_activo and antojo_activo.producto_id == producto.id:
        descuento = Decimal(antojo_activo.descuento_pct) / Decimal(100)
        precio_antojo = (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))
        candidatos.append((antojo_activo.descuento_pct, precio_antojo))
    # El descuento de venta cruzada solo se respeta si la línea llegó marcada como
    # agregada desde la sugerencia del carrito: en el menú normal ese mismo producto
    # se sigue vendiendo a precio de lista.
    if via_sugerencia_carrito and producto.tiene_descuento_carrito_activo():
        descuento = Decimal(producto.descuento_carrito_pct) / Decimal(100)
        candidatos.append((producto.descuento_carrito_pct, (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))))

    if candidatos:
        return min(candidatos, key=lambda c: c[1])
    return 0, precio_base


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
    usar_puntos = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'telefono', 'tipo_entrega', 'direccion', 'estado', 'creado', 'items',
            'localidad', 'localidad_nombre', 'caja', 'origen', 'confirmado', 'costo_envio', 'descuento_pct',
            'hora_salida', 'nota', 'pagos', 'subtotal', 'total', 'cobrado', 'estado_cobro',
            'puntos_usados', 'descuento_puntos', 'usar_puntos',
        ]
        extra_kwargs = {
            'localidad': {'required': False, 'allow_null': True},
            'caja': {'read_only': True},
            'confirmado': {'read_only': True},
            # El monto del canje lo decide el servidor; el frontend solo pide usar_puntos.
            'puntos_usados': {'read_only': True},
            'descuento_puntos': {'read_only': True},
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
        usar_puntos = validated_data.pop('usar_puntos', False)

        # El pedido se asocia al cliente logueado (si lo hay), nunca a uno que venga por body.
        usuario = getattr(self.context.get('request'), 'user', None)
        cliente = getattr(usuario, 'cliente', None) if usuario and usuario.is_authenticated else None
        pedido = Pedido.objects.create(cliente_registrado=cliente, **validated_data)

        antojo_activo = AntojoDelDia.objects.filter(activo=True).first()

        for item in items_data:
            producto = item.get('producto')
            combo = item.get('combo')
            extras_data = item.get('extras', [])

            if producto:
                sugerido_carrito = item.get('sugerido_carrito', False)
                presentacion = item.get('presentacion')
                descuento_pct_aplicado, precio_unitario = calcular_precio_producto(
                    producto, antojo_activo, via_sugerencia_carrito=sugerido_carrito, presentacion=presentacion
                )
                detalle = DetallePedido.objects.create(
                    pedido=pedido,
                    producto=producto,
                    presentacion=presentacion,
                    cantidad=item['cantidad'],
                    precio_unitario=precio_unitario,
                    descuento_pct=descuento_pct_aplicado,
                    sugerido_carrito=sugerido_carrito,
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

        # El canje va al final: recién acá se conoce el total real del pedido.
        if usar_puntos and cliente:
            puntos, descuento = calcular_descuento_puntos(cliente, pedido.calcular_total())
            if puntos > 0:
                pedido.puntos_usados = puntos
                pedido.descuento_puntos = descuento
                pedido.save(update_fields=['puntos_usados', 'descuento_puntos'])
                cliente.puntos -= puntos
                cliente.save(update_fields=['puntos'])

        return pedido

    def update(self, instance, validated_data):
        se_cancela = validated_data.get('estado') == 'cancelado' and instance.estado != 'cancelado'
        pedido = super().update(instance, validated_data)
        if se_cancela:
            items = pedido.items.prefetch_related('extras__extra', 'combo__items__producto')
            for item in items:
                mover_stock_item(item, signo=1)
        return pedido
