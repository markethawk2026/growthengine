## 2025-05-15 - Backslash Normalization in URL Sanitization
**Vulnerability:** `sanitizeURL` checked `lower.startsWith('//')` to block protocol-relative URLs but did not normalize backslashes (`\`) to forward slashes (`/`). Browsers parse URLs containing backslashes as forward slashes (e.g. `/\\evil.com` or `/\evil.com` becomes `//evil.com`), bypassing prefix validation and leading to open redirects or cross-domain navigation.
**Learning:** Browser URL parsers normalize backslashes to forward slashes. Validating URLs using string prefix checks (`startsWith('//')`) without prior backslash normalization creates protocol-relative URL bypasses.
**Prevention:** Always normalize backslashes (`str.replace(/\\/g, '/')`) before performing protocol or path validation on URLs.

## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.
