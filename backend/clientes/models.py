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
