# Bolt's Journal - Performance Learnings

## 2025-05-18 - Deduplicating Market Intelligence Universe Processing
**Learning:** Calling `breadth()` and `leaders()` concurrently in `Promise.all` resulted in `leaders()` executing `breadth()` internally, causing duplicate quote queries across the entire dynamic universe (up to 50 symbols).
**Action:** Always design market breadth/leaders computations so high-level summarizers accept pre-computed breadth objects, preventing redundant network requests or cache iterations across large symbol universes.
