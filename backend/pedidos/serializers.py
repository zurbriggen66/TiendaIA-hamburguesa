from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from rest_framework import serializers
from .models import METODOS_PAGO, Pedido, DetallePedido, DetalleExtra, Localidad, MovimientoCaja, Pago, Caja
from productos.models import Producto, Presentacion
from antojo.models import AntojoDelDia
from negocio.models import ConfiguracionSitio
from clientes.models import Recompensa
from clientes.puntos import calcular_descuento as calcular_descuento_puntos, canjear_recompensa
from gastos.models import MovimientoStock, mover_stock


class LocalidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localidad
        fields = '__all__'


class CajaSerializer(serializers.ModelSerializer):
    esta_abierta = serializers.BooleanField(read_only=True)
    total_ventas = serializers.SerializerMethodField()
    total_cobrado = serializers.SerializerMethodField()
    total_propinas = serializers.SerializerMethodField()
    total_pedidos = serializers.SerializerMethodField()
    total_gastos = serializers.SerializerMethodField()
    desglose = serializers.SerializerMethodField()
    cobrado_por_metodo = serializers.SerializerMethodField()
    efectivo_en_cajon = serializers.SerializerMethodField()
    descuadre_efectivo = serializers.SerializerMethodField()
    diferencia_efectivo = serializers.SerializerMethodField()
    metodo_inicial_label = serializers.CharField(source='get_metodo_inicial_display', read_only=True)

    class Meta:
        model = Caja
        fields = [
            'id', 'dia', 'abierta_en', 'cerrada_en', 'nota_apertura', 'nota_cierre',
            'esta_abierta', 'total_ventas', 'total_cobrado', 'total_propinas', 'total_pedidos',
            'total_gastos', 'desglose', 'cobrado_por_metodo',
            'efectivo_contado', 'diferencia_efectivo',
            'efectivo_en_cajon', 'descuadre_efectivo',
            'monto_inicial', 'metodo_inicial', 'metodo_inicial_label',
        ]
        read_only_fields = ['dia', 'abierta_en', 'cerrada_en', 'efectivo_contado']

    # Todos los totales suman en Python sobre lo que ya trajo el prefetch del viewset.
    # Con .filter()/.aggregate() cada caja del historial disparaba sus propias queries.
    def get_total_ventas(self, obj):
        """Lo que VALEN los pedidos del turno, estén cobrados o no."""
        return sum((p.calcular_total() for p in obj.pedidos_validos()), Decimal('0'))

    def get_total_cobrado(self, obj):
        """Plata que realmente entró. Se lee junto a total_ventas: la diferencia entre
        las dos es lo que quedó a cobrar, y era lo que hacía leer 'Ventas' como si fuera
        lo que tenía que haber en el cajón."""
        return sum((p.monto for p in obj.pagos_validos()), Decimal('0'))

    def get_total_gastos(self, obj):
        return sum((g.monto for g in obj.gastos.all()), Decimal('0'))

    def get_desglose(self, obj):
        # Lista y no dict: así el frontend no necesita conocer ni el orden ni las
        # etiquetas de los métodos, solo recorrerla.
        etiquetas = dict(METODOS_PAGO)
        saldos = obj.desglose_por_metodo()
        return [
            {'metodo': codigo, 'label': etiquetas[codigo], 'monto': saldos.get(codigo, Decimal('0'))}
            for codigo, _ in METODOS_PAGO
        ]

    def get_cobrado_por_metodo(self, obj):
        """Cuánto entró por cada vía, sin mezclarlo con nada más.

        Distinto de `desglose`, que es el SALDO: ese arranca del fondo inicial y le
        resta gastos y vueltos, así que no se puede leer como "cuánto me pagaron por
        transferencia". Este es lo que hay que poder comparar contra el resumen del
        banco o de Mercado Pago.

        Incluye la propina porque entró por la misma vía; el vuelto devuelto por otro
        método no se descuenta acá — eso es una salida y vive en el desglose.
        """
        etiquetas = dict(METODOS_PAGO)
        cobros = {}
        for pago in obj.pagos_validos():
            cobros[pago.metodo] = cobros.get(pago.metodo, Decimal('0')) + pago.monto + pago.propina
        return [
            {'metodo': codigo, 'label': etiquetas[codigo], 'monto': cobros[codigo]}
            for codigo, _ in METODOS_PAGO if cobros.get(codigo)
        ]

    def get_efectivo_en_cajon(self, obj):
        return obj.efectivo_en_cajon()

    def get_descuadre_efectivo(self, obj):
        return obj.descuadre_efectivo()

    def get_diferencia_efectivo(self, obj):
        return obj.diferencia_efectivo()

    def get_total_propinas(self, obj):
        # Plata que entro al cajon sin ser venta. El detalle de en que metodo quedo
        # cada peso esta en `desglose`, que es lo unico contrastable contra la realidad.
        return sum((p.propina for p in obj.pagos_validos()), Decimal('0'))

    def get_total_pedidos(self, obj):
        return len(obj.pedidos_validos())


class MovimientoCajaSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = MovimientoCaja
        fields = ['id', 'caja', 'tipo', 'tipo_label', 'monto', 'motivo', 'creado']
        read_only_fields = ['caja']

    def validate_monto(self, valor):
        if valor <= 0:
            raise serializers.ValidationError('El monto tiene que ser mayor a cero.')
        return valor


class PagoSerializer(serializers.ModelSerializer):
    metodo_label = serializers.CharField(source='get_metodo_display', read_only=True)

    vuelto_metodo_label = serializers.CharField(source='get_vuelto_metodo_display', read_only=True)

    class Meta:
        model = Pago
        fields = [
            'id', 'pedido', 'metodo', 'metodo_label', 'monto', 'propina',
            'vuelto_monto', 'vuelto_metodo', 'vuelto_metodo_label', 'creado',
        ]

    def validate(self, attrs):
        """El monto no puede pasarse de lo que falta cobrar del pedido.

        Sin esta validacion el cajero escribe lo que le entregan (un billete de
        $20.000 para un pedido de $12.900) y esos $7.100 de vuelto quedan contados
        como venta cobrada. El sobrante tiene que ir a `propina` si se lo dejan, o
        no registrarse si volvio como vuelto.
        """
        pedido = attrs.get('pedido') or getattr(self.instance, 'pedido', None)
        if pedido is None:
            return attrs

        monto = attrs.get('monto', getattr(self.instance, 'monto', Decimal('0')))
        falta = pedido.calcular_total() - pedido.calcular_cobrado()
        if self.instance is not None:
            # En una edicion, el pago que se esta tocando no cuenta como ya cobrado.
            falta += self.instance.monto

        if monto > falta:
            raise serializers.ValidationError({'monto': (
                f'Este pedido solo debe ${falta}. Lo que el cliente entrega de mas va '
                f'en "propina" si se lo deja, o no se registra si volvio como vuelto.'
            )})

        # El vuelto solo se anota cuando vuelve por OTRA via que la del cobro. Si sale
        # por el mismo metodo, entra y sale del mismo lado y el neto ya es monto+propina:
        # registrarlo ahi solo inflaria las dos puntas sin cambiar el saldo.
        metodo = attrs.get('metodo', getattr(self.instance, 'metodo', None))
        vuelto_monto = attrs.get('vuelto_monto', getattr(self.instance, 'vuelto_monto', Decimal('0')))
        vuelto_metodo = attrs.get('vuelto_metodo', getattr(self.instance, 'vuelto_metodo', ''))
        if vuelto_monto and not vuelto_metodo:
            raise serializers.ValidationError({'vuelto_metodo': 'Deci por que via le devolviste el vuelto.'})
        if vuelto_metodo and not vuelto_monto:
            raise serializers.ValidationError({'vuelto_monto': 'Falta cuanto vuelto le devolviste.'})
        if vuelto_monto and vuelto_metodo == metodo:
            raise serializers.ValidationError({'vuelto_metodo': (
                'Si el vuelto sale por el mismo metodo del cobro no hace falta anotarlo: '
                'ya queda descontado solo.'
            )})
        return attrs


