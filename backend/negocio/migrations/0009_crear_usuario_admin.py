from django.contrib.auth.hashers import make_password
from django.db import migrations


USUARIO = 'antojo'
PASSWORD = 'antojo2026'


def crear_usuario_admin(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    if User.objects.filter(username=USUARIO).exists():
        return
    User.objects.create(
        username=USUARIO,
        password=make_password(PASSWORD),
        is_staff=True,
        is_active=True,
    )


def eliminar_usuario_admin(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    User.objects.filter(username=USUARIO, is_superuser=False).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('negocio', '0008_configuracionsitio_mensaje_cerrado_and_more'),
    ]

    operations = [
        migrations.RunPython(crear_usuario_admin, eliminar_usuario_admin),
    ]
