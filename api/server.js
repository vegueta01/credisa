const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Busboy = require("busboy");

const DATA_DIR = process.env.DATA_DIR || "/data";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PORT = process.env.PORT || 3001;
const MAX_JSON_BODY_BYTES = 2e5;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB
const COMMISSION_RATE = 0.5; // 50% de la ganancia para el vendedor

if (!ADMIN_TOKEN) {
  console.error("ADMIN_TOKEN env var is required");
  process.exit(1);
}

const FILES = {
  products: path.join(DATA_DIR, "products.json"),
  sales: path.join(DATA_DIR, "sales.json"),
  payments: path.join(DATA_DIR, "payments.json"),
  closings: path.join(DATA_DIR, "closings.json"),
  config: path.join(DATA_DIR, "config.json"),
};
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const ALLOWED_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

// ---------------------------------------------------------------------------
// Almacenamiento: un archivo JSON por "tabla", lectura completa + escritura
// atómica (mismo patrón que el stock.json original). Suficiente para el
// volumen de escritura de un solo administrador.
// ---------------------------------------------------------------------------

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function newId() {
  return Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex");
}

function slugify(str) {
  const base = String(str || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "producto";
}

function uniqueSlug(base, taken) {
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;
  return slug;
}

function toMoney(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

// ---------------------------------------------------------------------------
// Semilla: los 42 perfumes que antes vivían en public/js/catalog.js.
// Solo se usa la primera vez que arranca la API (si products.json no existe).
// ---------------------------------------------------------------------------

const SEED_PRODUCTS = [
  { slug: "leau-issey-pour-homme", category: "hombre", brand: "Issey Miyake", name: "L'Eau d'Issey Pour Homme", note: "Acuático · Amaderado", img: "img/hombre/leau-issey-pour-homme.jpg" , costPrice: 50000 },
  { slug: "allure-homme-sport", category: "hombre", brand: "Chanel", name: "Allure Homme Sport", note: "Cítrico · Fresco", img: "img/hombre/allure-homme-sport.jpg" , costPrice: 52000 },
  { slug: "arsenal", category: "hombre", brand: "Gilles Cantuel", name: "Arsenal", note: "Amaderado · Especiado", img: "img/hombre/arsenal.jpg" , costPrice: 52000 },
  { slug: "acqua-di-gio", category: "hombre", brand: "Giorgio Armani", name: "Acqua Di Giò", note: "Acuático · Marino", img: "img/hombre/acqua-di-gio.jpg" , costPrice: 52000 },
  { slug: "k-by-dolce-gabbana", category: "hombre", brand: "Dolce & Gabbana", name: "K by Dolce&Gabbana", note: "Amaderado · Aromático", img: "img/hombre/k-by-dolce-gabbana.jpg" , costPrice: 52000 },
  { slug: "hugo-red", category: "hombre", brand: "Hugo Boss", name: "Hugo Red", note: "Especiado · Frutal", img: "img/hombre/hugo-red.jpg" , costPrice: 52000 },
  { slug: "invictus", category: "hombre", brand: "Paco Rabanne", name: "Invictus", note: "Marino · Amaderado", img: "img/hombre/invictus.jpg" , costPrice: 98000 },
  { slug: "lacoste-l1212-blanc", category: "hombre", brand: "Lacoste", name: "L.12.12 Blanc", note: "Fresco · Cítrico", img: "img/hombre/lacoste-l1212-blanc.jpg" , costPrice: 52000 },
  { slug: "lacoste-l1212-rouge", category: "hombre", brand: "Lacoste", name: "L.12.12 Rouge Energetic", note: "Especiado · Amaderado", img: "img/hombre/lacoste-l1212-rouge.jpg" , costPrice: 50000 },
  { slug: "nautica-voyage", category: "hombre", brand: "Nautica", name: "Voyage", note: "Acuático · Ozónico", img: "img/hombre/nautica-voyage.jpg" , costPrice: 50000 },
  { slug: "polo-blue", category: "hombre", brand: "Ralph Lauren", name: "Polo Blue", note: "Fresco · Amaderado", img: "img/hombre/polo-blue.jpg" , costPrice: 50000 },
  { slug: "versace-eros", category: "hombre", brand: "Versace", name: "Eros", note: "Oriental · Fougère", img: "img/hombre/versace-eros.jpg" , costPrice: 52000 },
  { slug: "blue-seduction", category: "hombre", brand: "Antonio Banderas", name: "Blue Seduction", note: "Aromático · Fresco", img: "img/hombre/blue-seduction.jpg" , costPrice: 50000 },
  { slug: "aqva-pour-homme", category: "hombre", brand: "Bvlgari", name: "Aqva Pour Homme", note: "Acuático · Aromático", img: "img/hombre/aqva-pour-homme.jpg" , costPrice: 50000 },
  { slug: "ck-one", category: "hombre", brand: "Calvin Klein", name: "CK One", note: "Cítrico · Fresco", img: "img/hombre/ck-one.jpg" , costPrice: 50000 },
  { slug: "scuderia-ferrari-black", category: "hombre", brand: "Ferrari", name: "Scuderia Ferrari Black", note: "Amaderado · Aromático", img: "img/hombre/scuderia-ferrari-black.jpg" , costPrice: 50000 },
  { slug: "boss-bottled", category: "hombre", brand: "Hugo Boss", name: "Boss Bottled", note: "Amaderado · Especiado", img: "img/hombre/boss-bottled.jpg" , costPrice: 50000 },
  { slug: "boss-bottled-tonic", category: "hombre", brand: "Hugo Boss", name: "Boss Bottled Tonic", note: "Cítrico · Fresco", img: "img/hombre/boss-bottled-tonic.jpg" , costPrice: 50000 },
  { slug: "le-male", category: "hombre", brand: "Jean Paul Gaultier", name: "Le Male", note: "Aromático · Oriental", img: "img/hombre/le-male.jpg" , costPrice: 57000 },
  { slug: "lacoste-l1212-energized", category: "hombre", brand: "Lacoste", name: "L.12.12 Energized", note: "Fresco · Acuático", img: "img/hombre/lacoste-l1212-energized.jpg" , costPrice: 50000 },
  { slug: "happy-for-men", category: "hombre", brand: "Clinique", name: "Happy for Men", note: "Cítrico · Verde", img: "img/hombre/happy-for-men.jpg" , costPrice: 50000 },
  { slug: "le-male-elixir", category: "hombre", brand: "Jean Paul Gaultier", name: "Le Male Elixir", note: "Oriental · Amaderado", img: "img/hombre/le-male-elixir.jpg" , costPrice: 57000 },
  { slug: "man-in-black", category: "hombre", brand: "Bvlgari", name: "Man in Black", note: "Oriental · Especiado", img: "img/hombre/man-in-black.jpg" , costPrice: 50000 },
  { slug: "only-the-brave", category: "hombre", brand: "Diesel", name: "Only The Brave", note: "Amaderado · Aromático", img: "img/hombre/only-the-brave.jpg" , costPrice: 50000 },
  { slug: "polo-red", category: "hombre", brand: "Ralph Lauren", name: "Polo Red", note: "Frutal · Especiado", img: "img/hombre/polo-red.jpg" , costPrice: 50000 },
  { slug: "born-in-roma", category: "hombre", brand: "Valentino", name: "Born In Roma", note: "Amaderado · Especiado", img: "img/hombre/born-in-roma.jpg" , costPrice: 62000 },
  { slug: "silver-mountain-water", category: "hombre", brand: "Creed", name: "Silver Mountain Water", note: "Cítrico · Fresco", img: "img/hombre/silver-mountain-water.jpg" , costPrice: 50000 },
  { slug: "212-nyc", category: "mujer", brand: "Carolina Herrera", name: "212 NYC", note: "Floral · Frutal", img: "img/mujer/212-nyc.jpg" , costPrice: 52000 },
  { slug: "3-limperatrice", category: "mujer", brand: "Dolce & Gabbana", name: "3 L'Impératrice", note: "Floral · Frutal", img: "img/mujer/3-limperatrice.jpg" , costPrice: 52000 },
  { slug: "sweet-like-candy", category: "mujer", brand: "Ariana Grande", name: "Sweet Like Candy", note: "Gourmand · Floral", img: "img/mujer/sweet-like-candy.jpg" , costPrice: 52000 },
  { slug: "omnia-amethyste", category: "mujer", brand: "Bvlgari", name: "Omnia Améthyste", note: "Floral · Afrutado", img: "img/mujer/omnia-amethyste.jpg" , costPrice: 52000 },
  { slug: "jadore", category: "mujer", brand: "Dior", name: "J'adore", note: "Floral · Elegante", img: "img/mujer/jadore.jpg" , costPrice: 50000 },
  { slug: "joy", category: "mujer", brand: "Dior", name: "Joy", note: "Floral · Almizclado", img: "img/mujer/joy.jpg" , costPrice: 52000 },
  { slug: "miss-dior", category: "mujer", brand: "Dior", name: "Miss Dior", note: "Floral · Chipre", img: "img/mujer/miss-dior.jpg" , costPrice: 52000 },
  { slug: "toy2-bubblegum", category: "mujer", brand: "Moschino", name: "Toy 2 Bubble Gum", note: "Gourmand · Dulce", img: "img/mujer/toy2-bubblegum.jpg" , costPrice: 52000 },
  { slug: "paris-hilton", category: "mujer", brand: "Paris Hilton", name: "Paris Hilton", note: "Floral · Afrutado", img: "img/mujer/paris-hilton.jpg" , costPrice: 52000 },
  { slug: "bright-crystal", category: "mujer", brand: "Versace", name: "Bright Crystal", note: "Floral · Afrutado", img: "img/mujer/bright-crystal.jpg" , costPrice: 52000 },
  { slug: "bombshell", category: "mujer", brand: "Victoria's Secret", name: "Bombshell", note: "Floral · Frutal", img: "img/mujer/bombshell.jpg" , costPrice: 52000 },
  { slug: "asad-bourbon", category: "mujer", brand: "Lattafa", name: "Asad Bourbon", note: "Amaderado · Especiado", img: "img/mujer/asad-bourbon.jpg" , costPrice: 57000 },
  { slug: "yara", category: "mujer", brand: "Lattafa", name: "Yara", note: "Floral · Afrutado", img: "img/mujer/yara.jpg" , costPrice: 52000 },
  { slug: "santal-33", category: "mujer", brand: "Le Labo", name: "Santal 33", note: "Amaderado · Cuero", img: "img/mujer/santal-33.jpg" , costPrice: 50000 },
  { slug: "yara-candy", category: "mujer", brand: "Lattafa", name: "Yara Candy", note: "Gourmand · Dulce", img: "img/mujer/yara-candy.jpg" , costPrice: 57000 },
];

function ensureSeeded() {
  if (fs.existsSync(FILES.products)) return;
  const now = new Date().toISOString();
  const products = SEED_PRODUCTS.map((p) => ({
    ...p,
    img: `/${p.img}`,
    stock: 1,
    cashPrice: 100000,
    creditPrice: 130000,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }));
  writeJSON(FILES.products, products);
  console.log(`Sembrados ${products.length} productos en ${FILES.products}`);
}

function ensureConfig() {
  if (fs.existsSync(FILES.config)) return;
  writeJSON(FILES.config, { sellerName: "Vendedor", investorName: "Inversionista" });
}

// ---------------------------------------------------------------------------
// Helpers HTTP
// ---------------------------------------------------------------------------

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function isAuthorized(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === ADMIN_TOKEN;
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_JSON_BODY_BYTES) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on("end", () => {
      if (tooLarge) return reject(new Error("payload too large"));
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } });
    } catch (err) {
      return reject(err);
    }
    const fields = {};
    let file = null;
    let fileTooLarge = false;

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });
    busboy.on("file", (name, stream, info) => {
      const chunks = [];
      stream.on("data", (d) => chunks.push(d));
      stream.on("limit", () => {
        fileTooLarge = true;
      });
      stream.on("close", () => {
        if (!fileTooLarge && chunks.length) {
          file = { buffer: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType };
        }
      });
    });
    busboy.on("error", reject);
    busboy.on("close", () => {
      if (fileTooLarge) return reject(new Error("file too large"));
      resolve({ fields, file });
    });
    req.pipe(busboy);
  });
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

