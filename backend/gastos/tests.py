from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from gastos.models import Insumo, MovimientoStock
from pedidos.models import DetallePedido, Pedido
from productos.models import Categoria, Presentacion, PresentacionInsumo, Producto, ProductoInsumo


class StockConsistenteTests(TestCase):
    """El stock tiene que cuadrar con lo que pasó: cada compra, venta, cancelación,
    borrado y recuento. Nace de un caso real: la carne marcaba -3 cuando faltaban 10, y
    50 unidades de un gasto de prueba borrado quedaron sumadas para siempre."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.login(username='duena', password='x')
        categoria = Categoria.objects.create(nombre='Burguers')
        self.carne = Insumo.objects.create(nombre='CARNE', cantidad_disponible=35)
        self.burger = Producto.objects.create(categoria=categoria, nombre='INDIA', precio=1000)
        ProductoInsumo.objects.create(producto=self.burger, insumo=self.carne, cantidad=1)
        self.doble = Presentacion.objects.create(producto=self.burger, nombre='DOBLE', precio=1500)
        PresentacionInsumo.objects.create(presentacion=self.doble, insumo=self.carne, cantidad=1)
        self.medallon = Producto.objects.create(categoria=categoria, nombre='MEDALLON', precio=300, es_extra=True)
        ProductoInsumo.objects.create(producto=self.medallon, insumo=self.carne, cantidad=1)

    def stock(self):
        self.carne.refresh_from_db()
        return self.carne.cantidad_disponible

    def poner_stock(self, valor):
        Insumo.objects.filter(pk=self.carne.pk).update(cantidad_disponible=valor)

    def pedido(self, cantidad=1, doble=False, extras=()):
        item = {'producto': self.burger.id, 'cantidad': cantidad,
                'presentacion': self.doble.id if doble else None,
                'extras': [{'producto': e, 'cantidad': 1} for e in extras]}
        r = self.client.post('/api/pedidos/', {'cliente': 't', 'origen': 'admin', 'tipo_entrega': 'retiro', 'items': [item]},
                             content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['id']

    def compra(self, cantidad):
        r = self.client.post('/api/gastos/', {'categoria': 'insumos', 'descripcion': 'Compra', 'monto': '55000',
                                              'cantidad': str(cantidad), 'insumo': self.carne.id},
                             content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['id']

    def test_borrar_una_compra_resta_lo_que_sumo(self):
        gasto = self.compra(50)
        self.assertEqual(self.stock(), 85)
        self.client.delete(f'/api/gastos/{gasto}/')
        self.assertEqual(self.stock(), 35)

    def test_corregir_la_cantidad_de_una_compra_ajusta_la_diferencia(self):
        gasto = self.compra(80)
        self.client.patch(f'/api/gastos/{gasto}/', {'cantidad': '72'}, content_type='application/json')
        self.assertEqual(self.stock(), 107)

    def test_sin_stock_suficiente_queda_negativo_con_el_faltante_real(self):
        self.poner_stock(1)
        pedido = self.pedido(cantidad=3, doble=True)  # 6 medallones
        self.assertEqual(self.stock(), -5)
        self.client.patch(f'/api/pedidos/{pedido}/', {'estado': 'cancelado'}, content_type='application/json')
        self.assertEqual(self.stock(), 1)

    def test_extras_son_por_unidad_y_se_devuelven_al_borrar(self):
        pedido = self.pedido(cantidad=2, extras=[self.medallon.id])  # 2 + 2
        self.assertEqual(self.stock(), 31)
        self.client.delete(f'/api/pedidos/{pedido}/')
        self.assertEqual(self.stock(), 35)

    def test_borrar_un_pedido_cancelado_no_devuelve_dos_veces(self):
        pedido = self.pedido(cantidad=2)
        self.client.patch(f'/api/pedidos/{pedido}/', {'estado': 'cancelado'}, content_type='application/json')
        self.client.delete(f'/api/pedidos/{pedido}/')
        self.assertEqual(self.stock(), 35)

    def test_cambiar_la_receta_no_altera_lo_que_devuelve_un_pedido_viejo(self):
        pedido = self.pedido(cantidad=10)
        ProductoInsumo.objects.filter(producto=self.burger).update(cantidad=2)
        self.client.patch(f'/api/pedidos/{pedido}/', {'estado': 'cancelado'}, content_type='application/json')
        self.assertEqual(self.stock(), 35)

    def test_reactivar_un_pedido_cancelado_vuelve_a_descontar(self):
        pedido = self.pedido(cantidad=2)
        self.client.patch(f'/api/pedidos/{pedido}/', {'estado': 'cancelado'}, content_type='application/json')
        self.client.patch(f'/api/pedidos/{pedido}/', {'estado': 'pendiente'}, content_type='application/json')
        self.assertEqual(self.stock(), 33)

    def test_editar_el_insumo_no_pisa_el_stock_aunque_mande_el_numero_viejo(self):
        visto_al_abrir = self.client.get(f'/api/insumos/{self.carne.id}/').json()['cantidad_disponible']
        self.pedido(cantidad=5)
        r = self.client.patch(f'/api/insumos/{self.carne.id}/', {'nombre': 'CARNE 100G', 'cantidad_disponible': visto_al_abrir},
                              content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.stock(), 30)

    def test_se_puede_editar_un_insumo_con_stock_negativo(self):
        self.poner_stock(-3)
        r = self.client.patch(f'/api/insumos/{self.carne.id}/', {'nombre': 'CARNE 100G', 'cantidad_disponible': '-3.00'},
                              content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)

    def test_ajuste_por_recuento_asienta_la_diferencia(self):
        self.pedido(cantidad=5)
        r = self.client.post(f'/api/insumos/{self.carne.id}/ajustar/', {'cantidad_real': '28'}, content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.stock(), 28)
        ajuste = self.carne.movimientos.get(tipo='ajuste')
        self.assertEqual(ajuste.cantidad, Decimal('-2'))

    def test_ajuste_por_recuento_rechaza_valores_invalidos(self):
        for valor in ['-1', 'abc', None, 'NaN']:
            r = self.client.post(f'/api/insumos/{self.carne.id}/ajustar/', {'cantidad_real': valor}, content_type='application/json')
            self.assertEqual(r.status_code, 400, valor)
        self.assertEqual(self.stock(), 35)

    def test_cada_movimiento_queda_en_el_historial_con_su_saldo(self):
        self.compra(10)
        self.pedido(cantidad=1, doble=True)
        movimientos = self.client.get(f'/api/insumos/{self.carne.id}/movimientos/').json()
        self.assertEqual([(m['tipo'], Decimal(str(m['cantidad'])), Decimal(str(m['stock_resultante']))) for m in movimientos],
                         [('venta', Decimal('-2'), Decimal('43')), ('compra', Decimal('10'), Decimal('45'))])

    def test_pedido_anterior_al_historial_se_devuelve_con_la_receta(self):
        viejo = Pedido.objects.create(confirmado=True)
        DetallePedido.objects.create(pedido=viejo, producto=self.burger, cantidad=4, precio_unitario=1000)
        Pedido.objects.filter(pk=viejo.pk).update(creado=timezone.now() - timedelta(days=30))
        MovimientoStock.objects.create(insumo=self.carne, tipo='inicial', cantidad=0, stock_resultante=35)
        self.client.delete(f'/api/pedidos/{viejo.id}/')
        self.assertEqual(self.stock(), 39)
