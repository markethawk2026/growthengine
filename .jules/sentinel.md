## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.

## 2025-05-15 - Backslash Obfuscation in Protocol-Relative URL Sanitization
**Vulnerability:** `sanitizeURL` only checked `lower.startsWith('//')` to block protocol-relative URLs. Attacking vectors like `/\evil.com` or `/\\evil.com` bypassed this check while browsers (per WHATWG URL standard) normalize backslashes to forward slashes in relative URLs, resolving them to `https://evil.com/` and enabling open redirects and cross-domain navigations.
**Learning:** Checking for protocol-relative URLs using simple string prefix matching (`startsWith('//')`) is insufficient because browsers treat any leading slashes mixed with backslashes (`/\` or `/\\`) as scheme-relative URL indicators.
**Prevention:** Use a regular expression matching any leading slash followed by a slash or backslash (`/^\/[/\\]/`) when validating relative URLs.
