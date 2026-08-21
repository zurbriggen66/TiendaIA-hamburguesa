from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ClienteViewSet, LoginView, MiCuentaView, RecompensaViewSet, RegistroView

router = DefaultRouter()
router.register(r'clientes', ClienteViewSet)
router.register(r'recompensas', RecompensaViewSet)

urlpatterns = [
    path('clientes/registro/', RegistroView.as_view()),
    path('clientes/login/', LoginView.as_view()),
    path('clientes/mi-cuenta/', MiCuentaView.as_view()),
    path('', include(router.urls)),
]
