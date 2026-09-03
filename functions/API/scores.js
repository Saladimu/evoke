const STORE_KEY = "evoke-champion-scores";
const MAX_ENTRIES = 500;
const MAX_NAME = 24;
const MAX_SCORE = 50000;
const TOP_N = 20;
const memory = { scores: [] };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Cache-Control": "no-store",
    },
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

function sanitizeName(name) {
  return String(name || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME);
}

function uniqueBest(scores) {
  const map = new Map();
  for (const s of scores) {
    const key = String(s.name || "").toLowerCase();
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || Number(s.score) > Number(prev.score)) map.set(key, s);
  }
  return [...map.values()].sort((a, b) => b.score - a.score || String(a.date || "").localeCompare(String(b.date || "")));
}

function rankOf(scores, name) {
  const key = name.toLowerCase();
  const idx = uniqueBest(scores).findIndex((s) => String(s.name).toLowerCase() === key);
  return idx >= 0 ? idx + 1 : null;
}

function store(env) {
  const kv = env && env.SCORES;
  if (kv) {
    return {
      async read() {
        const raw = await kv.get(STORE_KEY, "json");
        return Array.isArray(raw) ? raw : [];
      },
      async write(scores) {
        await kv.put(STORE_KEY, JSON.stringify(scores.slice(-MAX_ENTRIES)));
      },
    };
  }
  return {
    async read() {
      return memory.scores.slice();
    },
    async write(scores) {
      memory.scores = scores.slice(-MAX_ENTRIES);
    },
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return cors();
  const db = store(env);

  try {
    if (request.method === "GET") {
      const all = await db.read();
      const scores = uniqueBest(all).slice(0, TOP_N);
      return json({ scores });
    }

    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const name = sanitizeName(body && body.name);
      const score = Number(body && body.score);
      if (!name) return json({ error: "Nama wajib diisi" }, 400);
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE || !Number.isInteger(score)) {
        return json({ error: "Skor tidak valid" }, 400);
      }

      const all = await db.read();
      all.push({
        name,
        score,
        date: new Date().toISOString(),
      });
      await db.write(all);
      const ranked = uniqueBest(all);
      const scores = ranked.slice(0, TOP_N);
      const mine = ranked.find((s) => s.name.toLowerCase() === name.toLowerCase());
      return json({
        ok: true,
        rank: rankOf(all, name),
        best: mine ? mine.score : score,
        scores,
      });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    return json({ error: err.message || "Server error" }, 500);
  }
}
