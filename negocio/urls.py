from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConfiguracionViewSet

router = DefaultRouter()
router.register(r'configuracion', ConfiguracionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]