function publicProduct(p) {
  return { slug: p.slug, category: p.category, brand: p.brand, name: p.name, note: p.note, img: p.img, agotado: p.stock <= 0 };
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------

ensureSeeded();
ensureConfig();

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host}`);
  } catch {
    return sendJSON(res, 400, { error: "bad request" });
  }
  const { pathname } = url;
  const method = req.method;

  try {
    // -------------------- salud --------------------
    if (pathname === "/api/health") {
      return sendJSON(res, 200, { ok: true });
    }

    // -------------------- imágenes subidas --------------------
    const uploadMatch = pathname.match(/^\/api\/uploads\/(hombre|mujer)\/([a-z0-9-]+\.(jpg|jpeg|png|webp|avif))$/);
    if (uploadMatch && method === "GET") {
      const [, category, filename] = uploadMatch;
      const filePath = path.join(UPLOADS_DIR, category, filename);
      if (!fs.existsSync(filePath)) return sendJSON(res, 404, { error: "not found" });
      const ext = filename.split(".").pop();
      const data = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": ALLOWED_EXT[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=2592000, immutable",
        "Content-Length": data.length,
      });
      return res.end(data);
    }

    // -------------------- catálogo público --------------------
    if (pathname === "/api/products" && method === "GET") {
      const products = readJSON(FILES.products, []);
      return sendJSON(res, 200, products.filter((p) => !p.archived).map(publicProduct));
    }

    // A partir de aquí, todo requiere token de administrador.
    if (pathname.startsWith("/api/admin/")) {
      if (!isAuthorized(req)) return sendJSON(res, 401, { error: "unauthorized" });
    } else if (pathname.startsWith("/api/")) {
      return sendJSON(res, 404, { error: "not found" });
    } else {
      return sendJSON(res, 404, { error: "not found" });
    }

    // -------------------- GET /api/admin/products --------------------
    if (pathname === "/api/admin/products" && method === "GET") {
      return sendJSON(res, 200, readJSON(FILES.products, []));
    }

    // -------------------- POST /api/admin/products (multipart) --------------------
    if (pathname === "/api/admin/products" && method === "POST") {
      const { fields, file } = await parseMultipart(req);
      const name = (fields.name || "").trim();
      const brand = (fields.brand || "").trim();
      const category = fields.category === "mujer" ? "mujer" : fields.category === "hombre" ? "hombre" : null;
      if (!name || !brand || !category) {
        return sendJSON(res, 400, { error: "name, brand y category (hombre|mujer) son requeridos" });
      }
      if (!file) {
        return sendJSON(res, 400, { error: "se requiere una imagen" });
      }
      const ext = (file.filename || "").split(".").pop().toLowerCase();
      const safeExt = ALLOWED_EXT[ext] ? ext : (file.mimeType === "image/webp" ? "webp" : file.mimeType === "image/png" ? "png" : "jpg");

      const products = readJSON(FILES.products, []);
      const taken = new Set(products.map((p) => p.slug));
      const slug = uniqueSlug(slugify(`${brand}-${name}`), taken);

      const dir = path.join(UPLOADS_DIR, category);
      fs.mkdirSync(dir, { recursive: true });
      const filename = `${slug}.${safeExt}`;
      fs.writeFileSync(path.join(dir, filename), file.buffer);

      const now = new Date().toISOString();
      const product = {
        slug,
        category,
        brand,
        name,
        note: (fields.note || "").trim(),
        img: `/api/uploads/${category}/${filename}`,
        stock: toMoney(fields.stock, 0),
        costPrice: toMoney(fields.costPrice, 0),
        cashPrice: toMoney(fields.cashPrice, 0),
        creditPrice: toMoney(fields.creditPrice, 0),
        archived: false,
        createdAt: now,
        updatedAt: now,
      };
      products.push(product);
      writeJSON(FILES.products, products);
      return sendJSON(res, 201, product);
    }

    // -------------------- PATCH /api/admin/products/:slug --------------------
    const productMatch = pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
    if (productMatch && method === "PATCH") {
      const slug = decodeURIComponent(productMatch[1]);
      const body = await readJSONBody(req);
      const products = readJSON(FILES.products, []);
      const idx = products.findIndex((p) => p.slug === slug);
      if (idx === -1) return sendJSON(res, 404, { error: "producto no encontrado" });

      const p = products[idx];
      const patch = {};
      if (body.name !== undefined) patch.name = String(body.name).trim();
      if (body.brand !== undefined) patch.brand = String(body.brand).trim();
      if (body.note !== undefined) patch.note = String(body.note).trim();
      if (body.category === "hombre" || body.category === "mujer") patch.category = body.category;
      if (body.stock !== undefined) patch.stock = toMoney(body.stock, p.stock);
      if (body.costPrice !== undefined) patch.costPrice = toMoney(body.costPrice, p.costPrice);
      if (body.cashPrice !== undefined) patch.cashPrice = toMoney(body.cashPrice, p.cashPrice);
      if (body.creditPrice !== undefined) patch.creditPrice = toMoney(body.creditPrice, p.creditPrice);
      if (typeof body.archived === "boolean") patch.archived = body.archived;

      products[idx] = { ...p, ...patch, updatedAt: new Date().toISOString() };
      writeJSON(FILES.products, products);
      return sendJSON(res, 200, products[idx]);
    }

    // -------------------- DELETE /api/admin/products/:slug (archivar) --------------------
    if (productMatch && method === "DELETE") {
      const slug = decodeURIComponent(productMatch[1]);
      const products = readJSON(FILES.products, []);
      const idx = products.findIndex((p) => p.slug === slug);
      if (idx === -1) return sendJSON(res, 404, { error: "producto no encontrado" });
      products[idx] = { ...products[idx], archived: true, updatedAt: new Date().toISOString() };
      writeJSON(FILES.products, products);
      return sendJSON(res, 200, products[idx]);
    }

    // -------------------- POST /api/admin/sales --------------------
    if (pathname === "/api/admin/sales" && method === "POST") {
      const body = await readJSONBody(req);
      const slug = String(body.slug || "");
      const quantity = Math.floor(Number(body.quantity));
      const paymentType = body.paymentType === "credito" ? "credito" : body.paymentType === "contado" ? "contado" : null;
      const unitSoldPrice = toMoney(body.unitSoldPrice, NaN);
      const buyerName = String(body.buyerName || "").trim();

      if (!Number.isInteger(quantity) || quantity < 1) return sendJSON(res, 400, { error: "cantidad inválida" });
      if (!paymentType) return sendJSON(res, 400, { error: "tipo de pago inválido (contado|credito)" });
      if (!Number.isFinite(unitSoldPrice) || unitSoldPrice < 0) return sendJSON(res, 400, { error: "precio de venta inválido" });
      if (!buyerName) return sendJSON(res, 400, { error: "nombre del comprador requerido" });

      const products = readJSON(FILES.products, []);
      const pIdx = products.findIndex((p) => p.slug === slug && !p.archived);
      if (pIdx === -1) return sendJSON(res, 404, { error: "producto no encontrado" });
      const product = products[pIdx];
      if (product.stock < quantity) {
        return sendJSON(res, 400, { error: `no hay suficiente inventario (disponible: ${product.stock})` });
      }

      products[pIdx] = { ...product, stock: product.stock - quantity, updatedAt: new Date().toISOString() };
      writeJSON(FILES.products, products);

      const total = unitSoldPrice * quantity;
      const costTotal = product.costPrice * quantity;
      const now = new Date().toISOString();
      const sale = {
        id: newId(),
        slug: product.slug,
        productName: product.name,
        brand: product.brand,
        quantity,
        unitSuggestedPrice: paymentType === "contado" ? product.cashPrice : product.creditPrice,
        unitSoldPrice,
        total,
        costTotal,
        buyerName,
        paymentType,
        amountPaid: 0,
        fullyPaid: false,
        fullyPaidAt: null,
        profitSettled: false,
        createdAt: now,
      };

      const initialAmount = paymentType === "contado" ? total : Math.max(0, Math.min(toMoney(body.initialPayment, 0), total));

      const sales = readJSON(FILES.sales, []);
      const payments = readJSON(FILES.payments, []);
      if (initialAmount > 0) {
        payments.push({ id: newId(), saleId: sale.id, amount: initialAmount, date: now, closingId: null });
        sale.amountPaid = initialAmount;
        sale.fullyPaid = initialAmount >= total;
        sale.fullyPaidAt = sale.fullyPaid ? now : null;
      }
      sales.push(sale);
      writeJSON(FILES.sales, sales);
      writeJSON(FILES.payments, payments);

      return sendJSON(res, 201, sale);
    }

    // -------------------- GET /api/admin/sales --------------------
    if (pathname === "/api/admin/sales" && method === "GET") {
      const sales = readJSON(FILES.sales, []);
      const pendingOnly = url.searchParams.get("pending") === "true";
      let list = sales;
      if (pendingOnly) {
        list = sales.filter((s) => s.paymentType === "credito" && !s.fullyPaid);
      }
      list = list
        .map((s) => ({ ...s, balance: s.total - s.amountPaid }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return sendJSON(res, 200, list);
    }

    // -------------------- POST /api/admin/sales/:id/payments --------------------
    const paymentMatch = pathname.match(/^\/api\/admin\/sales\/([^/]+)\/payments$/);
    if (paymentMatch && method === "POST") {
      const saleId = decodeURIComponent(paymentMatch[1]);
      const body = await readJSONBody(req);
      const amount = toMoney(body.amount, NaN);
      if (!Number.isFinite(amount) || amount <= 0) return sendJSON(res, 400, { error: "monto de abono inválido" });

      const sales = readJSON(FILES.sales, []);
      const sIdx = sales.findIndex((s) => s.id === saleId);
      if (sIdx === -1) return sendJSON(res, 404, { error: "venta no encontrada" });
      const sale = sales[sIdx];
      if (sale.fullyPaid) return sendJSON(res, 400, { error: "esta venta ya está pagada por completo" });

      const remaining = sale.total - sale.amountPaid;
      const applied = Math.min(amount, remaining);
      const now = new Date().toISOString();

      const payments = readJSON(FILES.payments, []);
      const payment = { id: newId(), saleId: sale.id, amount: applied, date: now, closingId: null };
      payments.push(payment);
      writeJSON(FILES.payments, payments);

      sale.amountPaid += applied;
      sale.fullyPaid = sale.amountPaid >= sale.total;
      sale.fullyPaidAt = sale.fullyPaid ? now : null;
      sales[sIdx] = sale;
      writeJSON(FILES.sales, sales);

      return sendJSON(res, 200, { sale, payment });
    }

    // -------------------- POST /api/admin/closings --------------------
    if (pathname === "/api/admin/closings" && method === "POST") {
      const payments = readJSON(FILES.payments, []);
      const pendingPayments = payments.filter((p) => p.closingId == null);
      if (pendingPayments.length === 0) {
        return sendJSON(res, 400, { error: "no hay dinero pendiente por cerrar" });
      }
      const cashCollected = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

      const sales = readJSON(FILES.sales, []);
      const settledSales = sales.filter((s) => s.fullyPaid && !s.profitSettled);
      const totalCapital = settledSales.reduce((sum, s) => sum + s.costTotal, 0);
      const totalRevenueSettled = settledSales.reduce((sum, s) => sum + s.total, 0);
      const totalProfit = totalRevenueSettled - totalCapital;
      const sellerCommission = Math.round(totalProfit * COMMISSION_RATE);
      const investorAmount = cashCollected - sellerCommission;

      const now = new Date().toISOString();
      const closing = {
        id: newId(),
        date: now,
        cashCollected,
        paymentIds: pendingPayments.map((p) => p.id),
        settledSaleIds: settledSales.map((s) => s.id),
        totalCapital,
        totalProfit,
        sellerCommission,
        investorAmount,
        createdAt: now,
      };

      const pendingIds = new Set(closing.paymentIds);
      const updatedPayments = payments.map((p) => (pendingIds.has(p.id) ? { ...p, closingId: closing.id } : p));
      writeJSON(FILES.payments, updatedPayments);

      const settledIds = new Set(closing.settledSaleIds);
      const updatedSales = sales.map((s) => (settledIds.has(s.id) ? { ...s, profitSettled: true } : s));
      writeJSON(FILES.sales, updatedSales);

      const closings = readJSON(FILES.closings, []);
      closings.push(closing);
      writeJSON(FILES.closings, closings);

      return sendJSON(res, 201, closing);
    }

    // -------------------- GET /api/admin/closings --------------------
    if (pathname === "/api/admin/closings" && method === "GET") {
      const closings = readJSON(FILES.closings, []).sort((a, b) => (a.date < b.date ? 1 : -1));
      return sendJSON(res, 200, closings);
    }

    // -------------------- vista previa de cierre (sin ejecutar) --------------------
    if (pathname === "/api/admin/closings/preview" && method === "GET") {
      const payments = readJSON(FILES.payments, []);
      const pendingPayments = payments.filter((p) => p.closingId == null);
      const cashCollected = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const sales = readJSON(FILES.sales, []);
      const settledSales = sales.filter((s) => s.fullyPaid && !s.profitSettled);
      const totalCapital = settledSales.reduce((sum, s) => sum + s.costTotal, 0);
      const totalProfit = settledSales.reduce((sum, s) => sum + (s.total - s.costTotal), 0);
      const sellerCommission = Math.round(totalProfit * COMMISSION_RATE);
      const investorAmount = cashCollected - sellerCommission;
      return sendJSON(res, 200, {
        cashCollected,
        pendingPaymentsCount: pendingPayments.length,
        settledSalesCount: settledSales.length,
        totalCapital,
        totalProfit,
        sellerCommission,
        investorAmount,
      });
    }

    // -------------------- config (nombres vendedor/inversionista) --------------------
    if (pathname === "/api/admin/config" && method === "GET") {
      return sendJSON(res, 200, readJSON(FILES.config, { sellerName: "Vendedor", investorName: "Inversionista" }));
    }
    if (pathname === "/api/admin/config" && method === "PATCH") {
      const body = await readJSONBody(req);
      const current = readJSON(FILES.config, { sellerName: "Vendedor", investorName: "Inversionista" });
      const next = {
        sellerName: body.sellerName !== undefined ? String(body.sellerName).trim() || current.sellerName : current.sellerName,
        investorName: body.investorName !== undefined ? String(body.investorName).trim() || current.investorName : current.investorName,
      };
      writeJSON(FILES.config, next);
      return sendJSON(res, 200, next);
    }

    return sendJSON(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    return sendJSON(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, () => console.log(`API listening on :${PORT}`));
