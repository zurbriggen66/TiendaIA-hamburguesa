from django.db import models


class Insumo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    unidad = models.CharField(max_length=20, default='unidades')
    cantidad_disponible = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Gasto(models.Model):
    CATEGORIAS = [
        ('insumos', 'Insumos / Stock'),
        ('servicios', 'Servicios'),
        ('sueldos', 'Sueldos'),
        ('otros', 'Otros'),
    ]

    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    insumo = models.ForeignKey(Insumo, null=True, blank=True, on_delete=models.SET_NULL, related_name='gastos')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.descripcion} - ${self.monto}'
