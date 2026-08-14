from decimal import Decimal

from django.test import TestCase

from pedidos.models import Caja, DetallePedido, Pago, Pedido
from productos.models import Categoria, Producto


class EstadisticasPorCajaTests(TestCase):
    def _crear_pedido(self, caja, metodo, monto):
        pedido = Pedido.objects.create(caja=caja, confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=monto)
        Pago.objects.create(pedido=pedido, metodo=metodo, monto=monto)
        return pedido

    def setUp(self):
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
