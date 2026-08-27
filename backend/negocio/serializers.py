from rest_framework import serializers

from core.permissions import es_staff

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
            'permisos_empleado',
        ]

    def to_representation(self, instance):
        # El GET de /configuracion/ es público (EsAdminOSoloLectura), así que los
        # permisos del modo empleado se recortan para cualquiera que no sea staff:
        # no hacen falta en la tienda y no tienen por qué viajar al visitante.
        datos = super().to_representation(instance)
        request = self.context.get('request')
        if not (request and es_staff(request)):
            datos.pop('permisos_empleado', None)
        return datos

    def validate_permisos_empleado(self, value):
        # Llega como lista de claves; el catálogo lo define el frontend, acá solo
        # se valida la forma para no guardar cualquier cosa en el JSONField.
        if not isinstance(value, list) or any(not isinstance(v, str) for v in value):
            raise serializers.ValidationError('Tiene que ser una lista de claves de permiso.')
        return value

    def validate_pesos_por_punto(self, value):
        # Es divisor al acreditar puntos: en 0 rompería el alta de cualquier pedido.
        if value < 1:
            raise serializers.ValidationError('Tiene que ser al menos $1 por punto.')
        return value

    def validate_valor_punto(self, value):
        if value < 0:
            raise serializers.ValidationError('El valor del punto no puede ser negativo.')
        return value