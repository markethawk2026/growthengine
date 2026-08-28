## 2025-05-18 - Deduplicate Concurrent Breadth Calls in Market Intelligence
**Learning:** Concurrent execution of `breadth()` and `leaders()` in `Promise.all` causes redundant ticker quote fetches from cold cache because `leaders()` calls `breadth()` internally. Passing precomputed breadth to `leaders(b)` eliminates duplicate fetches.
**Action:** When composing higher-level async functions that depend on common sub-queries, allow sub-query results to be passed in or memoized to avoid cold-cache duplicate network calls.
