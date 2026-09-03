const http = require("http");
const fs = require("fs");
const path = require("path");

const DATA_FILE = process.env.DATA_FILE || "/data/stock.json";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const PORT = process.env.PORT || 3001;
const MAX_BODY_BYTES = 1e5;

if (!ADMIN_TOKEN) {
  console.error("ADMIN_TOKEN env var is required");
  process.exit(1);
}

function readStock() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeStock(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host}`);
  } catch {
    return sendJSON(res, 400, { error: "bad request" });
  }

  if (url.pathname === "/api/health") {
    return sendJSON(res, 200, { ok: true });
  }

  if (url.pathname === "/api/stock" && req.method === "GET") {
    return sendJSON(res, 200, readStock());
  }

  if (url.pathname === "/api/stock" && req.method === "POST") {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== ADMIN_TOKEN) {
      return sendJSON(res, 401, { error: "unauthorized" });
    }

    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        tooLarge = true;
        req.destroy();
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        return sendJSON(res, 400, { error: "invalid json" });
      }
      const { slug, agotado } = payload;
      if (typeof slug !== "string" || !slug || typeof agotado !== "boolean") {
        return sendJSON(res, 400, { error: "slug (string) and agotado (boolean) required" });
      }
      const stock = readStock();
      if (agotado) {
        stock[slug] = true;
      } else {
        delete stock[slug];
      }
      writeStock(stock);
      return sendJSON(res, 200, stock);
    });
    return;
  }

  sendJSON(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`Stock API listening on :${PORT}`));
