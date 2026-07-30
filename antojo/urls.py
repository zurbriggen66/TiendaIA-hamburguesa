from django.urls import path
from .views import AntojoDelDiaView

urlpatterns = [
    path('antojo-del-dia/', AntojoDelDiaView.as_view()),
]
