from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PedidoViewSet, LocalidadViewSet

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet)
router.register(r'localidades', LocalidadViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
