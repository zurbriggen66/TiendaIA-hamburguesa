from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PedidoViewSet, LocalidadViewSet, PagoViewSet

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet)
router.register(r'localidades', LocalidadViewSet)
router.register(r'pagos', PagoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
