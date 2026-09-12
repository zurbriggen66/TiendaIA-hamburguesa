import calendar
from datetime import timedelta
from decimal import Decimal

from django.db import models
from django.db.models import F
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
    # Lo que a MI me cuesta 1 unidad de este insumo (una feta de cheddar, un disco de
    # carne). Es lo contrario de `precio`: ese es lo que le cobro al cliente, este es lo
    # que pago yo. Cargarlo a mano es opcional: si esta en 0 se deduce de la ultima
    # compra. Se puede escribir directo porque no todo el mundo carga cada compra, y
    # sin costo no hay forma de saber si un producto deja plata.
    costo_manual = models.DecimalField(max_digits=10, decimal_places=2, default=0)
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

    def costo_unitario(self):
        """Lo que cuesta 1 unidad de este insumo: una feta de cheddar, un disco de carne.

        Con esto se calcula cuanto cuesta hacer cada producto (2 fetas a $200 + 1 disco
        a $300 = $500) y, de ahi, cuanto deja al venderlo.

        Gana el valor cargado a mano si existe; si no, se deduce de la ultima compra
        (monto / cantidad). Se prefiere la ULTIMA y no un promedio historico porque para
        decidir el precio de venta lo que importa es lo que sale reponerlo hoy.

        None si no hay ninguna de las dos cosas: distinto de 0, y quien lo use tiene que
        mostrarlo como dato faltante en vez de sumar cero y hacer ver el producto mas
        rentable de lo que es.
        """
        if self.costo_manual and self.costo_manual > 0:
            return self.costo_manual
        ultima = self.gastos.filter(cantidad__gt=0).order_by('-fecha', '-id').first()
        if ultima is None:
            return None
        return (ultima.monto / ultima.cantidad).quantize(Decimal('0.01'))

    def origen_del_costo(self):
        """'manual', 'compra' o None. Para que el costo nunca sea un numero misterioso."""
        if self.costo_manual and self.costo_manual > 0:
            return 'manual'
        return 'compra' if self.gastos.filter(cantidad__gt=0).exists() else None


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
    # Turno en el que se cargó el gasto. Sirve para reportar "gastos del turno";
    # NO implica que la plata haya salido del cajón (ver sale_del_cajon).
    caja = models.ForeignKey(
        'pedidos.Caja', null=True, blank=True, on_delete=models.SET_NULL, related_name='gastos',
    )
    # Un gasto tiene dos hechos independientes: que es un costo del negocio (siempre),
    # y de dónde salió la plata físicamente (el cajón, el banco, la tarjeta). Solo el
    # segundo afecta el arqueo, y adivinarlo por el método de pago estaba mal: el
    # alquiler pagado por transferencia no sale del cajón, pero el pan sí.
    sale_del_cajon = models.BooleanField(default=False)
    insumo = models.ForeignKey(Insumo, null=True, blank=True, on_delete=models.SET_NULL, related_name='gastos')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-fecha']

    def __str__(self):
        return f'{self.descripcion} - ${self.monto}'

    def efecto_en_stock(self):
        """(insumo_id, cantidad) que este gasto sumó al stock, o None si no sumó nada.
        Solo una compra de insumos con insumo y cantidad mueve stock."""
        if self.categoria == 'insumos' and self.insumo_id and self.cantidad:
            return self.insumo_id, self.cantidad
        return None


class MovimientoStock(models.Model):
    """Cada suma o resta del stock de un insumo, con su motivo.

    Antes el stock era solo un número que se pisaba: cuando no cuadraba con lo que había
    en la heladera no había forma de saber si fue una venta, una compra borrada o alguien
    que lo editó a mano. Además, guardar lo que REALMENTE se movió permite deshacer un
    pedido exacto, aunque después se haya cambiado la receta.
    """

    TIPOS = [
        ('inicial', 'Saldo inicial'),
        ('venta', 'Venta'),
        ('devolucion', 'Pedido cancelado o borrado'),
        ('compra', 'Compra'),
        ('compra_anulada', 'Compra borrada o corregida'),
        ('ajuste', 'Ajuste por recuento'),
    ]

    insumo = models.ForeignKey(Insumo, on_delete=models.CASCADE, related_name='movimientos')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    # Con signo: negativo resta, positivo suma.
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    stock_resultante = models.DecimalField(max_digits=10, decimal_places=2)
    # SET_NULL: si se borra el pedido o el gasto, el movimiento queda (y su detalle dice cuál era).
    pedido = models.ForeignKey(
        'pedidos.Pedido', null=True, blank=True, on_delete=models.SET_NULL, related_name='movimientos_stock',
    )
    gasto = models.ForeignKey(
        Gasto, null=True, blank=True, on_delete=models.SET_NULL, related_name='movimientos_stock',
    )
    detalle = models.CharField(max_length=200, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado', '-id']

    def __str__(self):
        return f'{self.insumo} {self.cantidad:+} ({self.tipo})'


def mover_stock(insumo_id, cantidad, tipo, *, pedido=None, gasto=None, detalle=''):
    """Único lugar que cambia el stock de un insumo: suma (o resta) y deja asentado el
    movimiento.

    El stock PUEDE quedar negativo, a propósito: antes se cortaba en 0 y lo vendido de
    más desaparecía de la cuenta (marcaba -3 cuando faltaban 10). Un negativo dice la
    verdad: se vendió más de lo que figuraba cargado.
    """
    if not cantidad:
        return
    Insumo.objects.filter(pk=insumo_id).update(cantidad_disponible=F('cantidad_disponible') + cantidad)
    resultante = Insumo.objects.values_list('cantidad_disponible', flat=True).get(pk=insumo_id)
    MovimientoStock.objects.create(
        insumo_id=insumo_id, tipo=tipo, cantidad=cantidad, stock_resultante=resultante,
        pedido=pedido, gasto=gasto, detalle=detalle[:200],
    )


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
