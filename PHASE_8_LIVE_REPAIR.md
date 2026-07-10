# NC Markets — Phase 8 Live Deployment Repair

## Audit findings before repair
- Hardcoded ticker references found in: {"user-tools-ui.js": ["RELIANCE", "TCS", "INFY"], "market-intelligence.js": ["RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "SBIN", "BHARTIARTL", "ITC", "HINDUNILVR", "AXISBANK", "KOTAKBANK"]}
- Misleading static live/real-data claims found: [["index.html", "Real data"]]
- Advanced Phase 4/5 modules existed but needed clearer navigation integration.
- Service-worker cache version could preserve stale GitHub Pages assets after deployment.

## Repairs implemented
- Replaced misleading static `Live`/`Real data` marketing claims in `index.html`.
- Market Intelligence now prefers a dynamic universe derived from the user's watchlist, recent analyses and portfolio.
- The previous fixed ticker set remains only as an explicitly named fallback universe when fewer than three user symbols exist.
- Added visible advanced-feature navigation for User Tools and Market Intelligence.
- Added graceful unavailable announcements if a dynamically mounted feature is missing.
- Bumped the service-worker shell cache to `nc-markets-shell-v8`.
- Added the Phase 8 repair module to the cached application shell.
- Preserved centralized API request architecture and existing financial features.

## Verification
- All JavaScript syntax passed: True
- Automated tests: {"financial-indicators.test.js": {"passed": true, "output": "PASS RSI is bounded\nPASS EMA returns finite value with enough history\nPASS EMA returns null with insufficient history\nPASS VWAP equals constant price\nPASS VWAP returns null without positive volume\nPASS ATR is positive\nPASS MACD details are deterministic\nPASS Technical score stays within 0..100\n\n8/8 tests passed"}, "security-architecture.test.js": {"passed": true, "output": "PASS security architecture checks"}}

## Important limitation
Code-level repair cannot prove every live API path works from GitHub Pages because provider CORS, proxy availability, rate limits and browser/service-worker state are runtime conditions. After upload, hard-refresh the deployed site and test the live flows in-browser.
