from django.db import models


class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    imagen = models.ImageField(upload_to='productos/categorias/', null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']
        verbose_name_plural = 'Categorías'

    def __str__(self):
        return self.nombre


class Producto(models.Model):
    categoria = models.ForeignKey(Categoria, related_name='productos', on_delete=models.PROTECT)
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.ImageField(upload_to='productos/productos/', null=True, blank=True)
    destacado = models.BooleanField(default=False)
    es_extra = models.BooleanField(default=False)
    insumos = models.ManyToManyField('gastos.Insumo', blank=True, related_name='productos')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return self.nombre


class Combo(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.ImageField(upload_to='productos/combos/', null=True, blank=True)
    productos = models.ManyToManyField(Producto, related_name='combos')
    activo = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return self.nombre
