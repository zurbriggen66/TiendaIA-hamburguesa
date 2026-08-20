from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConfiguracionViewSet, AdminLoginView

router = DefaultRouter()
router.register(r'configuracion', ConfiguracionViewSet)

urlpatterns = [
    path('admin-login/', AdminLoginView.as_view()),
    path('', include(router.urls)),
]