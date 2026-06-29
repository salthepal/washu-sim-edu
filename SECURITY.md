# Security Policy

## Supported Versions

This repository is maintained for the current `master` branch. Security fixes are applied to the active version of the site and deployment configuration.

## Reporting a Vulnerability

Please do not open a public issue for suspected security vulnerabilities.

Report security concerns through GitHub's private vulnerability reporting for this repository when available. If private reporting is unavailable, contact the repository owner directly and include:

- A concise description of the issue and affected component
- Steps to reproduce or proof-of-concept details
- The impact you believe the issue may have
- Any relevant logs, screenshots, package names, or dependency versions

## Response Expectations

The maintainer will make a best effort to:

- Acknowledge the report within 5 business days
- Triage severity and affected scope within 10 business days
- Keep the reporter updated when a fix or mitigation is in progress
- Credit the reporter when appropriate and requested

## Scope

In scope:

- Application source code in this repository
- Build, deployment, and GitHub Actions configuration
- Dependency vulnerabilities that affect the deployed site

Out of scope:

- Vulnerabilities in third-party services not controlled by this repository
- Denial-of-service testing or intrusive scanning
- Social engineering, phishing, or physical attacks
- Findings that require access to secrets, credentials, or accounts not owned by the reporter

## Security Practices

This repository uses Dependabot and code scanning to help identify dependency and source-code security issues. Secrets must not be committed to the repository; use environment variables and deployment platform secret storage instead.

## Data Residency

The current production D1 database runs in Cloudflare `ENAM`. Treat this as the approved operating region for learner module responses; migrate to a newly created jurisdiction-pinned D1 database before accepting data with stricter residency requirements.
