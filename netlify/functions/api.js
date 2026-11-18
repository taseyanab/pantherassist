/* Netlify adapter: runs the same server code as Vercel (api/*.js) as one Netlify Function.
   /api/<name> is rewritten here by _redirects; this file converts Netlify's event into the
   Vercel style req/res the handlers expect, so security behavior is identical on both hosts. */
const ROUTES = {
  health: require("../../api/health.js"), login: require("../../api/login.js"), mfa: require("../../api/mfa.js"),
  me: require("../../api/me.js"), logout: require("../../api/logout.js"), sample: require("../../api/sample.js"),
  review: require("../../api/review.js"), alert: require("../../api/alert.js"), ticket: require("../../api/ticket.js"),
  sso: require("../../api/sso.js"), "sso-callback": require("../../api/sso-callback.js")
};
const NOT_FOUND = { statusCode: 404, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: '{"error":"Not found"}' };
exports.handler = async (event) => {
  const name = String(event.path || "").replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/, "").replace(/^\/+|\/+$/g, "");
  if (!Object.prototype.hasOwnProperty.call(ROUTES, name)) return NOT_FOUND; /* also hides /api/_lib/* source files */
  const headers = {};
  for (const [k, v] of Object.entries(event.headers || {})) headers[k.toLowerCase()] = v;
  if (headers["x-nf-client-connection-ip"]) headers["x-forwarded-for"] = headers["x-nf-client-connection-ip"];
  let raw = event.body || ""; if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  let body = raw;
  if (/^application\/json\b/i.test(headers["content-type"] || "")) { try { body = JSON.parse(raw || "{}"); } catch (e) { body = raw; } }
  const qs = event.rawQuery || new URLSearchParams(event.queryStringParameters || {}).toString();
  const req = { method: event.httpMethod, headers, body, url: "/api/" + name + (qs ? "?" + qs : "") };
  return new Promise((resolve) => {
    const h = {}, chunks = []; let done = false;
    const finish = (code) => { if (done) return; done = true;
      const single = {}, multi = {};
      for (const [k, v] of Object.entries(h)) { if (Array.isArray(v)) multi[k] = v.map(String); else single[k] = String(v); }
      resolve({ statusCode: code, headers: single, multiValueHeaders: multi, body: Buffer.concat(chunks).toString("utf8") }); };
    const res = {
      statusCode: 200, headersSent: false,
      setHeader(k, v) { h[String(k).toLowerCase()] = v; return res; }, getHeader(k) { return h[String(k).toLowerCase()]; },
      status(c) { res.statusCode = c; return res; },
      json(o) { if (!h["content-type"]) res.setHeader("content-type", "application/json"); res.end(JSON.stringify(o)); return res; },
      writeHead(c, hd) { res.statusCode = c; for (const k in hd || {}) res.setHeader(k, hd[k]); res.headersSent = true; return res; },
      write(c) { if (c != null) chunks.push(Buffer.from(c)); res.headersSent = true; return true; },
      end(c) { if (c != null) chunks.push(Buffer.from(c)); res.headersSent = true; finish(res.statusCode); return res; }
    };
    Promise.resolve(ROUTES[name](req, res)).then(() => { if (!done) finish(res.statusCode); })
      .catch(() => { if (!done) { chunks.length = 0; chunks.push(Buffer.from('{"error":"Something went wrong. Try again."}')); h["content-type"] = "application/json"; finish(500); } });
  });
};
