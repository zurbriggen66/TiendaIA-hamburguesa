from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0020_pedido_recompensa_pedido_recompensa_nombre'),
    ]

    operations = [
        migrations.AddField(
            model_name='pago',
            name='propina',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
