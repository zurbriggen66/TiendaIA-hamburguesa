from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InsumoViewSet, GastoViewSet, GastoFijoViewSet

router = DefaultRouter()
router.register(r'insumos', InsumoViewSet)
router.register(r'gastos', GastoViewSet)
router.register(r'gastos-fijos', GastoFijoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
