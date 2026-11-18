/* Minimal OpenID Connect client with no dependencies: discovery, PKCE, code exchange and RS256 ID token verification. */
const crypto = require("crypto");
const configured = () => !!(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET && process.env.OIDC_REDIRECT_URI);
let metaCache = null, jwksCache = null, jwksAt = 0;
async function discover() {
  if (metaCache) return metaCache;
  const iss = process.env.OIDC_ISSUER.replace(/\/$/, "");
  if (!/^https:\/\//.test(iss) && !(process.env.OIDC_TEST_LOCAL === "1" && /^http:\/\/localhost:\d+$/.test(iss))) throw new Error("issuer must be https");
  const r = await fetch(iss + "/.well-known/openid-configuration"); if (!r.ok) throw new Error("discovery failed");
  const m = await r.json(); if (m.issuer !== iss && m.issuer !== iss + "/") throw new Error("issuer mismatch");
  metaCache = m; return m;
}
const b64u = b => Buffer.from(b).toString("base64url");
function newState() { return { typ: "sso", state: b64u(crypto.randomBytes(18)), nonce: b64u(crypto.randomBytes(18)), verifier: b64u(crypto.randomBytes(32)), exp: Date.now() + 600000 }; }
const challenge = v => b64u(crypto.createHash("sha256").update(v).digest());
async function keys(meta, force) {
  if (!force && jwksCache && Date.now() - jwksAt < 3600000) return jwksCache;
  const r = await fetch(meta.jwks_uri); if (!r.ok) throw new Error("jwks failed"); jwksCache = (await r.json()).keys || []; jwksAt = Date.now(); return jwksCache;
}
async function verify(idToken, nonce) {
  const meta = await discover();
  const [h, p, sig] = String(idToken).split("."); if (!h || !p || !sig) throw new Error("malformed token");
  const header = JSON.parse(Buffer.from(h, "base64url")); if (header.alg !== "RS256") throw new Error("unexpected alg");
  let jwk = (await keys(meta)).find(k => k.kid === header.kid); if (!jwk) jwk = (await keys(meta, true)).find(k => k.kid === header.kid);
  if (!jwk) throw new Error("unknown key");
  const ok = crypto.verify("RSA-SHA256", Buffer.from(h + "." + p), crypto.createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(sig, "base64url"));
  if (!ok) throw new Error("bad signature");
  const c = JSON.parse(Buffer.from(p, "base64url")); const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (c.iss !== meta.issuer || !aud.includes(process.env.OIDC_CLIENT_ID) || c.nonce !== nonce || !(c.exp > now - 60) || (c.nbf && c.nbf > now + 60)) throw new Error("claims rejected");
  return c;
}
async function exchange(code, st) {
  const meta = await discover();
  const r = await fetch(meta.token_endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: process.env.OIDC_REDIRECT_URI, client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET, code_verifier: st.verifier }).toString() });
  if (!r.ok) throw new Error("token exchange failed");
  const t = await r.json(); return verify(t.id_token, st.nonce);
}
/* CampusID comes from the preferred_username or email claim (before the @), lower case, letters and digits only */
function campusId(c) { const raw = String(c.preferred_username || c.email || "").split("@")[0].toLowerCase(); return /^[a-z0-9]{2,32}$/.test(raw) ? raw : null; }
module.exports = { configured, discover, newState, challenge, exchange, campusId };
