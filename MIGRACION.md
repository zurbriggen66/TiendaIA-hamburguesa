# Migración PythonAnywhere → VPS Ubuntu (Postgres + nginx + certbot)

Migra **back y front**, separados en la VPS aunque en PA estén en el mismo repo.

| | En PA | En la VPS |
|---|---|---|
| Backend | `~/TiendaIA-hamburguesa/backend` | `/home/antojo/back` (repo `ANTOJO-BACK`) → `api.tudominio.com` |
| Frontend | `~/TiendaIA-hamburguesa/frontend` | `/home/antojo/front` (repo `ANTOJO-FRONT`) → `tudominio.com` |
| Base | SQLite | Postgres |

**Antes de arrancar: buscá y reemplazá `tudominio.com` por tu dominio real en todo este
archivo.** Lo demás va literal.

La app corre como usuario `antojo`, no como root: si algún día hay un bug explotable en
Django, el atacante queda encerrado en ese usuario en vez de tener la máquina entera.

PythonAnywhere y Vercel quedan prendidos hasta el paso 11. Si algo sale mal no tocás el DNS
y seguís sirviendo desde donde estás hoy.

---

## 0. Preparativos

**a)** Desde tu máquina, subir los cambios de config del backend. Sin esto la VPS clona la
versión vieja, que tiene la base SQLite hardcodeada:

```bash
cd ANTOJO-BACK
git add -A && git commit -m "config: base y hosts por variables de entorno para la VPS"
git push
```

**b)** En la consola de PA, guardar el estado de las migraciones. Esto es lo que después
confirma que la base nueva tiene exactamente el mismo esquema que la vieja — importa porque
el código de PA sale del monorepo y el de la VPS de `ANTOJO-BACK`:

```bash
cd ~/TiendaIA-hamburguesa/backend
python manage.py showmigrations > ~/migraciones_pa.txt
scp ~/migraciones_pa.txt root@2.24.69.234:~/
```

**c)** DNS, tres registros **A** apuntando a `2.24.69.234`:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | 2.24.69.234 |
| A | `www` | 2.24.69.234 |
| A | `api` | 2.24.69.234 |

Verificá con `dig +short tudominio.com api.tudominio.com` hasta que devuelvan la IP. Tarda,
hacelo primero.

---

## 1. Sacar los datos de PythonAnywhere — HECHO

```bash
cd ~/TiendaIA-hamburguesa/backend
python manage.py dumpdata --natural-foreign --indent 2 \
  -e contenttypes -e auth.permission -e admin.logentry -e sessions.session \
  > ~/datos.json
tar czf ~/media.tar.gz media/
scp ~/datos.json ~/media.tar.gz root@2.24.69.234:~/
```

Ya están en `/root/` de la VPS: `datos.json` (656K) y `media.tar.gz` (230M).

> Si rehacés el dump por cualquier motivo, repetí también el `scp`.

---

## 2. Paquetes en la VPS (como root)

```bash
apt update
apt install -y python3-venv python3-pip postgresql nginx git
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

Node para compilar el frontend. El de `apt` es demasiado viejo para Vite 8:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v    # tiene que decir v22.x
```

---

## 3. Usuario de la app y archivos (como root)

```bash
adduser --disabled-password --gecos "" antojo
mv /root/datos.json /root/media.tar.gz /root/migraciones_pa.txt /home/antojo/
chown antojo:antojo /home/antojo/datos.json /home/antojo/media.tar.gz /home/antojo/migraciones_pa.txt
chmod o+x /home/antojo
```

El `chmod o+x` es para que nginx (que corre como `www-data`) pueda entrar al home a servir
`media/`, `static/` y el build del front. Sin eso todo eso da 403.

---

## 4. Base Postgres (como root)

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE antojo;
CREATE USER antojo WITH PASSWORD 'PONE_UNA_PASSWORD_LARGA';
ALTER ROLE antojo SET client_encoding TO 'utf8';
ALTER ROLE antojo SET default_transaction_isolation TO 'read committed';
ALTER ROLE antojo SET timezone TO 'America/Argentina/Cordoba';
ALTER DATABASE antojo OWNER TO antojo;
SQL
```

El `OWNER TO` no es opcional en Postgres 15+ (Ubuntu 24 trae 16): sin eso `migrate` falla
con `permission denied for schema public`.

---

## 5. Backend: código y entorno (como usuario antojo)

```bash
su - antojo
```

**Los pasos 5, 6 y 8 van dentro de esa sesión.**

```bash
git clone https://github.com/TIENDA-IA/ANTOJO-BACK.git ~/back
cd ~/back
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

cp .env.example .env
./venv/bin/python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"
nano .env
```

El `.env` tiene que quedar así, con la password igual a la del paso 4:

```
DJANGO_SECRET_KEY=<la que imprimió el comando de arriba>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.tudominio.com
DB_NAME=antojo
DB_USER=antojo
DB_PASSWORD=PONE_UNA_PASSWORD_LARGA
DB_HOST=localhost
DB_PORT=5432
CORS_EXTRA_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

`CORS_EXTRA_ORIGINS` es lo que le permite al front en el dominio nuevo llamar a la API: son
subdominios distintos, así que el navegador exige CORS igual que con Vercel.

---

## 6. Migrar los datos (como usuario antojo)

```bash
cd ~/back
tar xzf ~/media.tar.gz
./venv/bin/python manage.py migrate
```

**Verificar el esquema contra PA antes de cargar nada.** Si esto imprime diferencias, el
código de la VPS no es el mismo que el de PA y el `loaddata` va a fallar o, peor, cargar mal:

```bash
diff <(./venv/bin/python manage.py showmigrations) ~/migraciones_pa.txt && echo "ESQUEMA IGUAL, seguí"
```

