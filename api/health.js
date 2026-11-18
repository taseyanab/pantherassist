const S = require("./_lib/security");
const O = require("./_lib/oidc");
module.exports = S.safe(async (req, res) => {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed" }); }
  res.status(200).json({ build: S.BUILD_ID, ai: !!process.env.ANTHROPIC_API_KEY, auth: S.configured(), sso: S.configured() && O.configured(), alerts: !!process.env.SECURITY_WEBHOOK_URL, tickets: !!process.env.TICKET_WEBHOOK_URL,
    /* demo convenience: the sign in screen shows the shared demo password unless DEMO_HIDE_PASSWORD=1 (it unlocks only fictional demo accounts) */
    demoPassword: (S.configured() && process.env.DEMO_HIDE_PASSWORD !== "1") ? S.DEMO_PW() : undefined });
});
