from django.db import transaction
from rest_framework import serializers
from .models import Insumo, Gasto, GastoFijo, mover_stock


class InsumoSerializer(serializers.ModelSerializer):
    descuento_activo = serializers.SerializerMethodField()
    # El costo por unidad no se exponia, asi que el frontend no podia mostrar ni cuanto
    # cuesta un insumo ni cuanto vale la mercaderia parada en el deposito.
    costo_unitario = serializers.SerializerMethodField()
    origen_del_costo = serializers.SerializerMethodField()

    class Meta:
        model = Insumo
        fields = [
            'id', 'nombre', 'unidad', 'cantidad_disponible', 'stock_minimo', 'precio',
            'costo_manual', 'costo_unitario', 'origen_del_costo',
            'descuento_pct', 'descuento_hasta', 'descuento_activo', 'creado',
        ]

    def get_descuento_activo(self, obj):
        return obj.tiene_descuento_activo()

    def get_costo_unitario(self, obj):
        return obj.costo_unitario()

    def get_origen_del_costo(self, obj):
        return obj.origen_del_costo()

    def validate_costo_manual(self, value):
        if value < 0:
            raise serializers.ValidationError('El costo no puede ser negativo.')
        return value

    def validate_cantidad_disponible(self, value):
        # Solo cuenta al crear (el stock inicial). Al editar se ignora, ver update().
        if self.instance is None and value < 0:
            raise serializers.ValidationError('El stock no puede ser negativo.')
        return value

    @transaction.atomic
    def create(self, validated_data):
        inicial = validated_data.pop('cantidad_disponible', 0) or 0
        insumo = super().create(validated_data)
        mover_stock(insumo.id, inicial, 'inicial', detalle='Stock al crear el insumo')
        insumo.refresh_from_db()
        return insumo

    def update(self, instance, validated_data):
        # El stock no se edita desde acá: lo mueven los pedidos, las compras y el ajuste
        # por recuento (/insumos/<id>/ajustar/). Aceptarlo hacía que un modal abierto hace
        # rato mandara el número viejo y borrara todo lo vendido o comprado en el medio.
        validated_data.pop('cantidad_disponible', None)
        return super().update(instance, validated_data)

    def validate_stock_minimo(self, value):
        if value < 0:
            raise serializers.ValidationError('El mínimo no puede ser negativo.')
        return value


class GastoSerializer(serializers.ModelSerializer):
    insumo_nombre = serializers.CharField(source='insumo.nombre', read_only=True)
    metodo_pago_label = serializers.CharField(source='get_metodo_pago_display', read_only=True)
    categoria_label = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model = Gasto
        fields = '__all__'
        # La caja la decide el servidor por el turno abierto, nunca llega por body:
        # si no, un gasto podria cargarse contra un turno ya cerrado y cuadrado.
        read_only_fields = ['caja']

    @transaction.atomic
    def create(self, validated_data):
        from pedidos.models import Caja

        caja_abierta = Caja.objects.filter(cerrada_en__isnull=True).order_by('-abierta_en').first()
        validated_data['caja'] = caja_abierta
        # Sin turno abierto no hay cajon del que salir, por mas que lo marquen.
        if not caja_abierta:
            validated_data['sale_del_cajon'] = False
        gasto = Gasto.objects.create(**validated_data)
        efecto = gasto.efecto_en_stock()
        if efecto:
            mover_stock(*efecto, 'compra', gasto=gasto, detalle=gasto.descripcion)
        return gasto

    @transaction.atomic
    def update(self, instance, validated_data):
        # Corregir una compra (otra cantidad, otro insumo, otra categoría) deshace lo que
        # sumó la versión anterior y aplica la nueva. Antes el stock no se enteraba.
        anterior = instance.efecto_en_stock()
        gasto = super().update(instance, validated_data)
        nuevo = gasto.efecto_en_stock()
        if anterior != nuevo:
            if anterior:
                mover_stock(anterior[0], -anterior[1], 'compra_anulada', gasto=gasto,
                            detalle=f'Compra corregida: {gasto.descripcion}')
            if nuevo:
                mover_stock(*nuevo, 'compra', gasto=gasto, detalle=gasto.descripcion)
        return gasto


class GastoFijoSerializer(serializers.ModelSerializer):
    categoria_label = serializers.CharField(source='get_categoria_display', read_only=True)
    frecuencia_label = serializers.CharField(source='get_frecuencia_display', read_only=True)
    dias_restantes = serializers.SerializerMethodField()
    esta_por_vencer = serializers.SerializerMethodField()

    class Meta:
        model = GastoFijo
        fields = [
            'id', 'nombre', 'categoria', 'categoria_label', 'monto', 'frecuencia',
            'frecuencia_label', 'proximo_vencimiento', 'dias_aviso', 'activo',
            'dias_restantes', 'esta_por_vencer', 'creado',
        ]

    def get_dias_restantes(self, obj):
        return obj.dias_restantes()

    def get_esta_por_vencer(self, obj):
        return obj.esta_por_vencer()
