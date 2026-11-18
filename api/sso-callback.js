/* Finishes GSU single sign on: checks state, exchanges the code, verifies the ID token signature (RS256 via the
   provider's published keys), issuer, audience, nonce and expiry, then maps the user to the GSU directory. */
const S = require("./_lib/security");
const O = require("./_lib/oidc");
const DIR = require("./_lib/directory");
module.exports = S.safe(async (req, res) => {
  const fail = () => { res.setHeader("Set-Cookie", "__Host-pa_sso=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"); res.statusCode = 302; res.setHeader("Location", "/?sso=error"); return res.end(); };
  if (req.method !== "GET" || !O.configured()) return fail();
  const q = new URL(req.url, "https://x").searchParams;
  const st = S.unsign(S.cookies(req)["__Host-pa_sso"]);
  if (!st || st.typ !== "sso" || Date.now() > st.exp || !q.get("code") || !S.safeEqual(q.get("state") || "", st.state)) return fail();
  if (!S.consumePre({ jti: st.state, exp: st.exp })) return fail(); /* single use */
  let claims; try { claims = await O.exchange(q.get("code"), st); } catch (e) { console.warn("[sso]", e.message); return fail(); }
  const id = O.campusId(claims); const user = id && DIR[id];
  if (!user || user.status !== "active") { console.warn("[sso] not in directory or inactive:", id); return fail(); }
  res.setHeader("Set-Cookie", ["__Host-pa_sso=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0", S.cookie("pa_session", S.sign(S.newSession({ id, roles: user.roles })), 8 * 3600)]);
  res.statusCode = 302; res.setHeader("Location", "/?sso=done"); return res.end();
});
