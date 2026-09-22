from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.test import TestCase
from django.utils import timezone

from antojo.models import AntojoDelDia

from .models import Caja, DetallePedido, MovimientoCaja, Pago, Pedido
from .serializers import PagoSerializer
from gastos.models import Gasto, Insumo
from productos.models import Categoria, Presentacion, Producto, ProductoInsumo


class EliminarCajaTests(TestCase):
    def setUp(self):
        # /api/cajas/ es solo para staff logueado: sin esto los dos tests recibian 401
        # y venian fallando desde que se cerro el endpoint.
        self.client.force_login(User.objects.create_user('duena', password='x', is_staff=True))

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


class AntojoVencidoTests(TestCase):
    """Un antojo con fecha de fin pasada no puede seguir descontando.

    El banner de la tienda usaba esta_vigente(), pero el precio del pedido filtraba
    solo por `activo`: el antojo vencido desaparecia de la tienda y seguia cobrando
    con descuento en cada pedido nuevo. Ahora los dos pasan por AntojoDelDia.vigente().
    """

    def setUp(self):
        categoria = Categoria.objects.create(nombre='Hamburguesas')
        self.producto = Producto.objects.create(categoria=categoria, nombre='ARGENTA', precio=10000)

    def _precio_cobrado(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [{'producto': self.producto.id, 'cantidad': 1}],
        }, content_type='application/json')
        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        return DetallePedido.objects.get(pedido_id=respuesta.data['id']).precio_unitario

    def test_un_antojo_vencido_no_descuenta(self):
        AntojoDelDia.objects.create(
            producto=self.producto, descuento_pct=10, activo=True,
            activo_hasta=timezone.now() - timedelta(hours=1),
        )

        self.assertEqual(self._precio_cobrado(), Decimal('10000'))

    def test_un_antojo_vigente_si_descuenta(self):
        AntojoDelDia.objects.create(
            producto=self.producto, descuento_pct=10, activo=True,
            activo_hasta=timezone.now() + timedelta(hours=1),
        )

        self.assertEqual(self._precio_cobrado(), Decimal('9000'))

    def test_sin_fecha_de_fin_se_apaga_a_mano_como_antes(self):
        AntojoDelDia.objects.create(producto=self.producto, descuento_pct=10, activo=True)

        self.assertEqual(self._precio_cobrado(), Decimal('9000'))

    def test_la_tienda_y_el_precio_ven_el_mismo_antojo(self):
        # Con dos filas activas cargadas, banner y cobro tienen que coincidir.
        otro = Producto.objects.create(categoria=self.producto.categoria, nombre='INGLESA', precio=8000)
        AntojoDelDia.objects.create(producto=otro, descuento_pct=50, activo=True)
        AntojoDelDia.objects.create(producto=self.producto, descuento_pct=10, activo=True)

        banner = self.client.get('/api/antojo-del-dia/').json()

        self.assertEqual(banner['producto']['id'], self.producto.id)
        self.assertEqual(self._precio_cobrado(), Decimal('9000'))


class ExtraSugeridoDesdeElCarritoTests(TestCase):
    """El extra de la venta cruzada se cuelga de la línea que el cliente eligió y cobra
    con descuento; el mismo extra pedido desde el modal del producto va a precio de lista."""

    def setUp(self):
        self.burgers = Categoria.objects.create(nombre='Burguers')
        self.burger = Producto.objects.create(categoria=self.burgers, nombre='Inglesa', precio=12000)
        self.panceta = Producto.objects.create(
            categoria=self.burgers, nombre='Panceta ahumada', precio=1500,
            es_extra=True, sugerido_carrito=True, descuento_carrito_pct=5,
        )

    def _pedir(self, extra_payload):
        return self.client.post('/api/pedidos/', data={
            'items': [{'producto': self.burger.id, 'cantidad': 1, 'extras': [extra_payload]}],
        }, content_type='application/json')

    def test_el_extra_agregado_desde_la_sugerencia_cobra_con_descuento(self):
        respuesta = self._pedir({'producto': self.panceta.id, 'cantidad': 1, 'sugerido_carrito': True})

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        extra = DetallePedido.objects.get(pedido_id=respuesta.data['id']).extras.get()
        self.assertTrue(extra.sugerido_carrito)
        self.assertEqual(extra.precio_unitario, Decimal('1425'))

    def test_el_mismo_extra_sin_la_marca_va_a_precio_de_lista(self):
        respuesta = self._pedir({'producto': self.panceta.id, 'cantidad': 1})

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        extra = DetallePedido.objects.get(pedido_id=respuesta.data['id']).extras.get()
        self.assertFalse(extra.sugerido_carrito)
        self.assertEqual(extra.precio_unitario, Decimal('1500'))

    def test_rechaza_colgar_un_extra_de_otra_categoria(self):
        bebidas = Categoria.objects.create(nombre='Bebidas')
        hielo = Producto.objects.create(categoria=bebidas, nombre='Hielo', precio=300, es_extra=True)

        respuesta = self._pedir({'producto': hielo.id, 'cantidad': 1})

        self.assertEqual(respuesta.status_code, 400, respuesta.content)

    def test_el_subtotal_de_la_linea_incluye_el_extra_por_cada_unidad(self):
        respuesta = self.client.post('/api/pedidos/', data={
            'items': [{
                'producto': self.burger.id, 'cantidad': 2,
                'extras': [{'producto': self.panceta.id, 'cantidad': 1, 'sugerido_carrito': True}],
            }],
        }, content_type='application/json')

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        detalle = DetallePedido.objects.get(pedido_id=respuesta.data['id'])
        # 2 x (12000 + 1425): el extra se cobra por unidad, igual que descuenta stock.
        self.assertEqual(detalle.calcular_subtotal(), Decimal('26850'))


