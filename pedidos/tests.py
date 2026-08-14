from django.test import TestCase

from .models import Caja, Pedido


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
