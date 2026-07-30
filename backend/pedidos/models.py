from django.db import models
from productos.models import Producto, Combo


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
    estado = models.CharField(max_length=20, choices=ESTADOS, default='pendiente')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'Pedido #{self.id}'


class DetallePedido(models.Model):
    pedido = models.ForeignKey(Pedido, related_name='items', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.PROTECT)
    combo = models.ForeignKey(Combo, null=True, blank=True, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        nombre = self.producto.nombre if self.producto else self.combo.nombre
        return f'{self.cantidad} x {nombre}'
