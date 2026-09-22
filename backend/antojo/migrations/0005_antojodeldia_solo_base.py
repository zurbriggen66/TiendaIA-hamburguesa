from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('antojo', '0004_antojodeldia_presentacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='antojodeldia',
            name='solo_base',
            field=models.BooleanField(default=False),
        ),
    ]
