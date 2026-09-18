## 2026-09-18 - Avoid Redundant Market Breadth Execution in Leaders Engine
**Learning:** `NCMarketIntelligence.leaders()` calls `breadth()`, but UI orchestrators frequently invoke `breadth()` and `leaders()` simultaneously in `Promise.all()`, causing duplicate quote processing across up to 50 market symbols.
**Action:** Pass pre-computed `breadth` result directly into `leaders(breadthObj)` or ensure `leaders()` accepts both symbol arrays and pre-computed breadth objects to reuse results.
