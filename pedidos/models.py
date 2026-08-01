from decimal import Decimal

from django.db import models
from productos.models import Producto, Combo


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

    cliente = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=30, blank=True)
    tipo_entrega = models.CharField(max_length=20, choices=TIPOS_ENTREGA, default='retiro')
    direccion = models.CharField(max_length=200, blank=True)
    localidad = models.ForeignKey(Localidad, null=True, blank=True, on_delete=models.SET_NULL, related_name='pedidos')
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    descuento_pct = models.PositiveIntegerField(default=0)
    hora_salida = models.TimeField(null=True, blank=True)
    nota = models.TextField(blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'Pedido #{self.id}'

    def calcular_subtotal(self):
        return sum(item.calcular_subtotal() for item in self.items.all())

    def calcular_total(self):
        con_envio = self.calcular_subtotal() + self.costo_envio
        if self.descuento_pct:
            descuento = con_envio * Decimal(self.descuento_pct) / Decimal(100)
            return (con_envio - descuento).quantize(Decimal('1'))
        return con_envio

    def calcular_cobrado(self):
        return sum((p.monto for p in self.pagos.all()), Decimal('0'))

    def calcular_estado_cobro(self):
        cobrado = self.calcular_cobrado()
        if cobrado <= 0:
            return 'pendiente'
        if cobrado >= self.calcular_total():
            return 'pagado'
        return 'parcial'


class Pago(models.Model):
    METODOS = [
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('tarjeta_debito', 'Tarjeta de débito'),
        ('tarjeta_credito', 'Tarjeta de crédito'),
        ('mercado_pago', 'Mercado Pago'),
        ('otro', 'Otro'),
    ]

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
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        nombre = self.producto.nombre if self.producto else self.combo.nombre
        return f'{self.cantidad} x {nombre}'

    def calcular_subtotal(self):
        precio_por_unidad = self.precio_unitario + sum(e.precio_unitario for e in self.extras.all())
        return self.cantidad * precio_por_unidad


class DetalleExtra(models.Model):
    detalle_pedido = models.ForeignKey(DetallePedido, related_name='extras', on_delete=models.CASCADE)
    extra = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='usado_como_extra')
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'+ {self.extra.nombre} en {self.detalle_pedido}'
