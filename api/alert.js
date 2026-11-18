/* Instant security alerts: a case at or above the alert severity is posted to the security team's channel.
   Env: SECURITY_WEBHOOK_URL (a Microsoft Teams or Slack incoming webhook on an approved host).
   Only the case label, severity, routing and assistant are sent: never what the staff member typed. */
const S = require("./_lib/security");
const OK_HOSTS = /(^|\.)(webhook\.office\.com|logic\.azure\.com|hooks\.slack\.com|environment\.api\.powerplatform\.com)$/i;
module.exports = S.safe(async (req, res) => {
  const body = S.requireJson(req, res, {
    id: { type: "string", required: true, max: 40, pattern: /^case_[A-F0-9]{8}$/ }, cat: { type: "string", required: true, max: 4, pattern: /^P\d\d$/ },
    catName: { type: "string", max: 60 }, sev: { type: "number", required: true }, action: { type: "string", max: 20 },
    owners: { type: "object" }, assistant: { type: "string", max: 40 } });
  if (!body) return;
  const session = S.readSession(req, res);
  if (!session) return res.status(401).json({ error: "Sign in again." });
  if (S.limited("alert:" + session.sub, 10, 10 * 60000)) return res.status(429).json({ error: "Too many alerts." });
  const url = process.env.SECURITY_WEBHOOK_URL;
  if (!url) return res.status(200).json({ sent: false, reason: "not configured" });
  let host = ""; try { host = new URL(url).hostname; } catch (e) {}
  if (!OK_HOSTS.test(host)) return res.status(200).json({ sent: false, reason: "webhook host not approved" });
  const clean = s => String(s || "").replace(/[<>*_`[\]]/g, "").slice(0, 80);
  const owners = Array.isArray(body.owners) ? body.owners.slice(0, 4).map(clean).join(", ") : "";
  const text = `PantherAssist alert: SEV ${Math.max(1, Math.min(4, body.sev | 0))} ${clean(body.catName || body.cat)} (${clean(body.cat)}) in the ${clean(body.assistant)} assistant. Action: ${clean(body.action)}. Routed to: ${owners}. Case ${body.id}. Open the Management page to review.`;
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => null);
  return res.status(200).json({ sent: !!(r && r.ok) });
});
