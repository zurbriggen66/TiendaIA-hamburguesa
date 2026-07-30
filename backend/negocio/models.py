from django.db import models

class ConfiguracionSitio(models.Model):
    # Usamos blank=True y null=True para que no de error si aún no subieron la imagen
    logo = models.ImageField(upload_to='sitio/logos/', null=True, blank=True)
    imagen_principal = models.ImageField(upload_to='sitio/portadas/', null=True, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True, default='5493544400993')
    instagram = models.URLField(blank=True, default='https://www.instagram.com/antojoburger_/')

    def __str__(self):
        return "Configuración General del Sitio"