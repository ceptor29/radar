# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

Pre-release versions (0.x) receive security fixes on the latest release only.

## Reporting a vulnerability

Please do **not** open a public issue for security vulnerabilities.

Report privately by email to the maintainer at **ceptorboss@users.noreply.github.com**, or use GitHub's private vulnerability reporting if enabled on this repository.

Include as much of the following as possible:

- Affected version(s) and component (web, server, shared)
- Steps to reproduce
- Impact and any proof of concept

You should receive an acknowledgment within 3 business days. We will work with you to confirm, patch, and disclose the issue responsibly.

## Security notes for operators

- Demo credentials ship with the seed data. **Change all passwords and rotate the JWT secret before any real deployment.**
- The SQLite database and upload directory are excluded from git; keep them out of backups that are copied to untrusted storage.
- This is a P1 foundation. It has not been hardened for production and should not store sensitive production data yet.