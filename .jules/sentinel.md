## 2026-09-09 - HTML Entity Unescaping in Inline Event Handlers
**Vulnerability:** Interpolating `esc(r.ticker)` into inline event handlers like `onclick="runAnalysis('${esc(r.ticker)}')"` allowed DOM XSS. HTML attribute values are unescaped by the browser's HTML parser before JavaScript execution, turning `&#39;` back into `'` and breaking out of JS string literals.
**Learning:** Standard HTML escaping (`escapeHTML`) does not protect against XSS when used inside inline JavaScript event attributes (`onclick`, `onerror`, etc.) because entity decoding occurs before JS parsing.
**Prevention:** Avoid inline JavaScript handlers with interpolated variables in `innerHTML`. Instead, store values in `data-*` attributes (`data-mi-ticker`) and use event delegation via `addEventListener`.

## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.
