from django.db import models
from django.utils import timezone
from productos.models import Producto


class AntojoDelDia(models.Model):
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.SET_NULL)
    descuento_pct = models.PositiveIntegerField(default=15)
    activo = models.BooleanField(default=False)
    # Vacío = sin vencimiento (se apaga a mano, como era antes).
    activo_hasta = models.DateTimeField(null=True, blank=True)

    def esta_vigente(self):
        return self.activo and (self.activo_hasta is None or self.activo_hasta > timezone.now())

    def __str__(self):
        nombre = self.producto.nombre if self.producto else '(sin producto)'
        return f'{nombre} - {"activo" if self.activo else "inactivo"}'
