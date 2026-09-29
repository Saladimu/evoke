const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSEIhSXJGhIrmUPcj2vWWnZHagsQnkm9-BBBr1tdmmWiCKB0OvYqkBCiRIpHO_f_tpJfTW8YjCtu4vt/pub?gid=470675989&single=true&output=csv";

const KELAS = ["SD", "SMP", "SMA", "Gabungan"];

const CACHE_URL = "https://evoke2.internal/API/data";
const FRESH_MS = 10000;
const STALE_MS = 40000;
const FORCE_MIN_MS = 5000;
const CACHE_CONTROL = "public, max-age=0, s-maxage=10, stale-while-revalidate=30";

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field.trim());
        field = "";
      } else if (c === "\n") {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && !r.every((f) => f === ""));
}

function rowToObject(header, row) {
  const obj = {};
  header.forEach((h, i) => {
    obj[h] = row[i] !== undefined ? row[i] : "";
  });
  return obj;
}

function isTrue(v) {
  return String(v || "").toUpperCase() === "TRUE";
}

function baseHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
    "Access-Control-Expose-Headers": "ETag, X-Cache",
  };
}

function jsonResponse(payload, state) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: Object.assign(baseHeaders(), {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL,
      ETag: payload.etag || "",
      "X-Cache": state || "",
    }),
  });
}

function notModifiedResponse(etag) {
  return new Response(null, {
    status: 304,
    headers: Object.assign(baseHeaders(), {
      "Cache-Control": CACHE_CONTROL,
      ETag: etag || "",
      "X-Cache": "REVALIDATED",
    }),
  });
}

function errorResponse(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status: status || 500,
    headers: Object.assign(baseHeaders(), {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    }),
  });
}

async function hashText(text) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function buildPayload() {
  const res = await fetch(SHEET_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`);
  const csv = await res.text();
  const sheetDate = res.headers.get("Date") || new Date().toUTCString();
  const rows = parseCSV(csv);
  if (rows.length < 2) throw new Error("No data rows found");

  const header = rows[0];
  const records = rows.slice(1).map((r) => rowToObject(header, r));

  const pending = records.filter(
    (r) =>
      r["Tanggal"] !== "" &&
      r["Pemenang"] === "" &&
      r["Tim-1"] !== "" &&
      r["Tim-2"] !== ""
  );

  const totalLomba = records.filter(
    (r) => r["Tanggal"] !== "" && r["Pemenang"] !== "" && isTrue(r["Internal"])
  );

  const totalCount = {};
  const winners = {};
  KELAS.forEach((k) => {
    totalCount[k] = 0;
    winners[k] = 0;
  });

  records.forEach((r) => {
    if (r["Tanggal"] !== "" && KELAS.includes(r["Kelas"])) {
      totalCount[r["Kelas"]]++;
    }
    if (r["Pemenang"] !== "" && isTrue(r["Internal"]) && KELAS.includes(r["Kelas"])) {
      winners[r["Kelas"]]++;
    }
  });

  const etag = '"' + (await hashText(csv)) + '"';

  return {
    ts: Date.now(),
    etag,
    generatedAt: new Date().toISOString(),
    sheetDate,
    pendingCount: pending.length,
    totalLomba: totalLomba.length,
    totalCount,
    winners,
    records,
  };
}

async function readCache(cache, key) {
  if (!cache) return null;
  try {
    const res = await cache.match(key);
    if (!res) return null;
    const payload = await res.json();
    return payload && Array.isArray(payload.records) && payload.records.length ? payload : null;
  } catch (e) {
    return null;
  }
}

async function writeCache(cache, key, payload) {
  if (!cache) return;
  try {
    await cache.put(
      key,
      new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "max-age=" + Math.round(STALE_MS / 1000),
        },
      })
    );
  } catch (e) {
    // cache is best-effort; never fail the request because of it
  }
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders() });
  }

  const cache = typeof caches !== "undefined" && caches.default ? caches.default : null;
  const cacheKey = new Request(CACHE_URL);
  const inm = request.headers.get("If-None-Match");
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const now = Date.now();

  try {
    if (force) {
      const cached = await readCache(cache, cacheKey);
      if (cached && now - (cached.ts || 0) < FORCE_MIN_MS) {
        return jsonResponse(cached, "FORCE-COOLDOWN");
      }
      const payload = await buildPayload();
      await writeCache(cache, cacheKey, payload);
      return jsonResponse(payload, "MISS");
    }

    const entry = await readCache(cache, cacheKey);
    if (entry) {
      const age = now - (entry.ts || 0);
      if (age < FRESH_MS) {
        if (inm && inm === entry.etag) return notModifiedResponse(entry.etag);
        return jsonResponse(entry, "HIT");
      }
      if (age < STALE_MS) {
        const refresh = buildPayload()
          .then((payload) => writeCache(cache, cacheKey, payload))
          .catch(() => {});
        if (typeof context.waitUntil === "function") context.waitUntil(refresh);
        if (inm && inm === entry.etag) return notModifiedResponse(entry.etag);
        return jsonResponse(entry, "STALE");
      }
    }

    const payload = await buildPayload();
    await writeCache(cache, cacheKey, payload);
    if (inm && inm === payload.etag) return notModifiedResponse(payload.etag);
    return jsonResponse(payload, "MISS");
  } catch (err) {
    const stale = await readCache(cache, cacheKey);
    if (stale) return jsonResponse(stale, "ERROR-STALE");
    return errorResponse(err.message || "Server error", 502);
  }
}
