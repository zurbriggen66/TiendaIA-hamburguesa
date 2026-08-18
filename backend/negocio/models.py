from django.db import models

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

    def __str__(self):
        return "Configuración General del Sitio"