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
docker-compose.yml         → servicios "web" + "api" (el que usa EasyPanel/VPS, sin ports ni container_name)
docker-compose.local.yml   → SOLO para probar en tu Mac: agrega el puerto 8084 y nombres fijos de contenedor
nginx.conf
.env.example               → plantilla del token del panel (copiar a .env, que NO se sube a git)
hombre/ mujer/              → imágenes originales sin procesar (NO se despliegan, quedan como respaldo)
```

## Correr en local

`docker-compose.yml` a secas no publica ningún puerto (así lo requiere EasyPanel, ver abajo), así que en tu máquina hay que sumarle `docker-compose.local.yml`, que le agrega el puerto 8084 y nombres fijos de contenedor solo para pruebas:

```bash
cp .env.example .env   # solo la primera vez — pon tu propio ADMIN_TOKEN
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
# abrir http://localhost:8084
```

Esto levanta dos servicios: `web` (Nginx, sirve el sitio) y `api` (guarda qué perfumes están agotados).

## Desplegar en la VPS (EasyPanel)

Este proyecto corre en EasyPanel, que orquesta sus propios nombres de contenedor y el enrutamiento del dominio hacia el puerto del contenedor. Por eso `docker-compose.yml` **no** trae `container_name` ni `ports` — si los tuviera, EasyPanel avisa que "pueden causar conflictos" (es justo el warning que viste). No agregues esos campos ahí; para pruebas locales usa `docker-compose.local.yml` como se explicó arriba.

1. Sube el repo (git) o copia la carpeta al servidor — EasyPanel normalmente despliega directo desde el repositorio de Git.
2. En EasyPanel, crea la app apuntando a este `docker-compose.yml` y define la variable de entorno **`ADMIN_TOKEN`** en la sección de variables del servicio `api` (un valor propio, largo — `openssl rand -hex 24`). No hace falta archivo `.env` en el servidor si EasyPanel te deja poner variables de entorno desde su UI; si prefieres usar `.env`, créalo igual que en local (`cp .env.example .env` y edítalo) en la carpeta del proyecto en la VPS.
3. En la configuración de dominio de EasyPanel, apunta el dominio al servicio **`web`**, puerto **80** (ese es el que expone su Dockerfile). EasyPanel se encarga del certificado SSL.
4. El estado de "agotado" se guarda en el volumen Docker `stock-data`, así que sobrevive a los redeploys.

Actualizar el sitio después de un cambio: vuelve a desplegar desde EasyPanel (o `docker compose up -d --build` si entras por SSH directamente).

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
