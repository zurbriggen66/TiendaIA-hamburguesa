from django.db import migrations


def marcar_los_que_ya_descontaban(apps, schema_editor):
    """Congela el comportamiento viejo en los gastos que ya existían.

    Hasta ahora se descontaba del cajón TODO gasto en efectivo cargado con un turno
    abierto. Esa inferencia estaba mal (el alquiler pagado en efectivo por el dueño no
    sale del cajón del local), y por eso ahora se pregunta explícitamente. Pero cambiar
    la regla hacia atrás movería los arqueos de turnos ya cerrados, que se contaron a
    mano en su momento: se marca lo que antes descontaba para que la historia no cambie.
    """
    Gasto = apps.get_model('gastos', 'Gasto')
    Gasto.objects.filter(metodo_pago='efectivo', caja__isnull=False).update(sale_del_cajon=True)


class Migration(migrations.Migration):

    dependencies = [
        ('gastos', '0008_gasto_sale_del_cajon'),
    ]

    operations = [
        # Sin reverso: volver atrás es simplemente borrar la columna, y eso ya lo
        # deshace la migración anterior.
        migrations.RunPython(marcar_los_que_ya_descontaban, migrations.RunPython.noop),
    ]
