# Bolt's Performance Journal

## 2025-05-18 - Avoid Parallel Sub-Function Invocations Re-Fetching Identical Universes
**Learning:** In `NCMarketIntelligence`, `leaders()` called `breadth()`, but the UI invoked `Promise.all([NCMarketIntelligence.breadth(), NCMarketIntelligence.leaders(), ...])` concurrently. Because both functions were triggered simultaneously before the quote cache populated, `yfQuote` ran twice in parallel for every stock symbol in the universe (up to 50 tickers), doubling the network and processing workload on market intelligence renders.
**Action:** Design data pipeline functions like `leaders(symbolsOrBreadth)` to accept either raw symbol arrays or pre-computed result objects, and pass pre-fetched calculations down the chain rather than executing concurrent parallel sub-requests.
