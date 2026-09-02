# Security Policy

## Intended use

CV Tailor is designed to run on `localhost` only. It has no authentication, no
session handling, and no access control of any kind — any request that reaches
the app's port is served. **Never expose this app on a public network, a
shared host, or behind a reverse proxy that makes it reachable by anyone other
than you.** Run it only on your own machine, bound to localhost, as documented
in the README.

## Data & telemetry

CV Tailor sends zero telemetry or analytics anywhere. The only network calls
it makes are to your local Ollama server (`localhost:11434` by default). Your
CV and job description text never leave your machine, and are never written
to disk by the app itself. The app does log locally to the console (model
name, timing, success/failure) for debugging generation issues, but never
logs the CV or job description content itself.

## Supported versions

Only the latest version on `main` is supported. There are no LTS branches or
backported fixes — if you're running an older commit, update before reporting
an issue.

## Reporting a vulnerability

If you find an actual security vulnerability (as opposed to a general bug),
please report it responsibly:

1. **Preferred**: use GitHub's private vulnerability reporting — go to the
   Security tab on this repository and select "Report a vulnerability", if
   it's enabled.
2. **Otherwise**: open a normal GitHub issue, but do not include exploit
   details or a working proof of concept in it. Describe the impact in general
   terms and wait for a response before disclosing any specifics publicly.

Please give the maintainer a reasonable amount of time to respond and address
the issue before any public disclosure.
