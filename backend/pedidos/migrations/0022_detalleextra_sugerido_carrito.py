from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pedidos', '0021_pago_propina'),
    ]

    operations = [
        migrations.AddField(
            model_name='detalleextra',
            name='sugerido_carrito',
            field=models.BooleanField(default=False),
        ),
    ]
