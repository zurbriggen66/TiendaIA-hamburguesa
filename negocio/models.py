from django.db import models


def permisos_empleado_default():
    """Lo mínimo para atender el mostrador: recibir, despachar, cobrar e imprimir
    pedidos. Sin montos de caja ni gastos. El dueño lo ajusta desde el panel."""
    return ['inicio', 'pedidos', 'cobrar_pedidos', 'eliminar_pedidos']


class ConfiguracionSitio(models.Model):
    # Usamos blank=True y null=True para que no de error si aún no subieron la imagen
    logo = models.ImageField(upload_to='sitio/logos/', null=True, blank=True)
    logo_precarga = models.ImageField(
        upload_to='sitio/logos/',
        null=True,
        blank=True,
        help_text="Imagen que se muestra en la pantalla de carga inicial (recomendado: PNG sin fondo)",
    )
    imagen_principal = models.ImageField(upload_to='sitio/portadas/', null=True, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True, default='5493544400993')
    instagram = models.URLField(blank=True, default='https://www.instagram.com/antojoburger_/')
    video_principal = models.FileField(
        upload_to='videos/', 
        null=True, 
        blank=True, 
        help_text="Video de fondo para el inicio (Formato 9:16 recomendado)"
    )

    # Programa de puntos: cuántos pesos gastados valen 1 punto, y cuánto vale 1 punto
    # al canjearlo. Con los defaults: gastás $100 → 1 punto; 1 punto = $1 de descuento.
    pesos_por_punto = models.PositiveIntegerField(default=100)
    valor_punto = models.DecimalField(max_digits=10, decimal_places=2, default=1)

    # Colores de la vista del cliente (código hex, ej. "#0d2b23"). Los defaults son
    # los colores actuales del sitio, así que mientras nadie los cambie desde el
    # admin la tienda se ve exactamente igual que antes de este campo existir.
    color_navbar = models.CharField(max_length=7, default='#0d2b23')
    color_fondo = models.CharField(max_length=7, default='#0d2b23')
    color_superficie = models.CharField(max_length=7, default='#163a30')
    color_acento = models.CharField(max_length=7, default='#e8630c')

    # Apagar esto bloquea los pedidos nuevos de la tienda web (no los cargados a mano
    # en el admin): ver PedidoSerializer.validate en la app "pedidos".
    tienda_abierta = models.BooleanField(default=True)
    mensaje_cerrado = models.CharField(
        max_length=200, blank=True, default='Volvemos pronto, gracias por tu paciencia.'
    )
    color_boton_agregar = models.CharField(max_length=7, default='#ffc700')

    # Qué ve y qué puede hacer el panel cuando está en "modo empleado" (el dueño
    # presta la tablet del mostrador). Lista de claves: las secciones del admin más
    # unos permisos finos (ver_montos, abrir_cerrar_caja, ...). El catálogo completo
    # vive en frontend/src/utils/modoEmpleado.js — es un bloqueo visual, no de API.
    permisos_empleado = models.JSONField(default=permisos_empleado_default, blank=True)

    def __str__(self):
        return "Configuración General del Sitio"