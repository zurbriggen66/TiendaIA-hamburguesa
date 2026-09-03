# Migración ANTOJO: PythonAnywhere → VPS (stack TIENDA-IA-DEPLOY)

ANTOJO entra como **dos servicios más** en el compose que ya corre, copiando el patrón de
`monkeygym`. No se instala nginx, ni Postgres, ni certbot: ya están.

| | Hoy | Después |
|---|---|---|
| Back | PA, `~/TiendaIA-hamburguesa/backend`, SQLite | contenedor `tienda-ia-antojo-api` → `api-antojo.tiendaia.cloud` |
| Front | Vercel | `../ANTOJO-FRONT/dist` servido por el nginx del stack → `antojo.tiendaia.cloud` |
| Base | SQLite | base `antojo` dentro de `tienda-ia-postgres-prod` |

Si querés otros subdominios, cambiá `antojo.tiendaia.cloud` / `api-antojo.tiendaia.cloud`
en todo el archivo antes de empezar.

Todos los comandos son como root en la VPS. `$DEPLOY` = `/opt/tienda-ia/TIENDA-IA-DEPLOY`.

PA y Vercel siguen prendidos hasta el paso 9: hasta ahí esto es una instalación paralela que
no toca a ningún cliente.

---

## 0. Preparativos

**a)** Desde tu máquina, subir los cambios de config del backend. Sin esto la VPS clona la
versión vieja, con SQLite hardcodeado:

```bash
cd ANTOJO-BACK
git add -A && git commit -m "config: base y hosts por variables de entorno"
git push
```

**b)** DNS: dos registros **A** a `2.24.69.234`, igual que los de monkeygym.

| Tipo | Nombre | Valor |
|---|---|---|
| A | `antojo` | 2.24.69.234 |
| A | `api-antojo` | 2.24.69.234 |

Verificá con `dig +short antojo.tiendaia.cloud api-antojo.tiendaia.cloud`. Certbot no puede
emitir hasta que resuelvan, así que hacelo primero.

**c)** En PA, guardar el estado de migraciones para comparar después. Importa porque el
código de PA sale del monorepo `TiendaIA-hamburguesa` y el de la VPS de `ANTOJO-BACK`:

```bash
cd ~/TiendaIA-hamburguesa/backend
python manage.py showmigrations > ~/migraciones_pa.txt
scp ~/migraciones_pa.txt root@2.24.69.234:~/
```

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

Ya están en `/root/`: `datos.json` (656K) y `media.tar.gz` (230M).

---

## 2. Clonar los repos y poner los datos en su lugar

```bash
cd /opt/tienda-ia
sudo -u github-runner git clone https://github.com/TIENDA-IA/ANTOJO-BACK.git
sudo -u github-runner git clone https://github.com/TIENDA-IA/ANTOJO-FRONT.git

# media y dump al checkout del back: queda bind-mounteado en el contenedor
tar xzf /root/media.tar.gz -C /opt/tienda-ia/ANTOJO-BACK/
mv /root/datos.json /root/migraciones_pa.txt /opt/tienda-ia/ANTOJO-BACK/
chown -R github-runner:github-runner /opt/tienda-ia/ANTOJO-BACK /opt/tienda-ia/ANTOJO-FRONT

du -sh /opt/tienda-ia/ANTOJO-BACK/media    # ~230M
```

El `media/` vive en el host por el bind mount, igual que MONKEYGYM-BACK. Sobrevive cualquier
`docker compose up --force-recreate`, no hace falta volumen nombrado.

---

## 3. Crear la base en el Postgres que ya corre