class DesgloseDeCajaTests(TestCase):
    """La caja tiene que poder contrastarse contra la realidad método por método.

    Un total único que mezcla efectivo, transferencia y Mercado Pago no se puede
    verificar contra nada: el dueño cuenta el cajón y no tiene contra qué compararlo.
    """

    def setUp(self):
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=27325)
        self.caja = Caja.objects.create(dia='2026-09-05', monto_inicial=5000, metodo_inicial='efectivo')

    def _pedido(self, total=27325):
        pedido = Pedido.objects.create(caja=self.caja, confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=total)
        return pedido

    def test_el_monto_inicial_queda_en_su_propio_metodo(self):
        saldos = self.caja.desglose_por_metodo()

        self.assertEqual(saldos['efectivo'], Decimal('5000'))
        self.assertEqual(saldos['transferencia'], Decimal('0'))

    def test_un_cobro_simple_suma_al_metodo_con_el_que_pagaron(self):
        Pago.objects.create(pedido=self._pedido(), metodo='transferencia', monto=27325)

        saldos = self.caja.desglose_por_metodo()

        self.assertEqual(saldos['transferencia'], Decimal('27325'))
        self.assertEqual(saldos['efectivo'], Decimal('5000'))

    def test_el_vuelto_por_otra_via_entra_por_un_metodo_y_sale_por_el_otro(self):
        # El caso que no cerraba: paga $30.000 en efectivo un pedido de $27.325 y el
        # vuelto de $2.675 se lo devuelven por transferencia.
        Pago.objects.create(
            pedido=self._pedido(), metodo='efectivo', monto=27325,
            vuelto_monto=2675, vuelto_metodo='transferencia',
        )

        saldos = self.caja.desglose_por_metodo()

        # En el cajón están los $30.000 que entregó el cliente, no los $27.325 del pedido.
        self.assertEqual(saldos['efectivo'], Decimal('5000') + Decimal('30000'))
        self.assertEqual(saldos['transferencia'], Decimal('-2675'))

    def test_la_propina_queda_en_el_metodo_con_el_que_la_dejaron(self):
        Pago.objects.create(pedido=self._pedido(), metodo='efectivo', monto=27325, propina=675)

        self.assertEqual(self.caja.desglose_por_metodo()['efectivo'], Decimal('5000') + Decimal('28000'))

    def test_un_gasto_marcado_como_del_cajon_se_descuenta_del_efectivo(self):
        Gasto.objects.create(
            categoria='insumos', descripcion='Pan', monto=3000,
            metodo_pago='efectivo', caja=self.caja, sale_del_cajon=True,
        )

        self.assertEqual(self.caja.desglose_por_metodo()['efectivo'], Decimal('2000'))

    def test_un_gasto_del_turno_que_no_salio_del_cajon_no_lo_toca(self):
        # Es el caso que rompia la caja: se descontaba todo gasto en efectivo del turno,
        # aunque la plata no hubiera salido de ese cajon.
        Gasto.objects.create(
            categoria='servicios', descripcion='Alquiler', monto=10000,
            metodo_pago='efectivo', caja=self.caja, sale_del_cajon=False,
        )

        self.assertEqual(self.caja.desglose_por_metodo()['efectivo'], Decimal('5000'))

    def test_un_pedido_cancelado_no_cuenta_en_el_desglose(self):
        pedido = self._pedido()
        Pago.objects.create(pedido=pedido, metodo='efectivo', monto=27325)
        pedido.estado = 'cancelado'
        pedido.save()

        self.assertEqual(self.caja.desglose_por_metodo()['efectivo'], Decimal('5000'))

    def test_la_diferencia_del_arqueo_es_lo_contado_menos_lo_esperado(self):
        Pago.objects.create(pedido=self._pedido(), metodo='efectivo', monto=27325)
        self.assertIsNone(self.caja.diferencia_efectivo())

        self.caja.efectivo_contado = Decimal('32000')
        # Esperado: 5000 inicial + 27325 cobrado = 32325. Contó 32000 -> faltan 325.
        self.assertEqual(self.caja.diferencia_efectivo(), Decimal('-325'))


