## 2025-05-18 - Optimize calcEMASeries array allocations and loop math
**Learning:** `calcEMASeries` previously generated multiple intermediate arrays using `values.slice(0, p).reduce(...)` and repeated `.push(...)` allocations inside core indicator calculations (MACD, signal series).
**Action:** Pre-allocate output arrays and compute initial SMA values via direct loop indexing to significantly reduce garbage collection overhead and execution time.
