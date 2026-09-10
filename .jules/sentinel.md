## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.

## 2025-05-18 - Scheme-Relative URL Sanitizer Bypass via Backslashes
**Vulnerability:** Scheme-relative URL bypass in `sanitizeURL()` using backslashes (`/\evil.com`, `/\\evil.com`).
**Learning:** Checking only `lower.startsWith('//')` is insufficient for blocking protocol-relative URLs because browser URL parsers normalize backslashes (`\`) in authority relative paths into slashes (`/`), resolving `/\domain` or `/\\domain` to `//domain` (external origin).
**Prevention:** Use `/^\/[/\\]/` regex or test for initial slashes followed by slashes or backslashes when sanitizing relative paths.
