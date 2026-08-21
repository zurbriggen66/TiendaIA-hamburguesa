from rest_framework import serializers
from .models import ConfiguracionSitio

class ConfiguracionSitioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSitio
        fields = [
            'id',
            'logo',
            'logo_precarga',
            'imagen_principal',
            'video_principal',
            'whatsapp',
            'instagram',
            'color_navbar',
            'color_fondo',
            'color_superficie',
            'color_acento',
            'color_boton_agregar',
            'tienda_abierta',
            'mensaje_cerrado',
            'pesos_por_punto',
            'valor_punto',
        ]

    def validate_pesos_por_punto(self, value):
        # Es divisor al acreditar puntos: en 0 rompería el alta de cualquier pedido.
        if value < 1:
            raise serializers.ValidationError('Tiene que ser al menos $1 por punto.')
        return value

    def validate_valor_punto(self, value):
        if value < 0:
            raise serializers.ValidationError('El valor del punto no puede ser negativo.')
        return value