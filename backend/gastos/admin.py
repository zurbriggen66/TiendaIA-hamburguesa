from django.contrib import admin
from .models import Insumo, Gasto


@admin.register(Insumo)
class InsumoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'unidad', 'cantidad_disponible')
    search_fields = ('nombre',)


@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ('descripcion', 'categoria', 'monto', 'insumo', 'cantidad', 'fecha')
    list_filter = ('categoria',)
    search_fields = ('descripcion',)
