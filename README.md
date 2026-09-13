# Variedades Adrian — Catálogo de Perfumes

Sitio (HTML/CSS/JS, sin frameworks) mobile-first, dockerizado con Nginx, más una API (Node) que lleva el catálogo, el inventario, las ventas (de contado y a crédito, con abonos) y los cierres de caja — todo administrado desde un panel oculto.

## Estructura

```
public/                    → todo lo que sirve Nginx
  index.html
  css/styles.css
  js/app.js                → lógica del catálogo público (filtros, buscador, WhatsApp, lightbox)
  img/hombre/...    img/mujer/...   img/brand/logo.png   → fotos de los 42 perfumes originales
  panel-27d9e5e73b/        → panel de administración (URL "secreta", sin enlaces hacia ella)
api/
  server.js                → API (Node + busboy) — catálogo, inventario, ventas, abonos, cierres
  package.json
  Dockerfile
Dockerfile                 → imagen del sitio (Nginx)
docker-compose.yml         → servicios "web" + "api" (el que usa EasyPanel/VPS, sin ports ni container_name)
docker-compose.local.yml   → SOLO para probar en tu Mac: agrega el puerto 8084 y nombres fijos de contenedor
nginx.conf
.env.example               → plantilla del token del panel (copiar a .env, que NO se sube a git)
hombre/ mujer/              → imágenes originales sin procesar (NO se despliegan, quedan como respaldo)
```

El catálogo, el inventario y todo lo demás **ya no vive en un archivo estático** — la API lo guarda en `/data` (volumen Docker `stock-data`), así que se administra en caliente desde el panel, sin editar código ni redesplegar. La primera vez que arranca la API siembra automáticamente los 42 perfumes que tenía el catálogo original.

## Correr en local

`docker-compose.yml` a secas no publica ningún puerto (así lo requiere EasyPanel, ver abajo), así que en tu máquina hay que sumarle `docker-compose.local.yml`, que le agrega el puerto 8084 y nombres fijos de contenedor solo para pruebas:

```bash
cp .env.example .env   # solo la primera vez — pon tu propio ADMIN_TOKEN
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
# abrir http://localhost:8084
```

Esto levanta dos servicios: `web` (Nginx, sirve el sitio) y `api` (catálogo, inventario, ventas y cierres).

## Desplegar en la VPS (EasyPanel)

Este proyecto corre en EasyPanel, que orquesta sus propios nombres de contenedor y el enrutamiento del dominio hacia el puerto del contenedor. Por eso `docker-compose.yml` **no** trae `container_name` ni `ports` — si los tuviera, EasyPanel avisa que "pueden causar conflictos" (es justo el warning que viste). No agregues esos campos ahí; para pruebas locales usa `docker-compose.local.yml` como se explicó arriba.

1. Sube el repo (git) o copia la carpeta al servidor — EasyPanel normalmente despliega directo desde el repositorio de Git.
2. En EasyPanel, crea la app apuntando a este `docker-compose.yml` y define la variable de entorno **`ADMIN_TOKEN`** en la sección de variables del servicio `api` (un valor propio, largo — `openssl rand -hex 24`). No hace falta archivo `.env` en el servidor si EasyPanel te deja poner variables de entorno desde su UI; si prefieres usar `.env`, créalo igual que en local (`cp .env.example .env` y edítalo) en la carpeta del proyecto en la VPS.
3. En la configuración de dominio de EasyPanel, apunta el dominio al servicio **`web`**, puerto **80** (ese es el que expone su Dockerfile). EasyPanel se encarga del certificado SSL.
4. El catálogo, inventario, ventas y cierres se guardan en el volumen Docker `stock-data`, así que sobreviven a los redeploys.

Actualizar el sitio después de un cambio: vuelve a desplegar desde EasyPanel (o `docker compose up -d --build` si entras por SSH directamente).

## Panel de administración

Hay una URL oculta — no aparece en ningún menú ni enlace del sitio — con 4 pestañas:

- **URL**: `https://tu-dominio.com/panel-27d9e5e73b/` (guárdala en tus marcadores; no la compartas).
- **Acceso**: la primera vez pide un token — es el valor de `ADMIN_TOKEN` en tu `.env`/variables de entorno. El navegador lo recuerda después (salvo que uses "Salir" o cambies de dispositivo).

