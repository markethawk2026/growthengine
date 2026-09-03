## 2025-05-18 - Sector Performance Parallel Fetching

**Learning:** Sequential `for..in` loops containing `await` calls across array or object keys create unnecessary network latency bottlenecks. Refactoring to `Promise.all` executes quote queries concurrently, reducing overall execution time from $O(N \cdot T)$ to $O(T)$.

**Action:** Whenever iterating over distinct market symbol groups or sectors to make independent async API requests, collect promises and await them concurrently using `Promise.all`.
