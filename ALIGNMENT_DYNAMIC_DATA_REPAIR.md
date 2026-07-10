# NC Markets — Alignment and Dynamic-Only Company Data Repair

## Changes completed
- Removed the hardcoded default/fallback company universe from Market Intelligence.
- Removed the hardcoded sector-to-company mapping.
- Market Intelligence now uses only symbols from the user's watchlist, recent analyses, and portfolio.
- When no user symbols exist, the UI shows an explicit empty state instead of injecting predefined companies.
- Removed hardcoded company examples from user-tool placeholders.
- Repaired workspace widths, centered page sections, grid sizing, mobile wrapping, table overflow, sticky advanced navigation, and responsive card alignment.
- Bumped the service-worker cache version to force updated assets after deployment.

## Verification
- Remaining known hardcoded company/ticker references in JS: {}
- All JavaScript syntax passed: True
- Automated tests: {"financial-indicators.test.js": {"passed": true, "output": "PASS RSI is bounded\nPASS EMA returns finite value with enough history\nPASS EMA returns null with insufficient history\nPASS VWAP equals constant price\nPASS VWAP returns null without positive volume\nPASS ATR is positive\nPASS MACD details are deterministic\nPASS Technical score stays within 0..100\n\n8/8 tests passed"}, "security-architecture.test.js": {"passed": true, "output": "PASS security architecture checks"}}

## Runtime note
The live GitHub Pages layout still needs a hard refresh after deployment because an older service worker may temporarily serve cached assets.
