/* Authoritative overseer check on the server. The browser runs the same rules for instant feedback,
   but a modified browser cannot skip this: the app asks here before showing a reply, and /api/sample
   enforces the same rules on everything that reaches the AI model. */
const S = require("./_lib/security");
const P = require("./_lib/policy");
module.exports = S.safe(async (req, res) => {
  const body = S.requireJson(req, res, { text: { type: "string", required: true, max: 4000 }, stage: { type: "string", required: true, oneOf: ["input", "output"] } });
  if (!body) return;
  const session = S.readSession(req, res);
  if (!session) return res.status(401).json({ error: "Sign in again." });
  if (S.limited("review:" + session.sub, 120, 5 * 60000)) return res.status(429).json({ error: "Too many requests." });
  const v = P.reviewText(body.text, body.stage);
  if (!v.allowed) console.warn("[overseer] server blocked", session.sub, v.cat, "sev", v.sev);
  return res.status(200).json(v);
});
