from django.contrib.auth.models import User
from django.db import models


class Cliente(models.Model):
    """Cliente registrado de la tienda. El email, nombre y contraseña viven en el
    User de Django (que ya hashea la contraseña) — acá solo lo propio del programa."""

    usuario = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cliente')
    telefono = models.CharField(max_length=30, blank=True)
    puntos = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return f'{self.usuario.get_full_name() or self.usuario.email} ({self.puntos} pts)'


class Recompensa(models.Model):
    """Premio que se canjea por puntos. Es texto libre y no un Producto a propósito:
    el dueño puede querer 'envío gratis' o '2x1 en papas', que no son un producto del
    catálogo. El local lo entrega a mano; el sistema descuenta los puntos y lo deja
    anotado en el pedido."""

    nombre = models.CharField(max_length=120)
    puntos = models.PositiveIntegerField()
    activa = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['puntos']

    def __str__(self):
        return f'{self.nombre} ({self.puntos} pts)'
