from django.urls import path
from .views import EstadisticasView

urlpatterns = [
    path('estadisticas/', EstadisticasView.as_view()),
]
