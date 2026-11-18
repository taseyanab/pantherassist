/* GSU single sign on (OpenID Connect, authorization code flow with PKCE).
   Env: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI (https://<site>/api/sso-callback).
   GSU's identity provider enforces Duo, so a session from SSO does not repeat the number match. */
const S = require("./_lib/security");
const O = require("./_lib/oidc");
module.exports = S.safe(async (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  if (!O.configured()) return res.status(404).json({ error: "Single sign on is not configured" });
  if (S.limited("sso:" + S.clientIp(req), 20, 10 * 60000)) return res.status(429).json({ error: "Too many attempts." });
  const meta = await O.discover();
  const st = O.newState();
  /* Lax so the cookie comes back on the identity provider's redirect; it is single use and expires in 10 minutes */
  res.setHeader("Set-Cookie", `__Host-pa_sso=${S.sign(st)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const u = new URL(meta.authorization_endpoint);
  Object.entries({ response_type: "code", client_id: process.env.OIDC_CLIENT_ID, redirect_uri: process.env.OIDC_REDIRECT_URI, scope: "openid profile email",
    state: st.state, nonce: st.nonce, code_challenge: O.challenge(st.verifier), code_challenge_method: "S256" }).forEach(([k, v]) => u.searchParams.set(k, v));
  res.statusCode = 302; res.setHeader("Location", u.toString()); return res.end();
});
