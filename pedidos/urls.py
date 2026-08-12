from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PedidoViewSet, LocalidadViewSet, PagoViewSet, CajaViewSet

router = DefaultRouter()
router.register(r'pedidos', PedidoViewSet)
router.register(r'localidades', LocalidadViewSet)
router.register(r'pagos', PagoViewSet)
router.register(r'cajas', CajaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
