## 2025-05-18 - Null Pointer Dereference Bypass in safeJSONParse
**Vulnerability:** `safeJSONParse` returned `null` instead of the specified fallback object when parsing `"null"` because `typeof null === 'object'` in JavaScript.
**Learning:** `typeof obj === 'object'` evaluates to `true` when `obj` is `null`. Code relying on `safeJSONParse` to return a safe non-null object fallback crashed with `TypeError: Cannot read properties of null` when processing `"null"` input strings.
**Prevention:** Always explicitly check `parsed !== null` alongside `typeof parsed === 'object'` when validating JSON object payloads.

## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.
