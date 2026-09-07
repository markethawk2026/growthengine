## 2026-09-07 - Single-pass Financial Indicator Math & Set Lookup for Array Reordering

**Learning:** Intermediate array allocations in tight calculation loops (`.push()` inside loops, `.slice().reduce()` for initial averages) add ~50-56% execution overhead when calculating technical indicators (e.g., ATR and Exponential Moving Average series) over series data. Furthermore, using `Array.prototype.includes` inside `.filter` when re-ordering or deduplicating lists results in $O(N \cdot M)$ time complexity that degrades rapidly as list size grows.

**Action:** Pre-allocate output arrays of known length for indicator series, calculate running initial sums in a single loop pass without intermediate `.slice()` arrays, and convert candidate filter lists to `Set` for $O(1)$ lookup during array filtering/reordering.
