## 2025-05-14 - Single-Pass Streaming for Financial Indicators
**Learning:** Technical indicator calculations (e.g. MACD details) previously allocated multiple intermediate array series (`EMA12`, `EMA26`, `MACD`, `Signal`) via helper array allocations `calcEMASeries()`, resulting in excess garbage collection overhead and multi-pass loop traversals.
**Action:** Compute rolling exponential moving averages in a single streaming pass using scalar variables whenever only the final signal values are returned.
