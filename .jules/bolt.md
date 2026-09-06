## 2025-05-18 - Avoid duplicate universe quote fetches across Market Intelligence methods
**Learning:** `NCMarketIntelligence.leaders()` internally calls `breadth()` to compute universe quotes. Calling `breadth()` and `leaders()` concurrently in UI render cycles caused redundant network fetches across 50 ticker candidates.
**Action:** Design engine query functions to accept optional pre-computed breadth or dataset objects (e.g. `leaders(symbolsOrBreadth)`) so callers can pass already-fetched results to avoid redundant API calls.