Con el esquema confirmado:

```bash
./venv/bin/python manage.py loaddata ~/datos.json
./venv/bin/python manage.py collectstatic --noinput
```

El `tar` trajo los 230M de fotos de producción y pisó las pocas commiteadas en el repo. Eso
está bien: las de producción son las buenas.

**Resetear las secuencias** — obligatorio. `loaddata` inserta los IDs explícitos y Postgres
no mueve sus contadores solo: si lo saltás, el primer pedido nuevo explota con
`duplicate key value violates unique constraint`. SQLite perdonaba esto, Postgres no.

```bash
./venv/bin/python manage.py sqlsequencereset auth authtoken antojo clientes gastos negocio pedidos productos | ./venv/bin/python manage.py dbshell
```

Chequeo de que llegaron los datos:

```bash
./venv/bin/python manage.py shell -c "
from django.contrib.auth.models import User
from pedidos.models import Pedido
from productos.models import Producto
print('users', User.objects.count(), 'pedidos', Pedido.objects.count(), 'productos', Producto.objects.count())"
```

Corré exactamente lo mismo en la consola de PA y compará los tres números. Si no coinciden,
**no sigas**.

---

## 7. Gunicorn como servicio (como root, salí con `exit`)

```bash
tee /etc/systemd/system/antojo.service > /dev/null <<'EOF'
[Unit]
Description=Antojo backend (gunicorn)
After=network.target postgresql.service

[Service]
User=antojo
Group=www-data
WorkingDirectory=/home/antojo/back
ExecStart=/home/antojo/back/venv/bin/gunicorn --workers 3 --bind unix:/run/antojo/antojo.sock core.wsgi:application
RuntimeDirectory=antojo
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now antojo
systemctl status antojo --no-pager
```

Si falla: `journalctl -u antojo -n 50 --no-pager`.

---

## 8. Frontend: compilar (como usuario antojo, `su - antojo` de nuevo)

```bash
git clone https://github.com/TIENDA-IA/ANTOJO-FRONT.git ~/front
cd ~/front

# Vite lee esto en build y lo hornea en el bundle. Sin el archivo, el build
# apunta a 127.0.0.1:8000 y el sitio no encuentra la API.
echo "VITE_API_URL=https://api.tudominio.com/api" > .env.production

npm ci
npm run build
ls dist/index.html    # tiene que existir
```

Node solo hace falta para compilar. Lo que se sirve es `dist/`, archivos estáticos: no queda
ningún proceso de Node corriendo.

Salí con `exit`.

---

## 9. nginx: dos sitios (como root)

**Backend** en `api.tudominio.com`:

```bash
tee /etc/nginx/sites-available/antojo-api > /dev/null <<'EOF'
server {
    listen 80;
    server_name api.tudominio.com;

    # las fotos de productos que se suben desde el admin
    client_max_body_size 20M;

    location /media/  { alias /home/antojo/back/media/; }
    location /static/ { alias /home/antojo/back/staticfiles/; }

    location / {
        include proxy_params;
        proxy_pass http://unix:/run/antojo/antojo.sock;
    }
}
EOF
```

**Frontend** en `tudominio.com`:

```bash
tee /etc/nginx/sites-available/antojo-web > /dev/null <<'EOF'
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    root /home/antojo/front/dist;
    index index.html;

    # React Router: cualquier ruta que no sea un archivo va al index.
    # Es el equivalente de los rewrites del vercel.json.
    location / {
        try_files $uri /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
```

Activar los dos:

```bash
ln -sf /etc/nginx/sites-available/antojo-api /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/antojo-web /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

En este punto `http://api.tudominio.com` redirige a https y todavía no hay certificado. Es
esperable, lo arregla el paso que sigue. No pierdas tiempo debugueando eso.

---

## 10. Certbot: un cert para los tres nombres (como root)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com
certbot renew --dry-run
```

Certbot reescribe los dos server blocks y deja la renovación automática por timer de
systemd.

Probar:

```bash
curl -sI https://api.tudominio.com/api/
curl -sI https://tudominio.com
```

Después, a mano:
- `https://tudominio.com` → carga el menú con las fotos.
- `https://api.tudominio.com/admin/` → entrás con tu usuario de siempre (vino en el dump) y
  se ven las fotos de los productos. Eso valida el `media/` y el alias de nginx de una.

---

## 11. Cutover

1. Probar el flujo real en `https://tudominio.com`: ver menú → crear un pedido → verlo en el admin.
2. Si el dominio hoy apunta a Vercel, recién ahora cambiás el DNS del apex/www a la VPS.
3. Apagar la web app en PythonAnywhere y el proyecto en Vercel.

Mientras no toques el paso 2, PA y Vercel siguen sirviendo a los clientes reales y la VPS es
solo una prueba. Si algo falla, no perdiste nada salvo los pedidos hechos durante la prueba.

---

## Después del cutover

Backup diario de la base. Como root, `mkdir -p /root/backups` y en `crontab -e`:

```
0 4 * * * sudo -u postgres pg_dump antojo | gzip > /root/backups/antojo-$(date +\%F).sql.gz
```

Los `media/` de producción son 230M y **no** están todos en git. Si te importan, sumalos con
un rsync semanal a otro lado.

## Deploys siguientes

Backend:

```bash
su - antojo -c "cd ~/back && git pull && ./venv/bin/pip install -r requirements.txt && ./venv/bin/python manage.py migrate && ./venv/bin/python manage.py collectstatic --noinput"
systemctl restart antojo
```

Frontend (no necesita reiniciar nada, nginx sirve los archivos nuevos al toque):

```bash
su - antojo -c "cd ~/front && git pull && npm ci && npm run build"
```