class ExtraSeleccionadoSerializer(serializers.Serializer):
    producto = serializers.PrimaryKeyRelatedField(queryset=Producto.objects.filter(es_extra=True))
    cantidad = serializers.IntegerField(min_value=1, default=1)
    # Lo manda el carrito cuando el extra se agregó desde la tira de venta cruzada. Solo
    # habilita el descuento; el precio en sí lo calcula el servidor, nunca llega por body.
    sugerido_carrito = serializers.BooleanField(default=False)


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
            {
                'producto': e.extra_id, 'nombre': e.extra.nombre, 'cantidad': e.cantidad,
                'precio_unitario': e.precio_unitario, 'sugerido_carrito': e.sugerido_carrito,
            }
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
        # Un extra solo se puede colgar de un producto de su misma categoría: es lo que
        # evita que termine en el ticket de cocina un "+ panceta" sobre una gaseosa. Las
        # dos pantallas que cargan pedidos (tienda y admin) ya filtran así, pero la regla
        # tiene que vivir acá para que valga aunque el pedido llegue por otro lado.
        ajenos = [
            e['producto'].nombre for e in (data.get('extras') or [])
            if producto and e['producto'].categoria_id != producto.categoria_id
        ]
        if ajenos:
            raise serializers.ValidationError(
                f'Estos extras no son de la categoría de {producto.nombre}: {", ".join(ajenos)}.'
            )
        return data


def calcular_precio_producto(producto, antojo_activo, via_sugerencia_carrito=False, presentacion=None):
    precio_base = presentacion.precio if presentacion else producto.precio
    candidatos = []
    if producto.tiene_descuento_activo():
        descuento = Decimal(producto.descuento_pct) / Decimal(100)
        candidatos.append((producto.descuento_pct, (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))))
    # Si el antojo apunta a una variante puntual (ej. "Doble"), el descuento solo
    # compite cuando el pedido es justo esa variante — no en la hamburguesa simple ni
    # en otra presentación. Sin variante elegida en el antojo, aplica a cualquiera.
    antojo_coincide = antojo_activo and antojo_activo.producto_id == producto.id and (
        not antojo_activo.presentacion_id
        or (presentacion and presentacion.id == antojo_activo.presentacion_id)
    )
    if antojo_coincide:
        descuento = Decimal(antojo_activo.descuento_pct) / Decimal(100)
        precio_antojo = (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))
        candidatos.append((antojo_activo.descuento_pct, precio_antojo))
    # El descuento de venta cruzada solo se respeta si la línea llegó marcada como
    # agregada desde la sugerencia del carrito: en el menú normal ese mismo producto
    # se sigue vendiendo a precio de lista.
    if via_sugerencia_carrito and producto.tiene_descuento_carrito_activo():
        descuento = Decimal(producto.descuento_carrito_pct) / Decimal(100)
        candidatos.append((producto.descuento_carrito_pct, (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))))
    # Si la variante elegida suma un insumo (ej. un medallón extra) que está en oferta,
    # ese descuento también compite: gana el que le dé más descuento al cliente, igual
    # que con los demás orígenes de descuento.
    if presentacion:
        descuento_pct_insumo = presentacion.mejor_descuento_insumo()
        if descuento_pct_insumo:
            descuento = Decimal(descuento_pct_insumo) / Decimal(100)
            candidatos.append((descuento_pct_insumo, (precio_base * (Decimal(1) - descuento)).quantize(Decimal('1'))))

    if candidatos:
        return min(candidatos, key=lambda c: c[1])
    return 0, precio_base


def consumo_de_item(item):
    """Cuánto de cada insumo lleva una línea de pedido: la receta del producto, lo que
    suma la variante (Doble = +1 medallón) y los extras. Los extras son por unidad: 2 x
    INDIA con panceta son 2 pancetas."""
    consumo = defaultdict(Decimal)
    if item.producto_id:
        for pi in item.producto.detalle_insumos.all():
            consumo[pi.insumo_id] += pi.cantidad * item.cantidad
        if item.presentacion_id:
            for pi in item.presentacion.detalle_insumos_extra.all():
                consumo[pi.insumo_id] += pi.cantidad * item.cantidad
        for extra in item.extras.all():
            for pi in extra.extra.detalle_insumos.all():
                consumo[pi.insumo_id] += pi.cantidad * extra.cantidad * item.cantidad
    elif item.combo_id:
        for ci in item.combo.items.select_related('producto'):
            for pi in ci.producto.detalle_insumos.all():
                consumo[pi.insumo_id] += pi.cantidad * ci.cantidad * item.cantidad
    return consumo


