from django.db import models
from productos.models import Producto


class AntojoDelDia(models.Model):
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.SET_NULL)
    descuento_pct = models.PositiveIntegerField(default=15)
    activo = models.BooleanField(default=False)

    def __str__(self):
        nombre = self.producto.nombre if self.producto else '(sin producto)'
        return f'{nombre} - {"activo" if self.activo else "inactivo"}'
