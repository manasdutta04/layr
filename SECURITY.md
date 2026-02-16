# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.1.x   | :white_check_mark: |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Layr, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please email security details to: **security@manasdutta.in** (or use GitHub Security Advisories)

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

1. **Acknowledgment** - Within 48 hours
2. **Initial Assessment** - Within 7 days
3. **Fix Development** - Timeline depends on severity
4. **Public Disclosure** - After fix is released

### Security Best Practices for Users

1. **Keep Updated** - Always use the latest version
2. **Protect API Keys** - Never commit `.env` files
3. **Review Generated Plans** - AI output should be reviewed before execution
4. **Use HTTPS** - Ensure secure connections for AI providers
5. **Workspace Trust** - Only open trusted workspaces in VS Code

## Known Limitations

- Extension requires internet connectivity for AI features
- API keys are stored in VS Code settings (encrypted at rest by VS Code)
- Generated plans may contain AI-generated suggestions that should be reviewed

## Security Features

- ✅ Input validation on all user inputs
- ✅ Path traversal prevention in file operations
- ✅ HTML escaping in WebView content
- ✅ Rate limiting on expensive operations
- ✅ CSRF protection for WebView messages
- ✅ Content Security Policy for WebViews
- ✅ Secure file permissions for templates and history

## Threat Model

See [THREAT_MODEL.md](docs/THREAT_MODEL.md) for details on identified threats and mitigations.

## Credits

We appreciate security researchers who responsibly disclose vulnerabilities. 
Contributors will be credited in our security advisories (with permission).