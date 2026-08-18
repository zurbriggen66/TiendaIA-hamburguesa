from django.test import TestCase

from .models import Caja, DetallePedido, Pedido
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
