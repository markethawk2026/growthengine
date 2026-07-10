# NC Markets — Phase 1 Verification & Phase 2 Change Report

## Phase 1 verification
- NanduChandu references found: 0
- `security.js`: present
- `data-source.js`: present
- Phase 1 branding removal is verified.
- Security/data-source infrastructure is present. Remaining dynamic HTML sites should continue to be reviewed whenever new UI is added.

## Phase 2 implemented
- Added `js/request-manager.js` as the centralized request lifecycle layer.
- Added in-flight request deduplication so identical concurrent calls share one Promise.
- Added TTL-based memory caching with stale-cache fallback on network/provider failure.
- Added timeout handling with `AbortController`.
- Added retry handling for transient network failures, timeouts, HTTP 429 and 5xx responses.
- Added exponential backoff with bounded jitter and `Retry-After` support.
- Added standardized error categories: OFFLINE, TIMEOUT, RATE_LIMITED, SERVER_ERROR, HTTP_ERROR, INVALID_RESPONSE, NETWORK_ERROR.
- Routed proxy requests, RSS requests, and AI text requests through the centralized manager.
- Replaced the master overlapping interval pattern with `RefreshScheduler`.
- Refresh jobs now have a running lock and can pause while the browser tab is hidden.
- Added online/offline event signaling through `nc:network-status`.

## Compatibility
- Existing public function names and call sites were preserved.
- Existing `window.CACHE` behavior remains available.
- Existing feature flows were not intentionally removed.
- Public CORS proxies remain because the project is frontend-only; they are now isolated behind the request manager.

## Known limitation
A frontend-only app cannot guarantee provider uptime or true background execution while closed. A production backend proxy remains the recommended long-term architecture.
