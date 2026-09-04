from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from .models import Caja, DetallePedido, Pago, Pedido
from productos.models import Categoria, Presentacion, Producto


class EliminarCajaTests(TestCase):
    def test_no_se_puede_eliminar_la_caja_abierta(self):
        caja = Caja.objects.create(dia='2026-08-14')

        respuesta = self.client.delete(f'/api/cajas/{caja.id}/')

        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(Caja.objects.filter(id=caja.id).exists())

    def test_eliminar_una_caja_cerrada_desvincula_sus_pedidos_sin_borrarlos(self):
        caja = Caja.objects.create(dia='2026-08-14')
        caja.cerrada_en = '2026-08-14T23:00:00Z'
        caja.save()
        pedido = Pedido.objects.create(caja=caja, confirmado=True)

        respuesta = self.client.delete(f'/api/cajas/{caja.id}/')

        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(Caja.objects.filter(id=caja.id).exists())
        pedido.refresh_from_db()
        self.assertIsNone(pedido.caja_id)


class PresentacionEnPedidoTests(TestCase):
    def setUp(self):
        categoria = Categoria.objects.create(nombre='Hamburguesas')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Clásica', precio=1000)
        self.simple = Presentacion.objects.create(producto=self.producto, nombre='Simple', precio=1000, orden=0)
        self.doble = Presentacion.objects.create(producto=self.producto, nombre='Doble', precio=1500, orden=1)

    def test_el_precio_congelado_es_el_de_la_presentacion_elegida_no_el_del_producto(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [{'producto': self.producto.id, 'presentacion': self.doble.id, 'cantidad': 1}],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        detalle = DetallePedido.objects.get(pedido_id=respuesta.data['id'])
        self.assertEqual(detalle.presentacion_id, self.doble.id)
        self.assertEqual(detalle.precio_unitario, self.doble.precio)

    def test_rechaza_una_presentacion_que_no_es_de_ese_producto(self):
        otra_categoria = Categoria.objects.create(nombre='Bebidas')
        otro_producto = Producto.objects.create(categoria=otra_categoria, nombre='Gaseosa', precio=500)

        respuesta = self.client.post('/api/pedidos/', data={
            'items': [{'producto': otro_producto.id, 'presentacion': self.doble.id, 'cantidad': 1}],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 400)


class VueltoYPropinaTests(TestCase):
    """El cajero escribe lo que le entregan, no lo que vale el pedido.

    Antes eso se guardaba entero como `monto`: un billete de $20.000 para un pedido
    de $12.900 dejaba $7.100 de vuelto contados como venta cobrada, y la caja no
    cerraba nunca. Ahora al pedido se le aplica como mucho lo que falta y el
    sobrante va a `propina` (si se lo dejan) o a ningun lado (si volvio de vuelto).
    """

    def setUp(self):
        User.objects.create_user('duenio', password='x', is_staff=True)
        self.client.login(username='duenio', password='x')

        categoria = Categoria.objects.create(nombre='Hamburguesas')
        producto = Producto.objects.create(categoria=categoria, nombre='Clasica', precio=12900)
        self.caja = Caja.objects.create(dia='2026-09-04')
        self.pedido = Pedido.objects.create(caja=self.caja, confirmado=True)
        DetallePedido.objects.create(
            pedido=self.pedido, producto=producto, cantidad=1, precio_unitario=12900,
        )

    def cobrar(self, **datos):
        return self.client.post('/api/pagos/', data={
            'pedido': self.pedido.id, 'metodo': 'efectivo', **datos,
        }, content_type='application/json')

    def test_rechaza_un_monto_mayor_a_lo_que_falta(self):
        respuesta = self.cobrar(monto=20000)

        self.assertEqual(respuesta.status_code, 400, respuesta.content)
        self.assertFalse(Pago.objects.exists())

    def test_la_propina_entra_a_la_caja_pero_no_cuenta_como_venta(self):
        respuesta = self.cobrar(monto=12900, propina=7100)

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.calcular_cobrado(), Decimal('12900'))
        self.assertEqual(self.pedido.calcular_estado_cobro(), 'pagado')

        caja = self.client.get(f'/api/cajas/{self.caja.id}/').data
        self.assertEqual(Decimal(caja['total_ventas']), Decimal('12900'))
        self.assertEqual(Decimal(caja['total_propinas']), Decimal('7100'))

    def test_el_vuelto_devuelto_no_deja_rastro_en_la_caja(self):
        respuesta = self.cobrar(monto=12900, propina=0)

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        caja = self.client.get(f'/api/cajas/{self.caja.id}/').data
        self.assertEqual(Decimal(caja['total_propinas']), Decimal('0'))

    def test_permite_pagos_parciales_hasta_completar_el_total(self):
        self.assertEqual(self.cobrar(monto=5000).status_code, 201)
        self.assertEqual(self.cobrar(monto=7900).status_code, 201)
        # El pedido ya esta saldado: un peso mas tiene que rebotar.
        self.assertEqual(self.cobrar(monto=1).status_code, 400)

        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.calcular_estado_cobro(), 'pagado')
