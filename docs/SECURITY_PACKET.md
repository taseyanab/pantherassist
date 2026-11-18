# PantherAssist Security Packet

A starting point for a university vendor security review (for example the HECVAT questionnaire). Status reflects the current prototype. Items marked **Planned** need GSU IT before real student data is used.

## 1. Product summary
PantherAssist is an AI assistant for university staff. A separate security system (the overseer) checks every message and every answer, blocks risky requests, and routes cases to the right team.

## 2. Identity and access
| Control | Status |
|---|---|
| Single sign on through the university identity provider (OpenID Connect, PKCE, signed ID token checks) | Built, needs GSU IT to register the app |
| Multi factor sign in (Duo number matching in the demo; enforced by the identity provider with SSO) | Built |
| Roles come from HR or directory records; users cannot pick their own role | Built |
| Extra access needs an approver, expires in 7 or 30 days, can be revoked, cannot be self approved | Built |
| Session cookies are HttpOnly, Secure, SameSite Strict, 8 hour limit, 30 minute idle sign out, revoked on sign out | Built |

## 3. Data protection
| Control | Status |
|---|---|
| SSNs, student IDs, emails, phone, card and bank numbers masked before any AI call | Built |
| Student records never sent to the AI vendor until a vendor privacy agreement (FERPA) is on file (admin switch) | Built |
| Retention: chats 90 days, cases 365 days, audit 365 days (configurable) | Built |
| Encryption in transit (HTTPS only, HSTS preload) | Built |
| Encryption at rest | Planned: GSU hosted database |
| Signed privacy agreement with the AI vendor | Planned |

## 4. AI specific controls (OWASP Top 10 for LLM applications)
Prompt injection and indirect injection, sensitive data leaks, unsafe output, excessive agency (the AI has no tools and cannot act), system prompt leaks and abuse are each covered by rule checks, a second AI reviewer and output checks. The same rules run in the browser and on the server (`/api/review`, `/api/sample`).

## 5. Logging and monitoring
| Control | Status |
|---|---|
| Audit log of sign ins, access, approvals and setting changes | Built |
| Tamper evident audit chain (SHA-256 hash links; edits and deletions are flagged) | Built |
| Instant alerts to the security channel for severity 3 and 4 cases | Built, needs a webhook |
| Central log export to the university SIEM | Planned |

## 6. Application security
Strict Content Security Policy with Trusted Types, DOMPurify on every HTML insert, no inline scripts, clickjacking protection, strict input validation, rate limits, generic error messages. See `SECURITY_FIXES.md` (34 fixes) and `ATTACK_RESULTS.md` (100 attacks, 0 got through).

## 7. Testing
`npm test` runs a 39 check website scan and 60 server attacks on every change through GitHub Actions. Browser side tests cover 122 more checks and 40 more attacks.

## 8. Incident response
Cases route to the owning office (security incident response, privacy office, HR, IT). Severity 4 suspends access pending review. Staff can report concerns from any answer.

## 9. Open items before production
1. Host on GSU infrastructure with a shared database and SIEM export.
2. Register single sign on with GSU IT.
3. Sign the AI vendor privacy agreement.
4. Independent penetration test.
