from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, ProductoViewSet, ComboViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'combos', ComboViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
