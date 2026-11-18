/* Help desk integration: opens or withdraws a ticket in GSU's ticket system through an approved webhook.
   Env: TICKET_WEBHOOK_URL (for example a ServiceNow or TeamDynamix inbound integration on an approved host),
        TICKET_HOSTS (comma separated host allow list, required with the URL).
   The summary is masked (no SSNs, emails, phone numbers) and capped. Without configuration a local reference is returned. */
const S = require("./_lib/security");
const P = require("./_lib/policy");
const crypto = require("crypto");
module.exports = S.safe(async (req, res) => {
  const body = S.requireJson(req, res, {
    action: { type: "string", required: true, oneOf: ["open", "withdraw"] }, id: { type: "string", required: true, max: 60, pattern: /^iss_[a-z0-9]+$/ },
    assistant: { type: "string", max: 40 }, summary: { type: "string", max: 200 } });
  if (!body) return;
  const session = S.readSession(req, res);
  if (!session) return res.status(401).json({ error: "Sign in again." });
  if (S.limited("ticket:" + session.sub, 15, 60 * 60000)) return res.status(429).json({ error: "Too many tickets this hour." });
  const ref = "PA-" + crypto.createHash("sha256").update(body.id).digest("hex").slice(0, 6).toUpperCase();
  const url = process.env.TICKET_WEBHOOK_URL, hosts = String(process.env.TICKET_HOSTS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!url || !hosts.length) return res.status(200).json({ ticket: ref, synced: false });
  let host = ""; try { host = new URL(url).hostname.toLowerCase(); } catch (e) {}
  if (!hosts.includes(host)) return res.status(200).json({ ticket: ref, synced: false });
  const payload = { action: body.action, reference: ref, requester: session.sub, assistant: String(body.assistant || "").slice(0, 40),
    summary: P.maskPII(String(body.summary || "")).slice(0, 200), source: "PantherAssist" };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.TICKET_TOKEN ? { Authorization: "Bearer " + process.env.TICKET_TOKEN } : {}) }, body: JSON.stringify(payload) }).catch(() => null);
  return res.status(200).json({ ticket: ref, synced: !!(r && r.ok) });
});
