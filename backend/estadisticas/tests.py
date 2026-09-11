from decimal import Decimal

from django.contrib.auth.models import User
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from gastos.models import Gasto, Insumo
from pedidos.models import Caja, DetalleExtra, DetallePedido, Pago, Pedido
from productos.models import Categoria, Producto, ProductoInsumo


class EstadisticasPorCajaTests(TestCase):
    def _crear_pedido(self, caja, metodo, monto):
        pedido = Pedido.objects.create(caja=caja, confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=monto)
        Pago.objects.create(pedido=pedido, metodo=metodo, monto=monto)
        return pedido

    def setUp(self):
        # /api/estadisticas/ es EsAdmin: sin login la vista responde 403 y el .json()
        # de abajo no trae ninguna de estas claves.
        User.objects.create_user('duenio', password='x', is_staff=True)
        self.client.login(username='duenio', password='x')

        categoria = Categoria.objects.create(nombre='Hamburguesas')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Clásica', precio=1000)
        self.caja_1 = Caja.objects.create(dia='2026-08-13')
        self.caja_2 = Caja.objects.create(dia='2026-08-14')
        self._crear_pedido(self.caja_1, 'efectivo', Decimal('1000'))
        self._crear_pedido(self.caja_1, 'transferencia', Decimal('500'))
        self._crear_pedido(self.caja_2, 'efectivo', Decimal('9000'))

    def test_filtra_ventas_y_metodos_de_pago_solo_de_la_caja_pedida(self):
        respuesta = self.client.get('/api/estadisticas/', {'caja': self.caja_1.id})
        datos = respuesta.json()

        self.assertEqual(Decimal(str(datos['ventas_totales'])), Decimal('1500'))
        self.assertEqual(datos['total_pedidos'], 2)
        self.assertEqual(Decimal(str(datos['ticket_promedio'])), Decimal('750'))

        metodos = {f['metodo']: Decimal(str(f['total'])) for f in datos['ventas_por_metodo']}
        self.assertEqual(metodos, {'efectivo': Decimal('1000'), 'transferencia': Decimal('500')})


class CostoDeProductoTests(TestCase):
    """Cuanto cuesta en insumos hacer un producto.

    La receta ya existia (ProductoInsumo) y las compras tambien (Gasto con insumo y
    cantidad). Lo que faltaba era cruzarlas: costo unitario = monto / cantidad de la
    ultima compra, por la receta.
    """

    def setUp(self):
        User.objects.create_user('duenio', password='x', is_staff=True)
        self.client.login(username='duenio', password='x')

        categoria = Categoria.objects.create(nombre='Hamburguesas')
        self.pan = Insumo.objects.create(nombre='PAN', unidad='unidades')
        self.carne = Insumo.objects.create(nombre='CARNE', unidad='unidades')
        self.lechuga = Insumo.objects.create(nombre='LECHUGA', unidad='kg')

        self.producto = Producto.objects.create(categoria=categoria, nombre='ARGENTA', precio=10000)
        ProductoInsumo.objects.create(producto=self.producto, insumo=self.pan, cantidad=1)
        ProductoInsumo.objects.create(producto=self.producto, insumo=self.carne, cantidad=2)
        ProductoInsumo.objects.create(producto=self.producto, insumo=self.lechuga, cantidad=Decimal('0.2'))

        # 10 panes por $5.000 = $500 c/u ; 50 medallones por $50.000 = $1.000 c/u
        Gasto.objects.create(categoria='insumos', descripcion='panaderia', monto=5000, insumo=self.pan, cantidad=10)
        Gasto.objects.create(categoria='insumos', descripcion='carnicero', monto=50000, insumo=self.carne, cantidad=50)
        # la lechuga queda sin ninguna compra cargada a proposito

    def test_el_costo_unitario_sale_de_la_ultima_compra_no_de_un_promedio(self):
        self.assertEqual(self.pan.costo_unitario(), Decimal('500'))

        Gasto.objects.create(categoria='insumos', descripcion='aumento', monto=12000, insumo=self.pan, cantidad=10)

        self.assertEqual(self.pan.costo_unitario(), Decimal('1200'))

    def test_un_insumo_sin_compras_no_tiene_costo_conocido(self):
        # None y no 0: sumar cero haria ver el producto mas rentable de lo que es.
        self.assertIsNone(self.lechuga.costo_unitario())

    def test_suma_la_receta_y_avisa_que_insumos_no_tienen_costo(self):
        datos = self.client.get('/api/estadisticas/').json()

        fila = next(c for c in datos['costos_productos'] if c['producto_nombre'] == 'ARGENTA')
        # 1 pan ($500) + 2 medallones ($2.000). La lechuga no suma: no tiene compras.
        self.assertEqual(Decimal(str(fila['costo'])), Decimal('2500'))
        self.assertEqual(Decimal(str(fila['ganancia'])), Decimal('7500'))
        self.assertEqual(fila['margen_pct'], 75.0)
        self.assertEqual(fila['insumos_sin_costo'], ['LECHUGA'])

    def test_el_costo_del_periodo_es_la_receta_por_lo_vendido(self):
        pedido = Pedido.objects.create(confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=3, precio_unitario=10000)

        datos = self.client.get('/api/estadisticas/').json()

        self.assertEqual(Decimal(str(datos['costo_insumos_periodo'])), Decimal('7500'))


class HoyTests(TestCase):
    """/estadisticas/hoy/ se pide después de cada cobro en Inicio: si hace consultas por
    pedido, la pantalla se pone más lenta a medida que avanza la noche."""

    def setUp(self):
        User.objects.create_user('duenio', password='x', is_staff=True)
        self.client.login(username='duenio', password='x')
        categoria = Categoria.objects.create(nombre='Hamburguesas')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Clásica', precio=1000)
        self.extra = Producto.objects.create(categoria=categoria, nombre='Panceta', precio=300, es_extra=True)
        self.caja = Caja.objects.create(dia='2026-09-11')

    def _crear_pedidos(self, cantidad):
        for _ in range(cantidad):
            pedido = Pedido.objects.create(caja=self.caja, confirmado=True)
            detalle = DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=2, precio_unitario=1000)
            DetalleExtra.objects.create(detalle_pedido=detalle, extra=self.extra, cantidad=1, precio_unitario=300)

    def test_las_consultas_no_crecen_con_la_cantidad_de_pedidos(self):
        self._crear_pedidos(3)
        with CaptureQueriesContext(connection) as con_pocos:
            self.client.get('/api/estadisticas/hoy/')
        self._crear_pedidos(20)
        with CaptureQueriesContext(connection) as con_muchos:
            respuesta = self.client.get('/api/estadisticas/hoy/')

        self.assertEqual(len(con_muchos), len(con_pocos))
        # 23 pedidos de 2 x (1000 + 300 de extra)
        self.assertEqual(Decimal(str(respuesta.json()['ventas_totales'])), Decimal('59800'))
