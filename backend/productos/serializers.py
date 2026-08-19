import json

from rest_framework import serializers
from .models import Categoria, Producto, Combo, ProductoInsumo, ComboItem, Presentacion, PresentacionInsumo


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    insumos_detalle = serializers.SerializerMethodField()
    insumos_json = serializers.CharField(write_only=True, required=False, allow_blank=True)
    descuento_activo = serializers.SerializerMethodField()
    precio_actual = serializers.SerializerMethodField()
    precio_sugerido_carrito = serializers.SerializerMethodField()
    presentaciones = serializers.SerializerMethodField()
    presentaciones_json = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Producto
        fields = [
            'id', 'categoria', 'categoria_nombre', 'nombre', 'descripcion', 'precio',
            'imagen', 'destacado', 'es_extra', 'insumos_detalle', 'insumos_json',
            'descuento_pct', 'descuento_hasta', 'descuento_activo', 'precio_actual',
            'sugerido_carrito', 'descuento_carrito_pct', 'precio_sugerido_carrito',
            'presentaciones', 'presentaciones_json', 'creado',
        ]

    def get_descuento_activo(self, obj):
        return obj.tiene_descuento_activo()

    def get_precio_actual(self, obj):
        return obj.precio_actual()

    def get_precio_sugerido_carrito(self, obj):
        return obj.precio_sugerido_carrito()

    def get_insumos_detalle(self, obj):
        return [
            {
                'insumo': detalle.insumo_id,
                'nombre': detalle.insumo.nombre,
                'unidad': detalle.insumo.unidad,
                'cantidad': detalle.cantidad,
            }
            for detalle in obj.detalle_insumos.select_related('insumo').all()
        ]

    def get_presentaciones(self, obj):
        return [
            {
                'id': p.id,
                'nombre': p.nombre,
                'precio': p.precio,
                'orden': p.orden,
                'insumos_extra': [
                    {'insumo': pi.insumo_id, 'nombre': pi.insumo.nombre, 'cantidad': pi.cantidad}
                    for pi in p.detalle_insumos_extra.select_related('insumo').all()
                ],
                # Derivado de los insumos extra (ver Presentacion.mejor_descuento_insumo),
                # no es un campo propio: si un medallón está en oferta, la variante que lo
                # suma queda con este % aplicado sobre su precio.
                'descuento_pct': p.mejor_descuento_insumo(),
            }
            for p in obj.presentaciones.all()
        ]

    def _guardar_insumos(self, producto, insumos_json):
        if insumos_json is None:
            return
        try:
            filas = json.loads(insumos_json) if insumos_json else []
        except (TypeError, ValueError):
            raise serializers.ValidationError({'insumos_json': 'Formato inválido.'})

        ProductoInsumo.objects.filter(producto=producto).delete()
        nuevas = [
            ProductoInsumo(producto=producto, insumo_id=fila['insumo'], cantidad=fila.get('cantidad') or 1)
            for fila in filas if fila.get('insumo')
        ]
        ProductoInsumo.objects.bulk_create(nuevas)

    def _guardar_presentaciones(self, producto, presentaciones_json):
        if presentaciones_json is None:
            return
        try:
            filas = json.loads(presentaciones_json) if presentaciones_json else []
        except (TypeError, ValueError):
            raise serializers.ValidationError({'presentaciones_json': 'Formato inválido.'})

        # A diferencia de los insumos, acá no se puede borrar-todo-y-recrear en cada
        # guardado: DetallePedido.presentacion apunta a filas puntuales, y este JSON se
        # reenvía completo en cada edición del producto (la haya tocado o no). Se hace
        # upsert por id para no romper esa referencia en pedidos ya hechos; sólo se
        # borran las presentaciones que efectivamente dejaron de estar en la lista.
        ids_vigentes = set()
        for orden, fila in enumerate(filas):
            nombre = (fila.get('nombre') or '').strip()
            precio = fila.get('precio')
            if not nombre or not precio:
                continue
            fila_id = fila.get('id')
            if fila_id and producto.presentaciones.filter(id=fila_id).exists():
                producto.presentaciones.filter(id=fila_id).update(nombre=nombre, precio=precio, orden=orden)
                presentacion = producto.presentaciones.get(id=fila_id)
            else:
                presentacion = Presentacion.objects.create(producto=producto, nombre=nombre, precio=precio, orden=orden)
            ids_vigentes.add(presentacion.id)

            # Los insumos extra sí se borran-todo-y-recrean en cada guardado (igual que
            # los insumos del producto): a diferencia de la Presentacion en sí, nada
            # referencia estas filas puntuales desde un pedido ya hecho.
            PresentacionInsumo.objects.filter(presentacion=presentacion).delete()
            filas_insumos_extra = fila.get('insumos_extra') or []
            nuevas_extra = [
                PresentacionInsumo(presentacion=presentacion, insumo_id=fi['insumo'], cantidad=fi.get('cantidad') or 1)
                for fi in filas_insumos_extra if fi.get('insumo')
            ]
            PresentacionInsumo.objects.bulk_create(nuevas_extra)

        producto.presentaciones.exclude(id__in=ids_vigentes).delete()

    def create(self, validated_data):
        insumos_json = validated_data.pop('insumos_json', None)
        presentaciones_json = validated_data.pop('presentaciones_json', None)
        producto = Producto.objects.create(**validated_data)
        self._guardar_insumos(producto, insumos_json)
        self._guardar_presentaciones(producto, presentaciones_json)
        return producto

    def update(self, instance, validated_data):
        insumos_json = validated_data.pop('insumos_json', None)
        presentaciones_json = validated_data.pop('presentaciones_json', None)
        producto = super().update(instance, validated_data)
        self._guardar_insumos(producto, insumos_json)
        self._guardar_presentaciones(producto, presentaciones_json)
        return producto


class ComboSerializer(serializers.ModelSerializer):
    productos_detalle = serializers.SerializerMethodField()
    productos_json = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Combo
        fields = [
            'id', 'nombre', 'descripcion', 'precio', 'imagen', 'activo',
            'productos_detalle', 'productos_json', 'creado',
        ]

    def get_productos_detalle(self, obj):
        return [
            {
                'id': item.producto_id,
                'nombre': item.producto.nombre,
                'precio': item.producto.precio,
                'cantidad': item.cantidad,
            }
            for item in obj.items.select_related('producto').all()
        ]

    def _guardar_items(self, combo, productos_json, requerido=False):
        try:
            filas = json.loads(productos_json) if productos_json else []
        except (TypeError, ValueError):
            raise serializers.ValidationError({'productos_json': 'Formato inválido.'})

        if requerido and not filas:
            raise serializers.ValidationError({'productos_json': 'El combo necesita al menos un producto.'})

        ComboItem.objects.filter(combo=combo).delete()
        nuevos = [
            ComboItem(combo=combo, producto_id=fila['producto'], cantidad=fila.get('cantidad') or 1)
            for fila in filas if fila.get('producto')
        ]
        ComboItem.objects.bulk_create(nuevos)

    def create(self, validated_data):
        productos_json = validated_data.pop('productos_json', '')
        combo = Combo.objects.create(**validated_data)
        self._guardar_items(combo, productos_json, requerido=True)
        return combo

    def update(self, instance, validated_data):
        productos_json = validated_data.pop('productos_json', None)
        combo = super().update(instance, validated_data)
        if productos_json is not None:
            self._guardar_items(combo, productos_json, requerido=True)
        return combo
