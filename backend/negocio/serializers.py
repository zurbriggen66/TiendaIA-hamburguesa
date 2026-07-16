from rest_framework import serializers
from .models import ConfiguracionSitio

class ConfiguracionSitioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSitio
        fields = '__all__'