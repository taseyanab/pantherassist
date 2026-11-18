const S = require("./_lib/security");
module.exports = S.safe(async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  /* revoke the token on the server too, so a copied cookie stops working after sign out */
  const c = S.cookies(req);
  S.revoke(S.unsign(c["__Host-pa_session"]));
  S.revoke(S.unsign(c["__Host-pa_pre"]));
  S.setCookies(res, [S.cookie("pa_session", "", 0), S.cookie("pa_pre", "", 0)]);
  return res.status(200).json({ ok: true });
});
