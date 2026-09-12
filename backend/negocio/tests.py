from django.test import TestCase

# Create your tests here.


class AdminLoginTests(TestCase):
    """El login del panel desde el celular: el teclado pone mayúscula al principio."""

    def setUp(self):
        from django.contrib.auth.models import User
        User.objects.create_user('encargado', password='clave-segura-123', is_staff=True)
        User.objects.create_user('cliente', password='clave-segura-123', is_staff=False)

    def login(self, usuario, password='clave-segura-123'):
        return self.client.post('/api/admin-login/', {'usuario': usuario, 'password': password}, content_type='application/json')

    def test_entra_aunque_el_teclado_ponga_mayusculas(self):
        for usuario in ['encargado', 'Encargado', 'ENCARGADO', '  Encargado ']:
            self.assertEqual(self.login(usuario).status_code, 200, usuario)

    def test_contrasena_incorrecta_o_usuario_sin_permiso_no_entran(self):
        self.assertEqual(self.login('Encargado', 'otra').status_code, 401)
        self.assertEqual(self.login('Cliente').status_code, 401)
        self.assertEqual(self.login('nadie').status_code, 401)
