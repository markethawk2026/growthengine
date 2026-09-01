## 2025-05-15 - Technical Indicator Series Optimization
**Learning:** In vanilla JS financial calculation routines that process price array time-series repeatedly, using `Array.prototype.slice().reduce()` and dynamic `.push()` calls creates noticeable memory allocation overhead. Pre-allocating `new Array(len)` and using single-pass `for` loops for initial SMA values reduces execution time by over 50%.
**Action:** When working on array/time-series indicators, avoid intermediate array slices and dynamic pushes; use pre-allocated arrays and manual accumulation loops.