class VueltoPorOtraViaTests(TestCase):
    def setUp(self):
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=27325)
        self.pedido = Pedido.objects.create(confirmado=True)
        DetallePedido.objects.create(pedido=self.pedido, producto=self.producto, cantidad=1, precio_unitario=27325)

    def _validar(self, **extra):
        datos = {'pedido': self.pedido.id, 'metodo': 'efectivo', 'monto': 27325, **extra}
        return PagoSerializer(data=datos)

    def test_acepta_el_vuelto_devuelto_por_otro_metodo(self):
        self.assertTrue(self._validar(vuelto_monto=2675, vuelto_metodo='transferencia').is_valid())

    def test_rechaza_un_vuelto_sin_decir_por_donde_salio(self):
        serializer = self._validar(vuelto_monto=2675)

        self.assertFalse(serializer.is_valid())
        self.assertIn('vuelto_metodo', serializer.errors)

    def test_rechaza_anotar_el_vuelto_cuando_sale_por_el_mismo_metodo(self):
        # No es un error del cajero: es que anotarlo ahí inflaría las dos puntas
        # sin cambiar el saldo, porque entra y sale del mismo lado.
        serializer = self._validar(vuelto_monto=2675, vuelto_metodo='efectivo')

        self.assertFalse(serializer.is_valid())
        self.assertIn('vuelto_metodo', serializer.errors)


