/* Shared server security helpers: signed HttpOnly session cookies, scrypt password hashing,
   strict input validation, rate limits and generic error handling. Underscore files are not routes on Vercel. */
const crypto = require("crypto");

const SESSION_HOURS = 8, IDLE_MIN = 30, PRE_MIN = 5;
/* SESSION_SECRET from Vercel settings is preferred. Without it, a random secret generated when this zip was built is used,
   so the demo works with no setup. Anyone who has this zip could sign session cookies, so set SESSION_SECRET before sharing the code. */
const BUILD_ID = "20261117-1739";
const BUILD_SECRET = "2mbt8bWA6XcZAWNAA5todKPDaOmelZNHBRfrgap1024JB-MnfuZB5yEdgmG77s0X";
let FALLBACK = BUILD_SECRET;
const SECRET = process.env.SESSION_SECRET || FALLBACK;
/* demo password: DEMO_PASSWORD from Vercel settings, or "123" when it is not set (demo accounts hold only fictional data) */
const DEMO_PW = () => process.env.DEMO_PASSWORD || "123";
const configured = () => SECRET.length >= 32;

/* ---------- scrypt (memory hard, salted; OWASP parameters N=2^17, r=8, p=1) ---------- */
const SCRYPT = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function scryptHex(pw, saltHex) {
  return new Promise((ok, bad) => crypto.scrypt(String(pw).normalize("NFKC"), Buffer.from(saltHex, "hex"), 32, SCRYPT, (e, k) => e ? bad(e) : ok(k.toString("hex"))));
}
const hashCache = new Map();
/* The demo password lives only in the DEMO_PASSWORD environment variable. Each account gets its own salt,
   and the stored value is the scrypt hash, never the password. Production replaces this with GSU SSO. */
async function expectedHash(saltHex) {
  if (!hashCache.has(saltHex)) hashCache.set(saltHex, await scryptHex(DEMO_PW(), saltHex));
  return hashCache.get(saltHex);
}
function safeEqual(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }

/* ---------- signed cookies ---------- */
const b64 = s => Buffer.from(s).toString("base64url");
function sign(obj) { const body = b64(JSON.stringify(obj)); const mac = crypto.createHmac("sha256", SECRET).update(body).digest("base64url"); return body + "." + mac; }
function unsign(tok) {
  if (!tok || !configured()) return null;
  const [body, mac] = String(tok).split(".");
  if (!body || !mac) return null;
  const want = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!safeEqual(mac, want)) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch (e) { return null; }
}
function cookies(req) {
  const out = {}; String(req.headers.cookie || "").split(";").forEach(p => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}
/* __Host- prefix: Secure, Path=/, no Domain, so subdomains cannot plant or read it */
function cookie(name, value, maxAgeSec) {
  return `__Host-${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSec}`;
}
function setCookies(res, list) { res.setHeader("Set-Cookie", list); }

/* Revocation: signed tokens are otherwise valid until they expire, so sign out records the token id here,
   and each pre sign in token can be used once. In memory per function instance; production needs a shared
   store (for example Vercel KV or Redis) so every instance sees revocations. */
const revoked = new Map(), usedPre = new Map();
function sweep(m) { const now = Date.now(); if (m.size > 5000) for (const [k, exp] of m) if (exp < now) m.delete(k); }
function revoke(tok) { if (tok && tok.jti) { revoked.set(tok.jti, tok.exp || Date.now() + 864e5); sweep(revoked); } }
function consumePre(tok) { if (!tok || !tok.jti || usedPre.has(tok.jti)) return false; usedPre.set(tok.jti, tok.exp); sweep(usedPre); return true; }
function readSession(req, res) {
  const s = unsign(cookies(req)["__Host-pa_session"]);
  const now = Date.now();
  if (!s || s.typ !== "session" || now > s.exp || now - s.seen > IDLE_MIN * 60000) return null;
  if (revoked.has(s.jti)) return null;
  if (now - s.seen > 5 * 60000 && res) { s.seen = now; setCookies(res, [cookie("pa_session", sign(s), Math.floor((s.exp - now) / 1000))]); } /* sliding idle timeout */
  return s;
}
function newSession(user) { const now = Date.now(); return { typ: "session", sub: user.id, roles: user.roles, iat: now, seen: now, exp: now + SESSION_HOURS * 3600000, jti: crypto.randomBytes(12).toString("hex") }; }
function preAuth(id, code) { const now = Date.now(); return { typ: "pre", sub: id, code, exp: now + PRE_MIN * 60000, jti: crypto.randomBytes(12).toString("hex") }; }

/* ---------- rate limits (per function instance; add Vercel Firewall rules for global limits) ---------- */
const buckets = new Map();
function limited(key, max, windowMs) {
  const now = Date.now(); const list = (buckets.get(key) || []).filter(t => now - t < windowMs);
  list.push(now); buckets.set(key, list); if (buckets.size > 20000) buckets.clear();
  return list.length > max;
}
const clientIp = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

/* ---------- strict request validation ---------- */
function requireJson(req, res, schema) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); res.status(405).json({ error: "Method not allowed" }); return null; }
  if (!/^application\/json\b/i.test(String(req.headers["content-type"] || ""))) { res.status(415).json({ error: "JSON only" }); return null; }
  const origin = req.headers.origin || "";
  const allowed = process.env.ALLOWED_ORIGIN || ("https://" + req.headers.host);
  if (origin && origin !== allowed) { res.status(403).json({ error: "Origin not allowed" }); return null; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== "object" || Array.isArray(body)) { res.status(400).json({ error: "Invalid request" }); return null; }
  for (const k of Object.keys(body)) if (!(k in schema)) { res.status(400).json({ error: "Invalid request" }); return null; }
  for (const [k, rule] of Object.entries(schema)) {
    const v = body[k];
    if (v === undefined) { if (rule.required) { res.status(400).json({ error: "Invalid request" }); return null; } continue; }
    if (typeof v !== rule.type) { res.status(400).json({ error: "Invalid request" }); return null; }
    if (rule.type === "string" && (v.length > (rule.max || 1000) || (rule.pattern && !rule.pattern.test(v)) || (rule.oneOf && !rule.oneOf.includes(v)))) { res.status(400).json({ error: "Invalid request" }); return null; }
  }
  return body;
}
/* never leak stack traces or internals */
const safe = fn => async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try { return await fn(req, res); }
  catch (e) { console.error("[error]", e && e.message); if (!res.headersSent) res.status(500).json({ error: "Something went wrong. Try again." }); else res.end(); }
};

module.exports = { BUILD_ID, DEMO_PW, revoke, consumePre, configured, scryptHex, expectedHash, safeEqual, sign, unsign, cookies, cookie, setCookies, readSession, newSession, preAuth, limited, clientIp, requireJson, safe, PRE_MIN };
