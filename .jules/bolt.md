## 2026-09-08 - Eliminate duplicate dataset calculations in compound UI metrics

**Learning:** `NCMarketIntelligence.leaders()` depended on market breadth data. When `render()` fetched `breadth()` and `leaders()` in parallel via `Promise.all`, both invoked `quoteRows()` on the universe, causing duplicate quote fetching for up to 50 symbols concurrently.

**Action:** Accept pre-computed dataset objects in downstream functions (e.g., `leaders(breadth)`) and check `(symbols && Array.isArray(symbols.rows))` before initiating async data fetching.
