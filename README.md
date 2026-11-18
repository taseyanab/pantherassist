# PantherAssist

**A guardian AI assistant for Georgia State staff**

**Live demo:** https://pantherassist-gsu.netlify.app/  
**Status:** Presented · **Built at:** Georgia State

<img src="screenshots/pantherassist-1.jpg" width="200" alt="screen"> <img src="screenshots/pantherassist-2.jpg" width="200" alt="screen"> <img src="screenshots/pantherassist-3.jpg" width="200" alt="screen"> <img src="screenshots/pantherassist-4.jpg" width="200" alt="screen">

## Overview
Georgia State staff share a university owned AI assistant. PantherAssist lets faculty and staff ask questions, get trained and work safely, while a built in Overseer watches for malicious use and reports infractions to the right GSU team. I built it on my own and presented it to my supervisor in November 2026.

## What I built
A working prototype with GSU style sign in (CampusID, a Duo style verification step, and lockout after 5 failed attempts), demo accounts, multiple assistants, notifications, a “How PantherAssist protects you” explainer, and the Overseer that flags risky prompts and routes them for review. I also wrote a research brief with a draft AI use policy and a risk assessment to go with it.

## My role
Solo project: research, UX flows, design and build.

## Security and privacy
* The Overseer checks every prompt before a model sees it and blocks prompt injection, attempts to extract secrets, and policy violations.
* Sign in uses a CampusID style login, a Duo style number match, lockout after 5 failed attempts, and session secrets from environment variables.
* API routes refuse cross origin requests and do not reveal whether an account exists.
* `test/` contains an automated attack suite (100+ attack cases) and a security scan, run in GitHub Actions. The passwords in those tests are fake on purpose.
* The Anthropic API key and session secret are read from environment variables and never committed.

## Tech
HTML, CSS, JavaScript, Node serverless functions, Anthropic Claude API, OIDC, GitHub Actions, Vercel and Netlify

## Run it
See [SETUP.md](SETUP.md). Set `ANTHROPIC_API_KEY` and `SESSION_SECRET` as environment variables, then deploy to Vercel or Netlify. Run `node test/run_all.js` for the security tests.

## What's next
Pilot with a small staff group, connect real single sign on, and tune the Overseer’s risk rules with the security team.

---
Built by **Taseyana Booker-Hopkins** · Computer Information Systems (cybersecurity), Georgia State University · [Portfolio](https://taseyanab.github.io) · [LinkedIn](https://linkedin.com/in/taseyana)
