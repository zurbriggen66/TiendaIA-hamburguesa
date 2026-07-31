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
    insumos = models.ManyToManyField('gastos.Insumo', through='ProductoInsumo', blank=True, related_name='productos')
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado']

    def __str__(self):
        return self.nombre


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


class ComboItem(models.Model):
    combo = models.ForeignKey(Combo, related_name='items', on_delete=models.CASCADE)
    producto = models.ForeignKey(Producto, on_delete=models.PROTECT, related_name='combo_items')
    cantidad = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ('combo', 'producto')

    def __str__(self):
        return f'{self.cantidad} x {self.producto.nombre} en {self.combo.nombre}'
