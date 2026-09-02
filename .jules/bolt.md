## 2025-09-02 - Coalescing Concurrent Ticker Fetching and Market Intelligence Pipeline
**Learning:** Concurrent UI modules and dependent market tools (such as `breadth` and `leaders`) often query the same ticker universe simultaneously. Without in-flight promise deduplication and parameter reuse, calling `breadth()` and `leaders()` in parallel results in 100+ duplicate quote requests per render.
**Action:** Always maintain an `inFlightPromises` map for asynchronous quote layers and allow higher-level aggregation functions (`leaders`) to accept precomputed underlying datasets (`breadth`).