### Inventario

Lista los perfumes agrupados por Hombre/Mujer. Por cada uno puedes editar en línea (se guarda solo al salir del campo):
- **Stock** — cantidad disponible. En 0, el catálogo público muestra la cinta "Agotado" automáticamente.
- **Precio de compra, de contado y a crédito** — solo se ven aquí, nunca en la web pública.
- Botón **Vender** (abre el formulario de venta) y **Archivar** (lo quita del catálogo y de la lista de venta, pero conserva su historial de ventas pasadas).

**Agregar un perfume nuevo** es la pestaña "Agregar": nombre, marca, categoría, familia olfativa, precios, stock inicial y la foto (se sube directo desde ahí, sin necesidad de tocar código ni redesplegar).

Los 42 perfumes originales arrancan (solo la primera vez que la API siembra `products.json`, ver "Notas técnicas") con su precio de compra real ya cargado, `stock: 1` y precios de venta uniformes de $100.000 contado / $130.000 crédito — ajustables después desde esta misma pestaña. Si algún día hace falta cambiar esos valores de arranque, están en el arreglo `SEED_PRODUCTS` de `api/server.js` (solo tiene efecto en un `products.json` nuevo, no sobre datos ya sembrados).

### Vender

Al hacer clic en "Vender" sobre un producto: cantidad, tipo de pago (Contado/Crédito — autocompleta el precio sugerido según cuál elijas), precio de venta real (editable, por si cobraste distinto al sugerido) y el nombre del comprador (es solo una referencia libre, no hay una lista de clientes). Si es a crédito, puedes indicar un abono inicial si ya te dieron algo.

### Créditos pendientes

Lista las ventas a crédito con saldo pendiente. Cada abono que te paguen (parcial o hasta completar) se registra ahí mismo.

### Cierre

Un cierre reparte la plata entre vendedor e inversionista (nombres editables en esta misma pestaña):
- Se lleva **todo el efectivo cobrado** desde el cierre anterior (abonos parciales incluidos).
- La **ganancia** (50% para cada uno) solo se calcula sobre las ventas que ya quedaron 100% pagadas — un abono parcial de una venta aún no terminada se entrega íntegro al inversionista como capital, sin repartir ganancia todavía; esa ganancia se calcula en un cierre futuro, cuando esa venta se termine de pagar.
- Queda un historial con fecha de cada cierre, para referencia futura.

### Notas técnicas

- Todo esto vive en `api/server.js`, guardado como JSON en el volumen `stock-data` (`products.json`, `sales.json`, `payments.json`, `closings.json`, `config.json` — mismo patrón simple que usaba el `stock.json` original, sin base de datos).
- Las fotos subidas desde el panel se guardan en ese mismo volumen y se sirven vía `/api/uploads/...`.
- **Cambiar el token**: edita `ADMIN_TOKEN` en `.env`/variables de entorno y corre `docker compose up -d` (no hace falta `--build`). Los navegadores con el token viejo guardado dejarán de poder escribir hasta que ingreses el nuevo.
- Cambiar la URL del panel: renombra la carpeta `public/panel-27d9e5e73b/` y actualiza esa ruta en el bloque `location ^~ /panel-.../` de `nginx.conf`.

## Contacto / WhatsApp

El número de WhatsApp está centralizado en dos lugares (mantenerlos iguales si cambia):
- `public/js/app.js` → `CONFIG.whatsapp`
- `public/index.html` → script inline al final del `<body>`

## Notas de diseño

- Paleta: negro/carbón + hueso + dorado, tipografía serif (Cormorant Garamond) para títulos y Jost para el resto — estética de perfumería de lujo.
- Mobile-first: grid de 2 columnas en móvil, hasta 5 en escritorio.
- Sin precios en la web pública (por decisión del negocio): cada tarjeta tiene un botón "Consultar" que abre WhatsApp con un mensaje prellenado con el nombre del perfume. Los precios sí existen internamente (compra/contado/crédito) para llevar el inventario y las ventas desde el panel.
- El logo actual es el de "Surti Muebles S.M." — si más adelante tienes el logo correcto de Variedades Adrian, reemplaza `public/img/brand/logo.png` (mismo nombre de archivo) y vuelve a desplegar.
