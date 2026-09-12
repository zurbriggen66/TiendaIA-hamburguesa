from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from clientes.models import Cliente
from pedidos.models import DetallePedido, Pedido
from productos.models import Categoria, Presentacion, Producto


class HistorialDeClientesTests(TestCase):
    """El cliente ve y repite sus pedidos; el admin ve cuánto y qué compró cada uno.
    Al acumulado solo suma lo confirmado y no cancelado."""

    def setUp(self):
        categoria = Categoria.objects.create(nombre='Burguers')
        self.india = Producto.objects.create(categoria=categoria, nombre='INDIA', precio=10000)
        self.doble = Presentacion.objects.create(producto=self.india, nombre='DOBLE', precio=13000)

        usuario = User.objects.create_user('juan@mail.com', email='juan@mail.com', password='x', first_name='Juan')
        self.juan = Cliente.objects.create(usuario=usuario)
        otro = User.objects.create_user('ana@mail.com', email='ana@mail.com', password='x', first_name='Ana')
        self.ana = Cliente.objects.create(usuario=otro)
        User.objects.create_user('duena', password='x', is_staff=True)

        self.p1 = self._pedido(self.juan, [(None, 2, 10000)])                     # 20000
        self.p2 = self._pedido(self.juan, [(self.doble, 1, 13000)])               # 13000
        self._pedido(self.juan, [(None, 5, 10000)], estado='cancelado')           # no suma
        self._pedido(self.juan, [(None, 3, 10000)], confirmado=False)             # web sin confirmar: no suma
        self._pedido(self.ana, [(None, 1, 10000)])

    def _pedido(self, cliente, lineas, estado='pendiente', confirmado=True):
        pedido = Pedido.objects.create(cliente_registrado=cliente, estado=estado, confirmado=confirmado)
        for presentacion, cantidad, precio in lineas:
            DetallePedido.objects.create(pedido=pedido, producto=self.india, presentacion=presentacion,
                                         cantidad=cantidad, precio_unitario=precio)
        return pedido

    def test_mis_pedidos_trae_solo_los_propios_sin_cancelados(self):
        self.client.login(username='juan@mail.com', password='x')
        pedidos = self.client.get('/api/clientes/mi-cuenta/pedidos/').json()
        self.assertEqual(len(pedidos), 3)
        items_doble = next(p for p in pedidos if p['id'] == self.p2.id)['items']
        self.assertEqual((items_doble[0]['producto'], items_doble[0]['presentacion']), (self.india.id, self.doble.id))

    def test_mis_pedidos_pide_estar_logueado_como_cliente(self):
        self.assertIn(self.client.get('/api/clientes/mi-cuenta/pedidos/').status_code, (401, 403))
        self.client.login(username='duena', password='x')
        self.assertEqual(self.client.get('/api/clientes/mi-cuenta/pedidos/').status_code, 403)

    def test_resumen_del_admin_acumula_solo_compras_validas(self):
        self.client.login(username='duena', password='x')
        datos = self.client.get(f'/api/clientes/{self.juan.id}/resumen/').json()
        self.assertEqual(Decimal(str(datos['total_comprado'])), Decimal('33000'))
        self.assertEqual(datos['cantidad_pedidos'], 2)
        self.assertEqual(Decimal(str(datos['ticket_promedio'])), Decimal('16500'))
        self.assertEqual(len(datos['pedidos']), 4)
        self.assertEqual(sum(1 for p in datos['pedidos'] if p['cuenta_como_compra']), 2)
        self.assertEqual(datos['favoritos'][0], {'nombre': 'INDIA', 'unidades': 2, 'gastado': 20000.0})

    def test_listado_del_admin_trae_el_acumulado_de_cada_cliente(self):
        self.client.login(username='duena', password='x')
        por_email = {c['email']: c for c in self.client.get('/api/clientes/').json()}
        self.assertEqual(Decimal(str(por_email['juan@mail.com']['total_comprado'])), Decimal('33000'))
        self.assertEqual(por_email['juan@mail.com']['cantidad_pedidos'], 2)
        self.assertEqual(por_email['ana@mail.com']['cantidad_pedidos'], 1)

    def test_el_resumen_es_solo_para_el_admin(self):
        self.client.login(username='juan@mail.com', password='x')
        self.assertIn(self.client.get(f'/api/clientes/{self.ana.id}/resumen/').status_code, (401, 403))
