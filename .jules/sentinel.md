## 2025-05-15 - Inline Event Handler Attribute Interpolation Bypasses HTML Escaping
**Vulnerability:** Interpolating dynamic parameters into inline event handlers like `onclick="runAnalysis('...')"`, even when passed through `escapeHTML()`, allowed DOM XSS. HTML entity decoding (`&#39;`) occurs during HTML attribute parsing *before* JavaScript evaluation, turning escaped quotes back into raw unescaped JavaScript quotes.
**Learning:** `escapeHTML()` does not protect strings interpolated directly into JavaScript contexts inside HTML attributes.
**Prevention:** Avoid inline `onclick` string interpolation. Always use HTML `data-*` attributes (`data-analyze="..."`) with delegated event listeners (`e.target.closest('[data-*]')`) to safely pass parameters to JS functions.

## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.
