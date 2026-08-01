from django.urls import path
from .views import EstadisticasView, CobranzasView

urlpatterns = [
    path('estadisticas/', EstadisticasView.as_view()),
    path('cobranzas/', CobranzasView.as_view()),
]