class CerrarCajaConArqueoTests(TestCase):
    """El cierre con arqueo devolvia 500: el string del body se guardaba tal cual en el
    atributo y el serializer despues intentaba restarle un Decimal."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        categoria = Categoria.objects.create(nombre='Burguers')
        producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=10000)
        self.caja = Caja.objects.create(dia='2026-09-05', monto_inicial=5000, metodo_inicial='efectivo')
        pedido = Pedido.objects.create(caja=self.caja, confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=producto, cantidad=1, precio_unitario=10000)
        Pago.objects.create(pedido=pedido, metodo='efectivo', monto=10000)

    def test_cerrar_contando_el_cajon_guarda_el_arqueo_y_calcula_la_diferencia(self):
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/cerrar/',
            data={'efectivo_contado': '14000', 'nota_cierre': 'faltaba un billete'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        # Esperado: 5000 inicial + 10000 cobrado = 15000. Conto 14000 -> faltan 1000.
        self.assertEqual(Decimal(str(respuesta.data['diferencia_efectivo'])), Decimal('-1000'))
        self.caja.refresh_from_db()
        self.assertEqual(self.caja.efectivo_contado, Decimal('14000'))
        self.assertFalse(self.caja.esta_abierta)

    def test_cerrar_sin_contar_deja_el_arqueo_vacio(self):
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/cerrar/', data={'nota_cierre': ''}, content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        self.assertIsNone(respuesta.data['diferencia_efectivo'])
        self.caja.refresh_from_db()
        self.assertIsNone(self.caja.efectivo_contado)

    def test_un_arqueo_no_numerico_da_400_y_deja_la_caja_abierta(self):
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/cerrar/',
            data={'efectivo_contado': 'catorce mil'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 400, respuesta.content)
        self.caja.refresh_from_db()
        self.assertTrue(self.caja.esta_abierta)


class HistorialDeCajasTests(TestCase):
    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=10000)

    def _caja_con_pedido(self, dia):
        caja = Caja.objects.create(dia=dia, monto_inicial=1000, metodo_inicial='efectivo')
        pedido = Pedido.objects.create(caja=caja, confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=10000)
        Pago.objects.create(pedido=pedido, metodo='efectivo', monto=10000)
        caja.cerrada_en = f'{dia}T23:00:00Z'
        caja.save()
        return caja

    def test_el_historial_se_puede_filtrar_por_mes(self):
        self._caja_con_pedido('2026-08-14')
        self._caja_con_pedido('2026-09-05')

        respuesta = self.client.get('/api/cajas/?mes=2026-09')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual([c['dia'] for c in respuesta.data], ['2026-09-05'])

    def test_un_mes_mal_escrito_no_vacia_el_historial(self):
        self._caja_con_pedido('2026-09-05')

        respuesta = self.client.get('/api/cajas/?mes=septiembre')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(respuesta.data), 1)

    def _consultas_del_historial(self):
        with CaptureQueriesContext(connection) as ctx:
            respuesta = self.client.get('/api/cajas/')
        self.assertEqual(respuesta.status_code, 200)
        return len(ctx), respuesta

    def test_el_historial_no_hace_mas_consultas_al_crecer(self):
        """Los totales de cada caja se calculaban con consultas propias: costaba 22
        queries por fila y el historial se volvia inusable al acumular turnos.

        Se afirma que el costo es CONSTANTE, no un numero exacto: el numero depende de
        cuantos niveles tenga el prefetch y cambiaria con cualquier campo nuevo, pero
        que no crezca con la cantidad de cajas es la propiedad que importa.
        """
        for dia in ('2026-09-01', '2026-09-02', '2026-09-03'):
            self._caja_con_pedido(dia)
        con_tres, _ = self._consultas_del_historial()

        for dia in ('2026-09-04', '2026-09-05', '2026-09-06'):
            self._caja_con_pedido(dia)
        con_seis, respuesta = self._consultas_del_historial()

        self.assertEqual(con_seis, con_tres, 'el historial vuelve a consultar por cada caja')
        self.assertEqual(len(respuesta.data), 6)
        self.assertEqual(Decimal(str(respuesta.data[0]['total_cobrado'])), Decimal('10000'))


class MovimientosDeCajaTests(TestCase):
    """El registro de movimientos y el desglose por método tienen que contar los mismos
    hechos: si se separan, el listado deja de servir para explicar un descuadre."""

    def setUp(self):
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=27325)
        self.caja = Caja.objects.create(dia='2026-09-05', monto_inicial=20000, metodo_inicial='efectivo')

    def _pedido(self, total=27325, cliente='Bren'):
        pedido = Pedido.objects.create(caja=self.caja, confirmado=True, cliente=cliente)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=total)
        return pedido

    def test_los_movimientos_suman_exactamente_el_desglose(self):
        # Un cobro con vuelto cruzado, uno con propina y un gasto: los tres casos que
        # mueven plata de forma distinta.
        Pago.objects.create(
            pedido=self._pedido(), metodo='efectivo', monto=27325,
            vuelto_monto=2675, vuelto_metodo='transferencia',
        )
        Pago.objects.create(pedido=self._pedido(cliente='Sofia'), metodo='efectivo', monto=27325, propina=1000)
        Gasto.objects.create(
            categoria='insumos', descripcion='Pan', monto=10000, metodo_pago='efectivo',
            caja=self.caja, sale_del_cajon=True,
        )

        por_metodo = {}
        for mov in self.caja.movimientos():
            por_metodo[mov['metodo']] = por_metodo.get(mov['metodo'], Decimal('0')) + mov['monto']

        desglose = self.caja.desglose_por_metodo()
        for metodo, saldo in desglose.items():
            self.assertEqual(
                por_metodo.get(metodo, Decimal('0')), saldo,
                f'los movimientos de {metodo} no suman su saldo del desglose',
            )
        # 20000 inicial + 30000 entregados + 28325 entregados - 10000 de gasto
        self.assertEqual(desglose['efectivo'], Decimal('68325'))
        self.assertEqual(desglose['transferencia'], Decimal('-2675'))

    def test_el_vuelto_cruzado_aparece_como_salida_propia(self):
        Pago.objects.create(
            pedido=self._pedido(), metodo='efectivo', monto=27325,
            vuelto_monto=2675, vuelto_metodo='transferencia',
        )

        vueltos = [m for m in self.caja.movimientos() if m['tipo'] == 'vuelto']

        self.assertEqual(len(vueltos), 1)
        self.assertEqual(vueltos[0]['monto'], Decimal('-2675'))
        self.assertEqual(vueltos[0]['metodo'], 'transferencia')

    def test_van_ordenados_del_mas_nuevo_al_mas_viejo(self):
        Pago.objects.create(pedido=self._pedido(), metodo='efectivo', monto=27325)

        fechas = [m['fecha'] for m in self.caja.movimientos()]

        self.assertEqual(fechas, sorted(fechas, reverse=True))
        # La apertura es lo mas viejo del turno, siempre va ultima.
        self.assertEqual(self.caja.movimientos()[-1]['tipo'], 'apertura')


class CajonDeEfectivoTests(TestCase):
    """El cajón es plata física: solo sube con lo que entra en mano y solo baja con lo
    que sale de ahí. No puede quedar en negativo."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=10000)
        self.caja = Caja.objects.create(dia='2026-09-06', monto_inicial=13000, metodo_inicial='efectivo')

    def _gasto(self, monto, sale_del_cajon, metodo='efectivo'):
        return Gasto.objects.create(
            categoria='otros', descripcion='Compra', monto=monto,
            metodo_pago=metodo, caja=self.caja, sale_del_cajon=sale_del_cajon,
        )

    def test_un_gasto_que_no_salio_del_cajon_no_toca_el_efectivo(self):
        # El alquiler pagado por transferencia es un gasto del turno, pero no sale
        # del cajón: descontarlo inventaba un faltante en el arqueo.
        self._gasto(45000, sale_del_cajon=False, metodo='transferencia')

        self.assertEqual(self.caja.efectivo_en_cajon(), Decimal('13000'))
        self.assertEqual(self.caja.descuadre_efectivo(), Decimal('0'))

    def test_un_gasto_del_cajon_si_lo_descuenta(self):
        self._gasto(3000, sale_del_cajon=True)

        self.assertEqual(self.caja.efectivo_en_cajon(), Decimal('10000'))

    def test_el_cajon_nunca_queda_en_negativo_y_avisa_el_faltante(self):
        # El caso real: $45.000 de gasto sobre un fondo de $13.000. Fisicamente
        # imposible, asi que se corta en 0 y se informa lo que falta registrar.
        self._gasto(45000, sale_del_cajon=True)

        self.assertEqual(self.caja.efectivo_en_cajon(), Decimal('0'))
        self.assertEqual(self.caja.descuadre_efectivo(), Decimal('32000'))

    def test_un_ingreso_de_efectivo_sube_el_cajon(self):
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/mover-efectivo/',
            data={'tipo': 'ingreso', 'monto': '20000', 'motivo': 'Cambio para vueltos'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        self.assertEqual(self.caja.efectivo_en_cajon(), Decimal('33000'))

    def test_un_retiro_baja_el_cajon(self):
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/mover-efectivo/',
            data={'tipo': 'retiro', 'monto': '3000', 'motivo': 'Al banco'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        self.assertEqual(self.caja.efectivo_en_cajon(), Decimal('10000'))

    def test_no_se_puede_retirar_mas_de_lo_que_hay(self):
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/mover-efectivo/',
            data={'tipo': 'retiro', 'monto': '99999'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 400, respuesta.content)
        self.assertEqual(self.caja.efectivo_en_cajon(), Decimal('13000'))

    def test_no_se_puede_mover_efectivo_de_una_caja_cerrada(self):
        self.caja.cerrada_en = '2026-09-06T23:00:00Z'
        self.caja.save()

        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/mover-efectivo/',
            data={'tipo': 'ingreso', 'monto': '1000'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 400, respuesta.content)

    def test_los_movimientos_siguen_sumando_el_desglose_con_ingresos_y_gastos(self):
        # El invariante tiene que aguantar los tipos nuevos, no solo cobros.
        MovimientoCaja.objects.create(caja=self.caja, tipo='ingreso', monto=20000)
        MovimientoCaja.objects.create(caja=self.caja, tipo='retiro', monto=5000)
        self._gasto(3000, sale_del_cajon=True)
        self._gasto(9000, sale_del_cajon=False, metodo='transferencia')

        suma = sum((m['monto'] for m in self.caja.movimientos() if m['metodo'] == 'efectivo'), Decimal('0'))

        self.assertEqual(suma, self.caja.desglose_por_metodo()['efectivo'])
        self.assertEqual(suma, Decimal('25000'))  # 13000 + 20000 - 5000 - 3000


class BalanceDeProductosTests(TestCase):
    """El balance cruza cuánto deja cada producto con cuántas unidades se vendieron.
    Las unidades tienen que venir de TODOS los productos, no del top de más vendidos."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        categoria = Categoria.objects.create(nombre='Burguers')
        insumo = Insumo.objects.create(nombre='Carne', unidad='kg', cantidad_disponible=100)
        # El costo unitario sale de las compras cargadas del insumo.
        Gasto.objects.create(
            categoria='insumos', descripcion='Carne', monto=10000,
            metodo_pago='efectivo', insumo=insumo, cantidad=10,
        )
        self.productos = []
        for i in range(7):
            producto = Producto.objects.create(categoria=categoria, nombre=f'Burger {i}', precio=5000)
            ProductoInsumo.objects.create(producto=producto, insumo=insumo, cantidad=1)
            self.productos.append(producto)

        # Se venden los 7, con el ultimo como el MENOS vendido: si las unidades salieran
        # de productos_mas_vendidos (top 5), este quedaria en 0.
        pedido = Pedido.objects.create(confirmado=True)
        for i, producto in enumerate(self.productos):
            DetallePedido.objects.create(
                pedido=pedido, producto=producto, cantidad=10 - i, precio_unitario=5000,
            )

    def test_todos_los_productos_traen_sus_unidades_vendidas(self):
        respuesta = self.client.get('/api/estadisticas/')

        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        por_nombre = {p['producto_nombre']: p for p in respuesta.data['costos_productos']}
        self.assertEqual(len(por_nombre), 7)
        # El 6to y el 7mo estan fuera del top 5 y aun asi tienen sus unidades.
        self.assertEqual(por_nombre['Burger 5']['unidades_vendidas'], 5)
        self.assertEqual(por_nombre['Burger 6']['unidades_vendidas'], 4)

    def test_el_costo_de_lo_vendido_cuenta_todos_los_productos(self):
        respuesta = self.client.get('/api/estadisticas/')

        # 1 kg de carne por unidad, a $1.000 el kg. Se vendieron 10+9+8+7+6+5+4 = 49.
        self.assertEqual(Decimal(str(respuesta.data['costo_insumos_periodo'])), Decimal('49000'))


class CostoDeUnProductoTests(TestCase):
    """La cuenta que pidio el cliente: 2 fetas de cheddar a $200 + 1 disco de carne a
    $300 = $500 de costo. Y que se pueda LEER la cuenta, no solo el resultado."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        categoria = Categoria.objects.create(nombre='Burguers')
        self.cheddar = Insumo.objects.create(nombre='CHEDDAR', unidad='fetas', costo_manual=200)
        self.carne = Insumo.objects.create(nombre='CARNE', unidad='discos', costo_manual=300)
        self.burger = Producto.objects.create(categoria=categoria, nombre='Americana', precio=1000)
        ProductoInsumo.objects.create(producto=self.burger, insumo=self.cheddar, cantidad=2)
        ProductoInsumo.objects.create(producto=self.burger, insumo=self.carne, cantidad=1)

    def _producto(self):
        respuesta = self.client.get('/api/estadisticas/')
        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        return respuesta.data['costos_productos'][0]

    def test_el_costo_es_la_suma_de_la_receta(self):
        producto = self._producto()

        self.assertEqual(Decimal(str(producto['costo'])), Decimal('700'))  # 2x200 + 1x300
        self.assertEqual(Decimal(str(producto['ganancia'])), Decimal('300'))
        self.assertEqual(producto['margen_pct'], 30.0)

    def test_la_receta_viene_desglosada_para_poder_leer_la_cuenta(self):
        receta = {r['insumo_nombre']: r for r in self._producto()['receta']}

        self.assertEqual(Decimal(str(receta['CHEDDAR']['cantidad'])), Decimal('2'))
        self.assertEqual(Decimal(str(receta['CHEDDAR']['costo_unitario'])), Decimal('200'))
        self.assertEqual(Decimal(str(receta['CHEDDAR']['subtotal'])), Decimal('400'))
        self.assertEqual(Decimal(str(receta['CARNE']['subtotal'])), Decimal('300'))

    def test_el_costo_a_mano_le_gana_al_deducido_de_la_ultima_compra(self):
        # Se carga una compra a otro precio: el valor escrito a mano manda, porque es
        # el que el dueño reviso.
        Gasto.objects.create(
            categoria='insumos', descripcion='Cheddar', monto=1000,
            metodo_pago='efectivo', insumo=self.cheddar, cantidad=2,  # daria $500 c/u
        )

        self.assertEqual(self.cheddar.costo_unitario(), Decimal('200'))
        self.assertEqual(self.cheddar.origen_del_costo(), 'manual')

    def test_sin_costo_a_mano_se_deduce_de_la_compra(self):
        pan = Insumo.objects.create(nombre='PAN', unidad='unidades')
        Gasto.objects.create(
            categoria='insumos', descripcion='Pan', monto=6000,
            metodo_pago='efectivo', insumo=pan, cantidad=100,
        )

        self.assertEqual(pan.costo_unitario(), Decimal('60'))
        self.assertEqual(pan.origen_del_costo(), 'compra')

    def test_un_insumo_sin_ningun_costo_se_reporta_como_faltante(self):
        salsa = Insumo.objects.create(nombre='SALSA', unidad='kg')
        ProductoInsumo.objects.create(producto=self.burger, insumo=salsa, cantidad=1)

        producto = self._producto()

        self.assertIsNone(salsa.costo_unitario())
        self.assertEqual(salsa.origen_del_costo(), None)
        # El costo no cambia (no se suma cero en silencio) y se avisa cual falta.
        self.assertEqual(Decimal(str(producto['costo'])), Decimal('700'))
        self.assertIn('SALSA', producto['insumos_sin_costo'])


class ArqueoNegativoTests(TestCase):
    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        self.caja = Caja.objects.create(dia='2026-09-06', monto_inicial=13000, metodo_inicial='efectivo')

    def test_no_se_puede_contar_un_cajon_en_negativo(self):
        """Se puede tipear -9600 en el campo: contar menos de cero billetes no existe."""
        respuesta = self.client.post(
            f'/api/cajas/{self.caja.id}/cerrar/',
            data={'efectivo_contado': '-9600'},
            content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 400, respuesta.content)
        self.caja.refresh_from_db()
        self.assertTrue(self.caja.esta_abierta)


class CobradoPorMetodoTests(TestCase):
    """Cuanto entro por cada via es distinto del saldo: el saldo arranca del fondo
    inicial y le resta gastos, asi que no se puede leer como 'cuanto me pagaron'."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='Inglesa', precio=10000)
        self.caja = Caja.objects.create(dia='2026-09-06', monto_inicial=20000, metodo_inicial='efectivo')

    def _cobrar(self, metodo, monto, propina=0, **extra):
        pedido = Pedido.objects.create(caja=self.caja, confirmado=True)
        DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=monto)
        Pago.objects.create(pedido=pedido, metodo=metodo, monto=monto, propina=propina, **extra)

    def _cobros(self):
        respuesta = self.client.get(f'/api/cajas/{self.caja.id}/')
        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        return {c['metodo']: Decimal(str(c['monto'])) for c in respuesta.data['cobrado_por_metodo']}

    def test_no_mezcla_el_fondo_inicial_ni_los_gastos(self):
        self._cobrar('efectivo', 10000)
        Gasto.objects.create(
            categoria='otros', descripcion='Pan', monto=3000,
            metodo_pago='efectivo', caja=self.caja, sale_del_cajon=True,
        )

        cobros = self._cobros()

        # Cobrado por efectivo: solo la venta. El saldo, en cambio, es
        # 20.000 inicial + 10.000 cobrado - 3.000 de gasto = 27.000.
        self.assertEqual(cobros['efectivo'], Decimal('10000'))
        self.assertEqual(self.caja.desglose_por_metodo()['efectivo'], Decimal('27000'))

    def test_separa_cada_via(self):
        self._cobrar('efectivo', 10000)
        self._cobrar('transferencia', 25000)
        self._cobrar('mercado_pago', 7000)

        cobros = self._cobros()

        self.assertEqual(cobros['efectivo'], Decimal('10000'))
        self.assertEqual(cobros['transferencia'], Decimal('25000'))
        self.assertEqual(cobros['mercado_pago'], Decimal('7000'))

    def test_la_propina_entra_por_la_misma_via(self):
        self._cobrar('efectivo', 10000, propina=1500)

        self.assertEqual(self._cobros()['efectivo'], Decimal('11500'))

    def test_los_metodos_sin_cobros_no_aparecen(self):
        self._cobrar('efectivo', 10000)

        self.assertEqual(list(self._cobros()), ['efectivo'])

    def test_la_suma_de_los_cobros_es_el_total_cobrado_mas_propinas(self):
        self._cobrar('efectivo', 10000, propina=500)
        self._cobrar('transferencia', 25000)

        respuesta = self.client.get(f'/api/cajas/{self.caja.id}/')
        suma = sum(Decimal(str(c['monto'])) for c in respuesta.data['cobrado_por_metodo'])

        esperado = Decimal(str(respuesta.data['total_cobrado'])) + Decimal(str(respuesta.data['total_propinas']))
        self.assertEqual(suma, esperado)


class CostoRapidoTests(TestCase):
    """El costo por unidad se edita desde la tarjeta de Stock, sin abrir el formulario:
    es el dato que mas cambia y el que alimenta todo el Balance."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.force_login(User.objects.get(username='duena'))
        self.insumo = Insumo.objects.create(nombre='CHEDDAR', unidad='fetas')
        Gasto.objects.create(
            categoria='insumos', descripcion='Cheddar', monto=2000,
            metodo_pago='efectivo', insumo=self.insumo, cantidad=10,  # $200 c/u
        )

    def test_un_patch_del_costo_le_gana_al_deducido_de_la_compra(self):
        self.assertEqual(self.insumo.costo_unitario(), Decimal('200'))

        respuesta = self.client.patch(
            f'/api/insumos/{self.insumo.id}/',
            data={'costo_manual': '310'}, content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        self.insumo.refresh_from_db()
        self.assertEqual(self.insumo.costo_unitario(), Decimal('310'))
        self.assertEqual(self.insumo.origen_del_costo(), 'manual')

    def test_volver_a_cero_devuelve_el_costo_de_la_compra(self):
        """Es como se 'borra' el costo a mano: no queda clavado para siempre."""
        self.insumo.costo_manual = Decimal('310')
        self.insumo.save()

        self.client.patch(
            f'/api/insumos/{self.insumo.id}/',
            data={'costo_manual': '0'}, content_type='application/json',
        )

        self.insumo.refresh_from_db()
        self.assertEqual(self.insumo.costo_unitario(), Decimal('200'))
        self.assertEqual(self.insumo.origen_del_costo(), 'compra')

    def test_rechaza_un_costo_negativo(self):
        respuesta = self.client.patch(
            f'/api/insumos/{self.insumo.id}/',
            data={'costo_manual': '-50'}, content_type='application/json',
        )

        self.assertEqual(respuesta.status_code, 400, respuesta.content)
        self.insumo.refresh_from_db()
        self.assertEqual(self.insumo.costo_unitario(), Decimal('200'))


class BuscadorEImpresoTests(TestCase):
    """Dos pedidos del mostrador: encontrar los de un cliente por nombre, y que un
    ticket ya impreso no vuelva a ofrecerse para imprimir."""

    def setUp(self):
        User.objects.create_user('duena', password='x', is_staff=True)
        self.client.login(username='duena', password='x')
        categoria = Categoria.objects.create(nombre='Burguers')
        self.producto = Producto.objects.create(categoria=categoria, nombre='INGLESA', precio=9980)
        for nombre, telefono in [('joaco', '3541000001'), ('Joaquina', '3541000002'), ('Danilo', '1160378050')]:
            pedido = Pedido.objects.create(cliente=nombre, telefono=telefono, confirmado=True)
            DetallePedido.objects.create(pedido=pedido, producto=self.producto, cantidad=1, precio_unitario=9980)

    def nombres(self, **params):
        return sorted(p['cliente'] for p in self.client.get('/api/pedidos/', params).json()['results'])

    def test_busca_por_nombre_sin_importar_mayusculas_ni_si_esta_completo(self):
        self.assertEqual(self.nombres(buscar='joac'), ['joaco'])
        self.assertEqual(self.nombres(buscar='Joa'), ['Joaquina', 'joaco'])
        self.assertEqual(self.nombres(buscar='DANILO'), ['Danilo'])
        self.assertEqual(self.nombres(buscar='nadie'), [])

    def test_tambien_encuentra_por_telefono(self):
        self.assertEqual(self.nombres(buscar='1160378050'), ['Danilo'])

    def test_sin_buscar_trae_todos(self):
        self.assertEqual(len(self.nombres()), 3)

    def test_un_pedido_nace_sin_imprimir_y_se_marca_una_sola_vez(self):
        pedido = Pedido.objects.first()
        self.assertFalse(pedido.impreso)
        respuesta = self.client.post(f'/api/pedidos/{pedido.id}/marcar-impreso/')
        self.assertEqual(respuesta.status_code, 200, respuesta.content)
        self.assertTrue(respuesta.json()['impreso'])
        self.client.post(f'/api/pedidos/{pedido.id}/marcar-impreso/')
        pedido.refresh_from_db()
        self.assertTrue(pedido.impreso)
