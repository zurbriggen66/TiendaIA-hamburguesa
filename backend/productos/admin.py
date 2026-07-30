from django.contrib import admin
from .models import Categoria, Producto, Combo


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'creado')
    search_fields = ('nombre',)


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'destacado', 'creado')
    list_filter = ('categoria', 'destacado')
    search_fields = ('nombre',)


@admin.register(Combo)
class ComboAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'activo', 'creado')
    list_filter = ('activo',)
    search_fields = ('nombre',)
