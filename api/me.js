const S = require("./_lib/security");
module.exports = S.safe(async (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  const s = S.readSession(req, res);
  if (!s) return res.status(401).json({ error: "Not signed in" });
  /* only ever the caller's own identity: there is no ID parameter to change */
  return res.status(200).json({ campusid: s.sub, roles: s.roles, expires: s.exp });
});
