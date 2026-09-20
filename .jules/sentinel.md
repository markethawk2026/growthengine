## 2025-05-18 - Restored JSON Workspace Schema Sanitization & Prototype Safety
**Vulnerability:** Restoring user workspace backups via `restoreWorkspace` directly passed unsanitized `JSON.parse` output into `Object.assign({}, defaults, parsed)`. This allowed malformed data, array-object payload confusion, unsanitized ticker injection into local storage, and prototype property assignment.
**Learning:** Client-side JSON backup/restore mechanisms must treat imported files as untrusted user input. Merging JSON state with `Object.assign` without schema validation and field-level sanitization bypasses UI input validation routines.
**Prevention:** Always parse imported JSON into a validated schema: filter arrays, sanitize strings with domain sanitizers (`cleanTicker`), cast numbers strictly (`Number.isFinite`), and construct new state objects explicitly rather than merging with `Object.assign`.

## 2025-05-14 - Context-Aware Output Encoding vs Ingestion Sanitization
**Vulnerability:** Pre-escaping user/external input at ingestion time (`yfNews`) stored HTML entities (`&lt;`) in data models. Re-interpolating these strings into `innerHTML` template strings caused second-order DOM XSS because entity `&lt;` in raw HTML strings was parsed into `<` during DOM assignment, and re-interpolations in detail views executed malicious HTML payloads.
**Learning:** HTML escaping must happen at output encoding time (where strings enter the HTML context) rather than at data ingestion time. Mixing pre-escaped data models with template string `innerHTML` assignments leads to double-escaping bugs or XSS vulnerabilities.
**Prevention:** Store clean, unescaped raw text in data models and apply `escapeHTML()` explicitly whenever constructing HTML strings for `innerHTML`.
