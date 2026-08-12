from django.contrib import admin
from .models import Pedido, DetallePedido, Caja


class DetallePedidoInline(admin.TabularInline):
    model = DetallePedido
    extra = 1


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente', 'estado', 'caja', 'creado')
    list_filter = ('estado',)
    search_fields = ('cliente',)
    inlines = [DetallePedidoInline]


@admin.register(Caja)
class CajaAdmin(admin.ModelAdmin):
    list_display = ('id', 'abierta_en', 'cerrada_en', 'esta_abierta')
    list_filter = ('cerrada_en',)
