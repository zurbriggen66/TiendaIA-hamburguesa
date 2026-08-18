from decimal import Decimal

from django.db import models
from django.utils import timezone


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
    insumos = models.ManyToManyField('gastos.Insumo', through='ProductoInsumo', blank=True, related_name='productos')
    descuento_pct = models.PositiveIntegerField(default=0)
    descuento_hasta = models.DateTimeField(null=True, blank=True)
    sugerido_carrito = models.BooleanField(default=False)
    descuento_carrito_pct = models.PositiveIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return self.nombre

    def tiene_descuento_activo(self):
        return bool(self.descuento_pct) and self.descuento_hasta is not None and self.descuento_hasta > timezone.now()

    def precio_actual(self):
        if self.tiene_descuento_activo():
            descuento = Decimal(self.descuento_pct) / Decimal(100)
            return (self.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))
        return self.precio

    def tiene_descuento_carrito_activo(self):
        return self.sugerido_carrito and bool(self.descuento_carrito_pct)

    def precio_sugerido_carrito(self):
        if self.tiene_descuento_carrito_activo():
            descuento = Decimal(self.descuento_carrito_pct) / Decimal(100)
            return (self.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))
        return self.precio

    def ajustar_stock(self, delta_unidades):
        for pi in self.detalle_insumos.select_related('insumo'):
            pi.insumo.cantidad_disponible += pi.cantidad * delta_unidades
            pi.insumo.save(update_fields=['cantidad_disponible'])


class ProductoInsumo(models.Model):
    producto = models.ForeignKey(Producto, related_name='detalle_insumos', on_delete=models.CASCADE)
    insumo = models.ForeignKey('gastos.Insumo', on_delete=models.PROTECT, related_name='usado_en_productos')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, default=1)

    class Meta:
        unique_together = ('producto', 'insumo')

    def __str__(self):
        return f'{self.producto.nombre} usa {self.cantidad} de {self.insumo.nombre}'


class Combo(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.ImageField(upload_to='productos/combos/', null=True, blank=True)
    productos = models.ManyToManyField(Producto, through='ComboItem', related_name='combos')
    activo = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return self.nombre


class Presentacion(models.Model):
    producto = models.ForeignKey(Producto, related_name='presentaciones', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=50)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'precio']

    def __str__(self):
        return f'{self.producto.nombre} - {self.nombre}'


class ComboItem(models.Model):
    combo = models.ForeignKey(Combo, related_name='items', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='combo_items')
    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('combo', 'producto')

    def __str__(self):
        return f'{self.cantidad} x {self.producto.nombre} en {self.combo.nombre}'
