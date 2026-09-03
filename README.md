# Créditos S.A. — Catálogo de Perfumes

Sitio estático (HTML/CSS/JS, sin frameworks) mobile-first, dockerizado con Nginx.

## Estructura

```
public/            → todo lo que se sirve en la web
  index.html
  css/styles.css
  js/catalog.js    → lista de perfumes (datos)
  js/app.js        → lógica (filtros, buscador, WhatsApp, lightbox)
  img/hombre/...    img/mujer/...   img/brand/logo.png
Dockerfile
docker-compose.yml
nginx.conf
hombre/ mujer/     → imágenes originales sin procesar (NO se despliegan, quedan como respaldo)
```

## Correr en local

```bash
docker compose up -d --build
# abrir http://localhost:8080
```

## Desplegar en la VPS

1. Copiar esta carpeta al servidor (rsync/scp/git):
   ```bash
   rsync -avz --exclude 'hombre' --exclude 'mujer' ./ usuario@tu-vps:/opt/perfumes/
   ```
2. En la VPS, con Docker y Docker Compose instalados:
   ```bash
   cd /opt/perfumes
   docker compose up -d --build
   ```
   El sitio queda escuchando en el puerto **8080** del host (ver `docker-compose.yml`).

3. **Exponerlo al público**, dos opciones:
   - **Directo en el puerto 80/443**: cambia en `docker-compose.yml` el mapeo a `"80:80"` (y agrega un contenedor de Certbot/Nginx si quieres HTTPS propio).
   - **Detrás de un reverse proxy** (recomendado si ya usas Nginx/Traefik/Caddy en la VPS para varios sitios): apunta tu proxy al `http://127.0.0.1:8080` y configura el certificado SSL ahí (por ejemplo con Certbot para tu dominio).

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

No hay base de datos ni backend: todo el catálogo vive en ese archivo, así que los cambios son inmediatos con solo editar y volver a desplegar.

## Contacto / WhatsApp

El número de WhatsApp está centralizado en dos lugares (mantenerlos iguales si cambia):
- `public/js/app.js` → `CONFIG.whatsapp`
- `public/index.html` → script inline al final del `<body>`

## Notas de diseño

- Paleta: negro/carbón + hueso + dorado, tipografía serif (Cormorant Garamond) para títulos y Jost para el resto — estética de perfumería de lujo.
- Mobile-first: grid de 2 columnas en móvil, hasta 5 en escritorio.
- Sin precios (por decisión del negocio): cada tarjeta tiene un botón "Consultar" que abre WhatsApp con un mensaje prellenado con el nombre del perfume.
- El logo actual es el de "Surti Muebles S.M." — si más adelante tienes el logo correcto de Créditos S.A., reemplaza `public/img/brand/logo.png` (mismo nombre de archivo) y vuelve a desplegar.
