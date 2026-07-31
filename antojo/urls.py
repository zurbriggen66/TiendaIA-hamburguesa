from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AntojoDelDiaView, AntojoDelDiaConfigViewSet

router = DefaultRouter()
router.register(r'antojo-config', AntojoDelDiaConfigViewSet)

urlpatterns = [
    path('antojo-del-dia/', AntojoDelDiaView.as_view()),
    path('', include(router.urls)),
]
