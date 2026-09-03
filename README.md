# Créditos S.A. — Catálogo de Perfumes

Sitio (HTML/CSS/JS, sin frameworks) mobile-first, dockerizado con Nginx, más una pequeña API para marcar perfumes como agotados desde un panel de administración oculto.

## Estructura

```
public/                    → todo lo que sirve Nginx
  index.html
  css/styles.css
  js/catalog.js            → lista de perfumes (datos)
  js/app.js                → lógica (filtros, buscador, WhatsApp, lightbox, stock)
  img/hombre/...    img/mujer/...   img/brand/logo.png
  panel-27d9e5e73b/        → panel de administración (URL "secreta", sin enlaces hacia ella)
api/
  server.js                → API mínima (Node, sin dependencias) que guarda qué perfumes están agotados
  Dockerfile
Dockerfile                 → imagen del sitio (Nginx)
docker-compose.yml         → servicios "web" + "api"
nginx.conf
.env.example               → plantilla del token del panel (copiar a .env, que NO se sube a git)
hombre/ mujer/              → imágenes originales sin procesar (NO se despliegan, quedan como respaldo)
```

## Correr en local

```bash
cp .env.example .env   # solo la primera vez — pon tu propio ADMIN_TOKEN
docker compose up -d --build
# abrir http://localhost:8084
```

Esto levanta dos servicios: `web` (Nginx, sirve el sitio) y `api` (guarda qué perfumes están agotados).

## Desplegar en la VPS

1. Copiar esta carpeta al servidor (rsync/scp/git):
   ```bash
   rsync -avz --exclude 'hombre' --exclude 'mujer' ./ usuario@tu-vps:/opt/perfumes/
   ```
2. En la VPS, con Docker y Docker Compose instalados, crea el `.env` (no viaja por git) con tu propio token:
   ```bash
   cd /opt/perfumes
   cp .env.example .env
   nano .env               # pon un ADMIN_TOKEN largo y propio (openssl rand -hex 24)
   docker compose up -d --build
   ```
   El sitio queda escuchando en el puerto **8084** del host (ver `docker-compose.yml`). El estado de "agotado" se guarda en el volumen Docker `stock-data`, así que sobrevive a los redeploys (`docker compose up -d --build` no lo borra).

3. **Exponerlo al público**, dos opciones:
   - **Directo en el puerto 80/443**: cambia en `docker-compose.yml` el mapeo a `"80:80"` (y agrega un contenedor de Certbot/Nginx si quieres HTTPS propio).
   - **Detrás de un reverse proxy** (recomendado si ya usas Nginx/Traefik/Caddy en la VPS para varios sitios): apunta tu proxy al `http://127.0.0.1:8084` y configura el certificado SSL ahí (por ejemplo con Certbot para tu dominio).

4. Actualizar el sitio después de un cambio:
   ```bash
   git pull   # o vuelve a copiar los archivos
   docker compose up -d --build
   ```

## Cómo agregar o quitar un perfume

1. Coloca la foto en `hombre/` o `mujer/` (la carpeta original) y procésala al tamaño uniforme:
   - Todas las fotos del catálogo están normalizadas a **900×1125px, fondo blanco**, para que todas las tarjetas se vean del mismo tamaño. Si agregas una foto nueva, recórtala/ajústala a esa misma proporción (4:5) antes de ponerla en `public/img/<categoria>/`, o pide que se reprocese con el mismo script usado para las 23 fotos actuales.
2. Abre `public/js/catalog.js` y agrega (o borra) un objeto en el arreglo `PRODUCTS`:
   ```js
   { slug: "nombre-unico", category: "hombre", brand: "Marca", name: "Nombre del perfume", note: "Familia olfativa", img: "img/hombre/archivo.jpg" },
   ```
3. Reconstruye y despliega: `docker compose up -d --build`.

El catálogo (nombres, marcas, fotos) vive en ese archivo estático — para cambiarlo hay que editar y redesplegar. El estado de **agotado/disponible** es distinto: eso se administra en caliente desde el panel (ver abajo), sin tocar código ni redesplegar.

## Panel de administración (marcar perfumes como agotados)

Hay una URL oculta — no aparece en ningún menú ni enlace del sitio — donde puedes marcar cualquier perfume como agotado. Al hacerlo, en el catálogo público esa tarjeta se ve atenuada con una cinta diagonal "Agotado" y el botón cambia a "Agotado · Preguntar".

- **URL**: `https://tu-dominio.com/panel-27d9e5e73b/` (guárdala en tus marcadores; no la compartas).
- **Acceso**: la primera vez pide un token — es el valor de `ADMIN_TOKEN` en tu `.env`. Una vez lo ingresas, el navegador lo recuerda (no hay que volver a escribirlo cada vez, salvo que uses "Salir" o cambies de navegador/dispositivo).
- **Uso**: lista los 23 perfumes agrupados por Hombre/Mujer con un interruptor cada uno. Al activarlo se guarda al instante — no hace falta guardar ni redesplegar nada.
- **Cómo funciona por dentro**: el toggle llama a una API mínima (`api/server.js`, sin dependencias) que guarda el estado en un archivo JSON dentro del volumen Docker `stock-data`. El catálogo público (`public/js/app.js`) consulta esa misma API al cargar para saber qué mostrar como agotado.
- **Cambiar el token** más adelante: edita `ADMIN_TOKEN` en `.env` en la VPS y corre `docker compose up -d` (no hace falta `--build`) para que la API tome el nuevo valor. Los navegadores que ya tenían el token viejo guardado dejarán de poder escribir (verán "token inválido") hasta que ingreses el nuevo.
- Si algún día quieres cambiar la URL del panel por otra: renombra la carpeta `public/panel-27d9e5e73b/` y actualiza esa misma ruta en el bloque `location ^~ /panel-.../ ` de `nginx.conf`.

## Contacto / WhatsApp

El número de WhatsApp está centralizado en dos lugares (mantenerlos iguales si cambia):
- `public/js/app.js` → `CONFIG.whatsapp`
- `public/index.html` → script inline al final del `<body>`

## Notas de diseño

- Paleta: negro/carbón + hueso + dorado, tipografía serif (Cormorant Garamond) para títulos y Jost para el resto — estética de perfumería de lujo.
- Mobile-first: grid de 2 columnas en móvil, hasta 5 en escritorio.
- Sin precios (por decisión del negocio): cada tarjeta tiene un botón "Consultar" que abre WhatsApp con un mensaje prellenado con el nombre del perfume.
- El logo actual es el de "Surti Muebles S.M." — si más adelante tienes el logo correcto de Créditos S.A., reemplaza `public/img/brand/logo.png` (mismo nombre de archivo) y vuelve a desplegar.
