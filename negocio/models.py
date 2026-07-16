from django.db import models

class ConfiguracionSitio(models.Model):
    # Usamos blank=True y null=True para que no de error si aún no subieron la imagen
    logo = models.ImageField(upload_to='sitio/logos/', null=True, blank=True)
    imagen_principal = models.ImageField(upload_to='sitio/portadas/', null=True, blank=True)

    def __str__(self):
        return "Configuración General del Sitio"