La password del superusuario está en `$DEPLOY/.env.prod`:

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
grep POSTGRES_USER .env.prod
```

Con ese usuario (abajo asumo `postgres`, ajustá si es otro):

```bash
docker exec -i tienda-ia-postgres-prod psql -U postgres <<'SQL'
CREATE DATABASE antojo;
CREATE USER antojo WITH PASSWORD 'PONE_UNA_PASSWORD_LARGA';
ALTER ROLE antojo SET client_encoding TO 'utf8';
ALTER ROLE antojo SET default_transaction_isolation TO 'read committed';
ALTER ROLE antojo SET timezone TO 'America/Argentina/Cordoba';
ALTER DATABASE antojo OWNER TO antojo;
SQL
```

El `OWNER TO` no es opcional en Postgres 15+ (el contenedor es 18): sin eso `migrate` falla
con `permission denied for schema public`.

---

## 4. Traer los cambios del deploy repo

Los archivos ya estan hechos en el checkout local de TIENDA-IA-DEPLOY. Desde tu maquina:

```bash
cd ../DEPLOY/TIENDA-IA-DEPLOY
git add -A && git commit -m "antojo: back y front al stack" && git push
```

En la VPS:

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
sudo -u github-runner git pull
```

Lo que trae el pull:

| Archivo | Que hace |
|---|---|
| `resources/api/antojo-api.yaml` | el contenedor del back: copia de `monkeygym-api` con `core.wsgi` y un `collectstatic` |
| `resources/nginx/antojo.yaml` | mount de `../ANTOJO-FRONT/dist` |
| `resources/nginx/antojo-api.yaml` | mounts de `media/` y `staticfiles/` para que nginx los sirva |
| `nginx/templates/{bootstrap,https}/4*-antojo*.conf.template` | los cuatro server blocks |
| `.env.antojo-api.example` | plantilla del env del back |
| `nginx/run.sh` | `ENV_VARS` con los dominios nuevos: sin esto `envsubst` deja los `server_name` vacios |
| `nginx/templates/https/00-http-redirect.conf.template` | los dominios nuevos en el block del puerto 80, que es por donde valida certbot |
| `certbot/run.sh` + `resources/certbot.yaml` | los dos `-d` nuevos del cert |
| `resources/{api,nginx}/index.yaml`, `.env.example` | enganches |

### Lo que hay que crear a mano en la VPS (no va a git)

Dominios en el `.env` raiz:

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
cat >> .env <<'EOF'

ANTOJO_DOMAIN=antojo.tiendaia.cloud
ANTOJO_API_DOMAIN=api-antojo.tiendaia.cloud
EOF
```

Env del back:

```bash
cp .env.antojo-api.example .env.antojo-api
docker run --rm python:3.13-slim python -c "import secrets; print(secrets.token_urlsafe(64))"
nano .env.antojo-api    # pega la secret key y la password del paso 3
```

Verificar antes de seguir:

```bash
docker compose config > /dev/null && echo "COMPOSE OK"
git check-ignore -q .env.antojo-api && echo "ENV IGNORADO OK"
grep -c ANTOJO .env    # tiene que decir 2
```

---

## 5. Compilar el frontend

```bash
node -v    # necesita v20+; si no está: curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs

cd /opt/tienda-ia/ANTOJO-FRONT
sudo -u github-runner tee .env.production > /dev/null <<'EOF'
VITE_API_URL=https://api-antojo.tiendaia.cloud/api
EOF

sudo -u github-runner npm ci
sudo -u github-runner npm run build
ls dist/index.html    # tiene que existir ANTES del compose up
```

Vite hornea `VITE_API_URL` en el bundle en tiempo de compilación. Sin el `.env.production`
el build apunta a `127.0.0.1:8000` y el sitio no encuentra la API.

El `dist/` tiene que existir antes de levantar el compose: si no, Docker crea el bind mount
como un directorio vacío de root y nginx sirve 404 hasta que lo borres a mano.

---

## 6. Levantar

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
docker compose up -d
docker compose logs -f antojo-api
```

El primer arranque tarda: instala requirements y corre `migrate`. Esperá a ver los workers
de gunicorn.

`up -d` recrea nginx porque le cambiaron los volumes, y eso es justo lo que hace falta:
`nginx/run.sh` solo re-renderiza los templates cuando cambia de modo, así que un `restart`
pelado **no** habría tomado los archivos nuevos.

---

## 7. Cargar los datos

