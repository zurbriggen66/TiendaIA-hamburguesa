from django.db import migrations, models
from django.utils import timezone


def backfill_dia(apps, schema_editor):
    Caja = apps.get_model('pedidos', 'Caja')
    for caja in Caja.objects.all():
        caja.dia = timezone.localtime(caja.abierta_en).date()
        caja.save(update_fields=['dia'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0012_pedido_confirmado_pedido_origen'),
    ]

    operations = [
        migrations.AddField(
            model_name='caja',
            name='dia',
            field=models.DateField(null=True),
        ),
        migrations.RunPython(backfill_dia, noop),
        migrations.AlterField(
            model_name='caja',
            name='dia',
            field=models.DateField(),
        ),
    ]
