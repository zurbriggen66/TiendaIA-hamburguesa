from decimal import Decimal

from django.db import models
from productos.models import Producto, Combo, Presentacion

# A nivel de módulo porque la usan Caja y Pago (y, vía Pago.METODOS, también gastos).
METODOS_PAGO = [
    ('efectivo', 'Efectivo'),
    ('transferencia', 'Transferencia'),
    ('tarjeta_debito', 'Tarjeta de débito'),
    ('tarjeta_credito', 'Tarjeta de crédito'),
    ('mercado_pago', 'Mercado Pago'),
    ('otro', 'Otro'),
]


class Localidad(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Pedido(models.Model):
    ESTADOS = [
        ('pendiente', 'Pendiente'),
        ('en_preparacion', 'En preparación'),
        ('listo', 'Listo'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    ]

    TIPOS_ENTREGA = [
        ('retiro', 'Retiro en local'),
        ('delivery', 'Delivery'),
    ]

    ORIGENES = [
        ('web', 'Tienda web'),
        ('admin', 'Cargado manualmente'),
    ]

    cliente = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    tipo_entrega = models.CharField(max_length=20, choices=TIPOS_ENTREGA, default='retiro')
    direccion = models.CharField(max_length=200, blank=True)
    localidad = models.ForeignKey(Localidad, null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos')
    caja = models.ForeignKey('Caja', null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos')
    origen = models.CharField(max_length=10, choices=ORIGENES, default='admin')
    # Pedidos de la tienda web quedan sin confirmar hasta que el dueño verifique que el cliente
    # realmente envió el WhatsApp (el botón de la tienda solo abre WhatsApp, no garantiza el envío).
    # Los pedidos cargados a mano en el admin se consideran confirmados desde que se crean.
    confirmado = models.BooleanField(default=True)
    cliente_registrado = models.ForeignKey(
        'clientes.Cliente', null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos',
    )
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento_pct = models.PositiveIntegerField(default=0)
    # Canje de puntos: el monto lo calcula el servidor, nunca llega desde el frontend.
    puntos_usados = models.PositiveIntegerField(default=0)
    descuento_puntos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Evita acreditar dos veces si se confirma un pedido ya confirmado.
    puntos_acreditados = models.BooleanField(default=False)
    # Premio canjeado con puntos. El nombre se copia al canjear (igual que precio_unitario
    # en las líneas): si después se edita o borra el premio, el historial no cambia.
    recompensa = models.ForeignKey(
        'clientes.Recompensa', null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos',
    )
    recompensa_nombre = models.CharField(max_length=120, blank=True)
    hora_salida = models.TimeField(null=True, blank=True)
    nota = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    # Indexado: todos los filtros del admin (rango, día, mes, últimas horas) y el orden
    # por defecto pegan contra esta columna.
    creado = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        # El '-id' es el desempate: si dos pedidos comparten `creado` exacto, sin un orden
        # determinístico las páginas podrían repetir o saltear pedidos en el borde.
        ordering = ['-creado', '-id']

    def __str__(self):
        return f'Pedido #{self.id}'

    def calcular_subtotal(self):
        return sum(item.calcular_subtotal() for item in self.items.all())

    def calcular_total(self):
        con_envio = self.calcular_subtotal() + self.costo_envio
        if self.descuento_pct:
            descuento = con_envio * Decimal(self.descuento_pct) / Decimal(100)
            con_envio = (con_envio - descuento).quantize(Decimal('1'))
        # Los puntos se descuentan al final y nunca dejan el total en negativo.
        return max(con_envio - self.descuento_puntos, Decimal('0'))

    def calcular_cobrado(self):
        return sum((p.monto for p in self.pagos.all()), Decimal('0'))

    def calcular_estado_cobro(self):
        cobrado = self.calcular_cobrado()
        if cobrado <= 0:
            return 'pendiente'
        if cobrado >= self.calcular_total():
            return 'pagado'
        return 'parcial'


class Caja(models.Model):
    # Día "comercial" al que pertenece la caja (lo elige quien la abre, por defecto hoy).
    # Todo lo vendido mientras esta caja está abierta se atribuye a este día, aunque el
    # cierre termine cruzando la medianoche.
    dia = models.DateField()
    abierta_en = models.DateTimeField(auto_now_add=True)
    cerrada_en = models.DateTimeField(null=True, blank=True)
    # Fondo con el que arranca la caja y en qué forma está esa plata.
    monto_inicial = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    metodo_inicial = models.CharField(max_length=20, choices=METODOS_PAGO, default='efectivo')
    nota_apertura = models.CharField(max_length=200, blank=True)
    nota_cierre = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-abierta_en']

    def __str__(self):
        estado = 'abierta' if self.esta_abierta else 'cerrada'
        return f'Caja #{self.id} ({estado})'

    @property
    def esta_abierta(self):
        return self.cerrada_en is None


class Pago(models.Model):
    METODOS = METODOS_PAGO

    pedido = models.ForeignKey(Pedido, related_name='pagos', on_delete=models.CASCADE)
    metodo = models.CharField(max_length=20, choices=METODOS)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'{self.get_metodo_display()} ${self.monto} - {self.pedido}'


class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, related_name='items', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.PROTECT)
    combo = models.ForeignKey(Combo, null=True, blank=True, on_delete=models.PROTECT)
    # Si se borra la presentación elegida más adelante, el pedido no se pierde: sólo
    # pierde la etiqueta ("Doble"), el precio ya quedó congelado en precio_unitario.
    presentacion = models.ForeignKey(Presentacion, null=True, blank=True, on_delete=models.SET_NULL)
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    descuento_pct = models.PositiveIntegerField(default=0)
    # Marca si esta línea se agregó desde la sugerencia de venta cruzada en el carrito:
    # solo ahí se le respeta el precio con descuento_carrito_pct del producto.
    sugerido_carrito = models.BooleanField(default=False)

    def __str__(self):
        nombre = self.producto.nombre if self.producto else self.combo.nombre
        return f'{self.cantidad} x {nombre}'

    def calcular_subtotal(self):
        precio_por_unidad = self.precio_unitario + sum(e.precio_unitario * e.cantidad for e in self.extras.all())
        return self.cantidad * precio_por_unidad


class DetalleExtra(models.Model):
    detalle_pedido = models.ForeignKey(DetallePedido, related_name='extras', on_delete=models.CASCADE)
    extra = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='usado_como_extra')
    cantidad = models.PositiveIntegerField(default=1)
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'+ {self.cantidad}x {self.extra.nombre} en {self.detalle_pedido}'
