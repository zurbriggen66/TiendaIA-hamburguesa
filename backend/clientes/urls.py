from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClienteViewSet, LoginView, MiCuentaView, RegistroView

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)

urlpatterns = [
    path('clientes/registro/', RegistroView.as_view()),
    path('clientes/login/', LoginView.as_view()),
    path('clientes/mi-cuenta/', MiCuentaView.as_view()),
    path('', include(router.urls)),
]
