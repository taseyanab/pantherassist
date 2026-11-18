const S = require("./_lib/security");
const DIR = require("./_lib/directory");
const GENERIC = "CampusID or password is incorrect.";
const fails = new Map(); /* campusid -> {n, until} (per instance; production uses GSU SSO lockout) */

module.exports = S.safe(async (req, res) => {
  const body = S.requireJson(req, res, { campusid: { type: "string", required: true, max: 32, pattern: /^[a-z0-9]{2,32}$/i }, password: { type: "string", required: true, max: 128 } });
  if (!body) return;
  if (!S.configured()) return res.status(503).json({ error: "Sign in is not configured on this deployment." });
  if (S.limited("login:" + S.clientIp(req), 10, 15 * 60000)) return res.status(429).json({ error: "Too many sign in attempts. Try again in 15 minutes." });
  const id = body.campusid.toLowerCase();
  const user = DIR[id];
  /* Always run the hash, for every id and whether or not the account is throttled, so response time
     never reveals which ids exist or which are locked (constant-work path; no early return before this). */
  const salt = user ? user.salt : "00000000000000000000000000000000";
  const [got, want] = await Promise.all([S.scryptHex(body.password, salt), S.expectedHash(salt)]);
  const good = !!user && !!want && S.safeEqual(got, want);
  const f = fails.get(id) || { n: 0, until: 0 };
  const throttled = f.until > Date.now();
  if (!good) {
    /* count only wrong guesses; a run of them throttles further wrong guesses from this id */
    f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60000; f.n = 0; } fails.set(id, f);
    return res.status(401).json({ error: GENERIC });
  }
  /* A correct password always proceeds to Duo, even while throttled: wrong guesses by an attacker can
     never lock the real owner out (no denial of service), and the attacker still cannot pass number matching. */
  if (throttled) console.warn("[auth] correct password during throttle for", id);
  if (user.status !== "active") return res.status(403).json({ error: "This account is not active. Contact HR or the IIT Help Desk." });
  fails.delete(id);
  const code = String(10 + require("crypto").randomInt(90));
  S.setCookies(res, [S.cookie("pa_pre", S.sign(S.preAuth(id, code)), S.PRE_MIN * 60)]);
  return res.status(200).json({ ok: true, mfa: "number_match", code });
});
