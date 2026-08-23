from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Cliente, Recompensa


class RegistroSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    telefono = serializers.CharField(max_length=30, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(username=email).exists():
            raise serializers.ValidationError('Ya hay una cuenta con ese email.')
        return email

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        # username = email: el User de Django exige username, y no queremos pedir dos cosas.
        usuario = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['nombre'].strip(),
        )
        return Cliente.objects.create(usuario=usuario, telefono=validated_data.get('telefono', ''))


class ClienteSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source='usuario.first_name', read_only=True)
    email = serializers.EmailField(source='usuario.email', read_only=True)
    puntos_en_pesos = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = ['id', 'nombre', 'email', 'telefono', 'puntos', 'puntos_en_pesos', 'creado']

    def get_puntos_en_pesos(self, obj):
        from negocio.models import ConfiguracionSitio

        config = ConfiguracionSitio.objects.last()
        valor = config.valor_punto if config else 1
        return obj.puntos * valor


class RecompensaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recompensa
        fields = ['id', 'nombre', 'puntos', 'activa', 'creado']

    def validate_puntos(self, value):
        if value <= 0:
            raise serializers.ValidationError('El premio tiene que costar al menos 1 punto.')
        return value
