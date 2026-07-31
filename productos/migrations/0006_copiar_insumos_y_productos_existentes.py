from django.db import migrations


def copiar_datos(apps, schema_editor):
    Producto = apps.get_model('productos', 'Producto')
    Combo = apps.get_model('productos', 'Combo')
    ProductoInsumo = apps.get_model('productos', 'ProductoInsumo')
    ComboItem = apps.get_model('productos', 'ComboItem')

    for producto in Producto.objects.all():
        for insumo in producto.insumos.all():
            ProductoInsumo.objects.get_or_create(producto=producto, insumo=insumo, defaults={'cantidad': 1})

    for combo in Combo.objects.all():
        for producto in combo.productos.all():
            ComboItem.objects.get_or_create(combo=combo, producto=producto, defaults={'cantidad': 1})


def revertir_datos(apps, schema_editor):
    ProductoInsumo = apps.get_model('productos', 'ProductoInsumo')
    ComboItem = apps.get_model('productos', 'ComboItem')
    ProductoInsumo.objects.all().delete()
    ComboItem.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('productos', '0005_comboitem_productoinsumo'),
    ]

    operations = [
        migrations.RunPython(copiar_datos, revertir_datos),
    ]