def _nombre_item(item):
    if item.combo_id:
        return item.combo.nombre
    variante = f' {item.presentacion.nombre}' if item.presentacion_id else ''
    return f'{item.producto.nombre}{variante}'


def descontar_stock_pedido(pedido, motivo=''):
    for item in pedido.items.all():
        for insumo_id, cantidad in consumo_de_item(item).items():
            mover_stock(
                insumo_id, -cantidad, 'venta', pedido=pedido,
                detalle=f'Pedido #{pedido.id}{motivo}: {item.cantidad} x {_nombre_item(item)}',
            )


def devolver_stock_pedido(pedido, motivo):
    """Devuelve lo que el pedido descontó de verdad, sumando sus movimientos, y no lo
    que diría la receta de hoy: si la receta cambió desde que se vendió, recalcular
    devolvía de más o de menos."""
    movimientos = pedido.movimientos_stock.all()
    if movimientos.exists():
        for fila in movimientos.values('insumo').annotate(neto=Sum('cantidad')):
            if fila['neto']:
                mover_stock(fila['insumo'], -fila['neto'], 'devolucion', pedido=pedido,
                            detalle=f'Pedido #{pedido.id} {motivo}')
        return
    inicio_historial = MovimientoStock.objects.order_by('creado').values_list('creado', flat=True).first()
    if inicio_historial is None or pedido.creado < inicio_historial:
        # Pedido de antes de que existiera el historial: no hay registro de lo que movió,
        # así que se recalcula con la receta actual (lo mismo que se hacía antes).
        for item in pedido.items.all():
            for insumo_id, cantidad in consumo_de_item(item).items():
                mover_stock(insumo_id, cantidad, 'devolucion', pedido=pedido,
                            detalle=f'Pedido #{pedido.id} {motivo}: {item.cantidad} x {_nombre_item(item)}')