Verificar primero que el esquema de la VPS sea el mismo que el de PA. Si esto imprime
diferencias, el monorepo y `ANTOJO-BACK` divergieron y el `loaddata` va a fallar o, peor,
cargar mal:

```bash
docker compose exec antojo-api sh -c \
  "python manage.py showmigrations > /tmp/vps.txt; diff /tmp/vps.txt migraciones_pa.txt" \
  && echo "ESQUEMA IGUAL, seguí"
```

Con eso confirmado:

```bash
docker compose exec antojo-api python manage.py loaddata datos.json
```

**Resetear las secuencias** — obligatorio. `loaddata` inserta los IDs explícitos y Postgres
no mueve sus contadores solo: si lo saltás, el primer pedido nuevo explota con
`duplicate key value violates unique constraint`. SQLite perdonaba esto, Postgres no.

```bash
docker compose exec antojo-api sh -c \
  "python manage.py sqlsequencereset auth authtoken antojo clientes gastos negocio pedidos productos | python manage.py dbshell"
```

Chequeo de que llegaron los datos:

```bash
docker compose exec antojo-api python manage.py shell -c "
from django.contrib.auth.models import User
from pedidos.models import Pedido
from productos.models import Producto
print('users', User.objects.count(), 'pedidos', Pedido.objects.count(), 'productos', Producto.objects.count())"
```

Corré exactamente lo mismo en la consola de PA y compará los tres números. Si no coinciden,
**no sigas**.

---

## 8. Certificado

Certbot pide el cert una sola vez al arrancar y después duerme 12h, así que hay que
recrearlo para que tome los dominios nuevos. Ya tiene `--expand`, o sea que amplía el cert
existente en vez de emitir uno nuevo:

```bash
docker compose up -d --force-recreate certbot
docker compose logs -f certbot
```

Cuando diga `Certificate is ready`, nginx recarga solo (por el `reload.flag`, hasta 15s).

```bash
curl -sI https://antojo.tiendaia.cloud
curl -sI https://api-antojo.tiendaia.cloud/api/
```

Después, a mano:
- `https://antojo.tiendaia.cloud` → carga el menú **con las fotos**. Si el menú carga pero
  sin imágenes, el problema son los mounts del 4.2.
- `https://api-antojo.tiendaia.cloud/admin/` → entrás con tu usuario de siempre (vino en el
  dump) y el admin se ve con estilos. Si se ve sin CSS, falló el `collectstatic`.

---

## 9. Cutover

1. Probar el flujo real en `https://antojo.tiendaia.cloud`: ver menú → crear un pedido → verlo en el admin.
2. Si el dominio de los clientes hoy apunta a Vercel, recién ahora movés ese DNS.
3. Apagar la web app en PythonAnywhere y el proyecto en Vercel.

Hasta el paso 2, PA y Vercel siguen atendiendo a los clientes reales. Si algo falla no
perdiste nada salvo los pedidos hechos durante la prueba.

---

## 10. Después

```bash
cd /opt/tienda-ia/TIENDA-IA-DEPLOY
git add -A && git commit -m "antojo: back y front al stack" && git push
rm /opt/tienda-ia/ANTOJO-BACK/datos.json /opt/tienda-ia/ANTOJO-BACK/migraciones_pa.txt
```

Backup: la base `antojo` sale con el mismo `pg_dump` que uses para las otras. Los `media/`
son 230M en `/opt/tienda-ia/ANTOJO-BACK/media` y **no** están todos en git — si te importan,
sumalos a lo que ya respaldes.

## Deploys siguientes

```bash
cd /opt/tienda-ia/ANTOJO-BACK && sudo -u github-runner git pull
cd /opt/tienda-ia/TIENDA-IA-DEPLOY && docker compose up -d --force-recreate antojo-api

cd /opt/tienda-ia/ANTOJO-FRONT && sudo -u github-runner sh -c "git pull && npm ci && npm run build"
```

El front no necesita reiniciar nada: nginx sirve el `dist/` nuevo al toque.
