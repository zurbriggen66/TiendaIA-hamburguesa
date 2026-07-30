from django.contrib import admin
from .models import AntojoDelDia


@admin.register(AntojoDelDia)
class AntojoDelDiaAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'producto', 'descuento_pct', 'motivo')
