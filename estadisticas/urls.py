from django.urls import path
from .views import EstadisticasView, CobranzasView, HoyView

urlpatterns = [
    path('estadisticas/', EstadisticasView.as_view()),
    path('estadisticas/hoy/', HoyView.as_view()),
    path('cobranzas/', CobranzasView.as_view()),
]
