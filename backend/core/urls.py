from django.contrib import admin
from django.urls import path, include # Asegurate de importar include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('negocio.urls')), # AGREGAR ESTA LÍNEA
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)