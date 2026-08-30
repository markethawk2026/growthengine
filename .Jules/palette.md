# Palette's Journal - UX & Accessibility Learnings

## 2025-05-18 - Dynamic ARIA Labels for State-Toggling Icon Buttons
**Learning:** Icon-only buttons (such as theme toggles or chat send buttons) are inaccessible to screen readers without `aria-label` and `title` attributes. When state changes (e.g., toggling dark/light mode), static labels become inaccurate and confusing.
**Action:** Always provide initial `aria-label` and `title` attributes on icon-only buttons in HTML, and dynamically update `aria-label` and `title` in JavaScript event handlers to accurately reflect the next state/action available to the user.

## 2025-05-18 - Tab Navigation Emoji Spacing
**Learning:** Inline emojis in navigation tab labels can crowd adjacent text depending on platform font rendering, making tab items feel cluttered.
**Action:** Wrap tab icon emojis in container spans with explicit margin (`margin-right: 4px`) to preserve consistent visual hierarchy across platforms.

## 2025-05-18 - Primary Action Button Hover Transitions
**Learning:** Solid action buttons without hover color transitions feel unresponsive to mouse input.
**Action:** Add subtle background color hover states (`#1d4ed8`) and explicit CSS `transition` rules on primary action buttons (`#ndBtn`, `#tmBtn`, `.csend`) to provide immediate visual feedback.

## 2026-08-30 - WAI-ARIA Tab Navigation Keyboard Pattern
**Learning:** Custom `div`-based navigation tabs without WAI-ARIA roles (`role="tablist"`, `role="tab"`, `role="tabpanel"`) and roving `tabindex` are unrecognized by screen readers as tab controls and unnavigable for keyboard users.
**Action:** Set `role="tablist"` on container, `role="tab"`, `aria-controls`, `aria-selected`, and `tabindex="0"` on active tab (`-1` on inactive), handle `Enter` and `Space` keypress events in JavaScript, and define `.tab:focus-visible` outline styles.
