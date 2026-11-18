# PantherAssist: security problems found and fixed during development

34 security problems were found and fixed while building the prototype. Each one below was a real weakness in the code at the time, and each fix is covered by an automated test.

## First security review (November 3, 2026)

1. Session and chat data were kept in long term browser storage; moved to tab only storage.
2. Passwords were compared as plain text; replaced with salted hashing.
3. There was no idle timeout; sessions now end after 30 minutes of inactivity.
4. Signing out left that person's chats on shared computers; sign out now clears them.
5. Saved chats were restored without sanitizing, allowing stored script injection.
6. Record IDs were predictable; now generated with cryptographic randomness.
7. Any user could write anywhere in the shared database; each person can now write only their own records.
8. Values from the database were shown without escaping, allowing stored script injection.
9. Staff messages reached the AI without fencing or removing personal data.
10. There was no message rate limit or input length limit.
11. Links to outside websites in answers had no warning.
12. Any staff member could turn off the AI review layer.
13. Access approvals were not enforced by the backend.
14. Security settings could be changed from the browser at runtime.

## Earlier development fixes

15. Chat history was shared between different accounts on the same device.
16. A person could keep chatting after the overseer ended their session.
17. Audit events recorded before the backend connected were lost.

## Web attack hardening (November 10, 2026)

18. Streamed replies showed dangerous text before the output check finished.
19. Blocked replies were shown with parts removed instead of being withheld.
20. Source links in answers were not escaped or limited to official domains.
21. Some notice text was inserted into the page without escaping.
22. Outside links leaked the page address to other sites (no referrer protection).

## AI security hardening (November 10, 2026)

23. The main AI was called before the guardrail had finished checking the message.
24. Compare by role showed risky answers with parts removed instead of withholding them.
25. Instructions hidden in HTML comments were removed before they could be detected and reported.
26. The text cleaner erased the placeholders that hide personal data.

## Website checklist review (November 10, 2026)

27. The HTML sanitizer library (DOMPurify 3.2.6) had 16 published vulnerabilities; updated to 3.4.17.
28. Demo account password hashes were sent to every visitor's browser.
29. The AI endpoint could be used without signing in.
30. Browser password hashing used 150,000 iterations, below the OWASP recommendation of 600,000.

## Penetration tests (November 10, 2026)

31. Five wrong guesses could lock the real owner out of their account (denial of service).
32. Response timing revealed which accounts were locked.
33. A session token kept working after signing out.
34. A used pre sign in cookie could be replayed to get a second session.
