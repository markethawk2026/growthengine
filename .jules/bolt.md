## 2025-09-17 - Fast Array Allocation in Technical Indicator Calculations
**Learning:** Dynamic array resizing (`push()`), array slicing (`slice()`), and functional reductions (`reduce()`) in repeated financial indicator loops (like `calcEMASeries` and `calcMACDDetails`) create unnecessary object and array allocations, putting garbage collection pressure on the main thread during batch analyses or technical scoring.
**Action:** Pre-allocate result arrays with known lengths (`new Array(len)`) and use standard `for` loops for initial window summation to eliminate dynamic allocations.
