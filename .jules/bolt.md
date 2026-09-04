## 2025-09-04 - Reusing Precomputed Market Breadth in Market Intelligence Engine
**Learning:** `NCMarketIntelligence.leaders()` was re-invoking `breadth()`, triggering a duplicate set of quote fetches and processing for up to 50 tickers during UI render.
**Action:** Always allow downstream aggregator functions (`leaders`) to accept precomputed parent data (`breadth`), eliminating duplicate fetch and array processing passes.
