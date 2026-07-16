from rest_framework import viewsets
from .models import ConfiguracionSitio
from .serializers import ConfiguracionSitioSerializer

class ConfiguracionViewSet(viewsets.ModelViewSet):
    queryset = ConfiguracionSitio.objects.all()
    serializer_class = ConfiguracionSitioSerializer