class PedidoSerializer(serializers.ModelSerializer):
    items = DetallePedidoSerializer(many=True)
    localidad_nombre = serializers.CharField(source='localidad.nombre', read_only=True)
    pagos = PagoSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    cobrado = serializers.SerializerMethodField()
    estado_cobro = serializers.SerializerMethodField()
    usar_puntos = serializers.BooleanField(write_only=True, required=False, default=False)
    recompensa_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Pedido
        fields = [
            'id', 'cliente', 'telefono', 'tipo_entrega', 'direccion', 'estado', 'creado', 'items',
            'localidad', 'localidad_nombre', 'caja', 'origen', 'confirmado', 'costo_envio', 'descuento_pct',
            'hora_salida', 'nota', 'pagos', 'subtotal', 'total', 'cobrado', 'estado_cobro',
            'puntos_usados', 'descuento_puntos', 'usar_puntos',
            'recompensa', 'recompensa_nombre', 'recompensa_id',
        ]
        extra_kwargs = {
            'localidad': {'required': False, 'allow_null': True},
            'caja': {'read_only': True},
            'confirmado': {'read_only': True},
            # El monto del canje lo decide el servidor; el frontend solo pide usar_puntos.
            'puntos_usados': {'read_only': True},
            'descuento_puntos': {'read_only': True},
            'recompensa': {'read_only': True},
            'recompensa_nombre': {'read_only': True},
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

    def validate(self, data):
        # El interruptor de "tienda abierta" solo frena los pedidos que llegan por la
        # web pública; lo cargado a mano en el admin (origen='admin', el default) sigue
        # funcionando siempre, para no trabar al mostrador con un cliente presente.
        if data.get('origen') == 'web':
            config = ConfiguracionSitio.objects.order_by('id').last()
            if config and not config.tienda_abierta:
                raise serializers.ValidationError(
                    config.mensaje_cerrado or 'La tienda está cerrada en este momento. No se pueden recibir pedidos.'
                )

        # Un mismo saldo de puntos no puede gastarse dos veces en el mismo pedido.
        if data.get('usar_puntos') and data.get('recompensa_id'):
            raise serializers.ValidationError(
                'Elegí una sola cosa: descuento con puntos o un premio, no las dos.'
            )
        return data

    # Atómico: si algo falla a mitad (un premio sin puntos, un item inválido) no puede
    # quedar un pedido a medias con el stock ya descontado.
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        usar_puntos = validated_data.pop('usar_puntos', False)
        recompensa_id = validated_data.pop('recompensa_id', None)

        # El costo de envio de un pedido web sale de la localidad cargada en el admin,
        # nunca del body: si no, el cliente podria mandar costo_envio=0. En el admin se
        # sigue pudiendo cargar a mano (PedidoEnvioDescuentoModal).
        localidad = validated_data.get('localidad')
        if validated_data.get('origen') == 'web':
            validated_data['costo_envio'] = localidad.costo_envio if localidad else 0

        # El pedido se asocia al cliente logueado (si lo hay), nunca a uno que venga por body.
        usuario = getattr(self.context.get('request'), 'user', None)
        cliente = getattr(usuario, 'cliente', None) if usuario and usuario.is_authenticated else None
        pedido = Pedido.objects.create(cliente_registrado=cliente, **validated_data)

        antojo_activo = AntojoDelDia.vigente()

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
                    via_sugerencia = extra_sel.get('sugerido_carrito', False)
                    DetalleExtra.objects.create(
                        detalle_pedido=detalle,
                        extra=extra_producto,
                        cantidad=extra_sel.get('cantidad', 1),
                        precio_unitario=(
                            extra_producto.precio_sugerido_carrito() if via_sugerencia
                            else extra_producto.precio
                        ),
                        sugerido_carrito=via_sugerencia,
                    )
            else:
                detalle = DetallePedido.objects.create(
                    pedido=pedido,
                    combo=combo,
                    cantidad=item['cantidad'],
                    precio_unitario=combo.precio,
                )

        descontar_stock_pedido(pedido)

        # El canje va al final: recién acá se conoce el total real del pedido.
        if usar_puntos and cliente:
            puntos, descuento = calcular_descuento_puntos(cliente, pedido.calcular_total())
            if puntos > 0:
                pedido.puntos_usados = puntos
                pedido.descuento_puntos = descuento
                pedido.save(update_fields=['puntos_usados', 'descuento_puntos'])
                cliente.puntos -= puntos
                cliente.save(update_fields=['puntos'])

        # Canje de premio: el costo en puntos sale de la base, no del body.
        if recompensa_id and cliente:
            recompensa = Recompensa.objects.filter(id=recompensa_id, activa=True).first()
            if not recompensa:
                raise serializers.ValidationError({'recompensa_id': 'Ese premio no existe o ya no está disponible.'})
            if not canjear_recompensa(cliente, recompensa):
                raise serializers.ValidationError({'recompensa_id': 'No te alcanzan los puntos para ese premio.'})
            pedido.recompensa = recompensa
            pedido.recompensa_nombre = recompensa.nombre
            pedido.save(update_fields=['recompensa', 'recompensa_nombre'])

        return pedido

    @transaction.atomic
    def update(self, instance, validated_data):
        nuevo_estado = validated_data.get('estado', instance.estado)
        se_cancela = nuevo_estado == 'cancelado' and instance.estado != 'cancelado'
        # Volver un pedido cancelado a la cola: la cancelación había devuelto el stock,
        # así que hay que descontarlo otra vez (antes quedaba devuelto para siempre).
        se_reactiva = instance.estado == 'cancelado' and nuevo_estado != 'cancelado'
        pedido = super().update(instance, validated_data)
        if se_cancela:
            devolver_stock_pedido(pedido, 'cancelado')
        elif se_reactiva:
            descontar_stock_pedido(pedido, ' reactivado')
        return pedido
