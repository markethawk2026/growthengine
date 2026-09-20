## 2026-09-20 - Reuse Pre-Fetched Market Breadth in Market Intelligence
**Learning:** Calling `NCMarketIntelligence.breadth()` and `NCMarketIntelligence.leaders()` concurrently in `Promise.all` caused duplicate ticker quote fetching calls for the same stock universe because `leaders()` invoked `breadth()` internally.
**Action:** Pass pre-fetched `breadth` result object directly into `NCMarketIntelligence.leaders(b)` to reuse calculated quote rows and avoid duplicate in-flight network requests.
