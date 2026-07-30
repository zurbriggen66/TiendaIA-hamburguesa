from django.db import models
from productos.models import Producto


class AntojoDelDia(models.Model):
    fecha = models.DateField(unique=True)
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE)
    descuento_pct = models.PositiveIntegerField(default=15)
    motivo = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f'{self.fecha} - {self.producto.nombre}'
