import calendar
from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.utils import timezone

from pedidos.models import Pago


class Insumo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    unidad = models.CharField(max_length=20, default='unidades')
    cantidad_disponible = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_minimo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Precio de venta de 1 unidad de este insumo cuando se usa como insumo extra de una
    # variante (ej. "Doble" = precio del producto + este precio). No es el costo de compra,
    # es lo que se le cobra de más al cliente por sumarlo.
    precio = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Descuento sobre este insumo (ej. "medallones -20% esta semana"): cuando está activo,
    # se propaga a cualquier variante de producto que lo agregue como insumo extra
    # (ver Presentacion.mejor_descuento_insumo en productos.models).
    descuento_pct = models.PositiveIntegerField(default=0)
    descuento_hasta = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

    def tiene_descuento_activo(self):
        return bool(self.descuento_pct) and self.descuento_hasta is not None and self.descuento_hasta > timezone.now()

    def precio_actual(self):
        if self.tiene_descuento_activo():
            descuento = Decimal(self.descuento_pct) / Decimal(100)
            return (self.precio * (Decimal(1) - descuento)).quantize(Decimal('1'))
        return self.precio


class Gasto(models.Model):
    CATEGORIAS = [
        ('insumos', 'Insumos / Stock'),
        ('servicios', 'Servicios'),
        ('sueldos', 'Sueldos'),
        ('otros', 'Otros'),
    ]

    # Misma lista que usan los cobros de pedidos (pedidos.models.Pago.METODOS), para que
    # Cobranzas y Gastos hablen el mismo idioma y no haya dos listas que mantener aparte.
    METODOS_PAGO = Pago.METODOS

    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    descripcion = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO, default='efectivo')
    insumo = models.ForeignKey(Insumo, null=True, blank=True, on_delete=models.SET_NULL, related_name='gastos')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.descripcion} - ${self.monto}'


class GastoFijo(models.Model):
    """Gasto que se repite (alquiler, sueldos, servicios).

    Guarda la fecha concreta del próximo vencimiento en vez de un "día del mes":
    así las tres frecuencias se manejan igual y no hay que recalcular calendarios
    en cada request. Al pagarlo se crea un Gasto real y la fecha avanza sola.
    """

    FRECUENCIAS = [
        ('mensual', 'Mensual'),
        ('quincenal', 'Quincenal'),
        ('semanal', 'Semanal'),
    ]

    nombre = models.CharField(max_length=120)
    categoria = models.CharField(max_length=20, choices=Gasto.CATEGORIAS, default='otros')
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    frecuencia = models.CharField(max_length=20, choices=FRECUENCIAS, default='mensual')
    proximo_vencimiento = models.DateField()
    dias_aviso = models.PositiveIntegerField(default=5)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['proximo_vencimiento']

    def __str__(self):
        return f'{self.nombre} - ${self.monto} ({self.get_frecuencia_display()})'

    def dias_restantes(self):
        """Días hasta el vencimiento. Negativo = ya venció."""
        return (self.proximo_vencimiento - timezone.localdate()).days

    def esta_por_vencer(self):
        return self.dias_restantes() <= self.dias_aviso

    def avanzar_vencimiento(self):
        if self.frecuencia == 'semanal':
            self.proximo_vencimiento += timedelta(days=7)
        elif self.frecuencia == 'quincenal':
            self.proximo_vencimiento += timedelta(days=14)
        else:
            self.proximo_vencimiento = self._sumar_un_mes(self.proximo_vencimiento)
        self.save(update_fields=['proximo_vencimiento'])

    @staticmethod
    def _sumar_un_mes(fecha):
        # Si el día no existe en el mes siguiente (ej. 31 de enero -> febrero),
        # se usa el último día de ese mes en vez de romper.
        mes = fecha.month + 1
        anio = fecha.year
        if mes > 12:
            mes = 1
            anio += 1
        ultimo_dia = calendar.monthrange(anio, mes)[1]
        return fecha.replace(year=anio, month=mes, day=min(fecha.day, ultimo_dia))
