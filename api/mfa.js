/* Finishes sign in: the full session cookie is only issued after the Duo number match is verified on the server */
const S = require("./_lib/security");
const DIR = require("./_lib/directory");
module.exports = S.safe(async (req, res) => {
  const body = S.requireJson(req, res, { code: { type: "string", required: true, max: 2, pattern: /^\d{2}$/ } });
  if (!body) return;
  const pre = S.unsign(S.cookies(req)["__Host-pa_pre"]);
  if (!pre || pre.typ !== "pre" || Date.now() > pre.exp) return res.status(401).json({ error: "Your sign in expired. Start again." });
  /* single use: any attempt, right or wrong, consumes this pre sign in token (no replay, no retry guessing) */
  if (!S.consumePre(pre)) { S.setCookies(res, [S.cookie("pa_pre", "", 0)]); return res.status(401).json({ error: "Your sign in expired. Start again." }); }
  if (S.limited("mfa:" + pre.sub, 5, 10 * 60000)) return res.status(429).json({ error: "Too many verification attempts." });
  const clear = S.cookie("pa_pre", "", 0);
  if (!S.safeEqual(body.code, pre.code)) {
    console.warn("[auth] Duo number mismatch for", pre.sub);
    S.setCookies(res, [clear]);
    return res.status(401).json({ error: "Verification failed. The security team was alerted." });
  }
  const user = DIR[pre.sub];
  if (!user || user.status !== "active") { S.setCookies(res, [clear]); return res.status(403).json({ error: "This account is not active." }); }
  S.setCookies(res, [clear, S.cookie("pa_session", S.sign(S.newSession({ id: pre.sub, roles: user.roles })), 8 * 3600)]);
  return res.status(200).json({ ok: true, campusid: pre.sub, roles: user.roles });
});
