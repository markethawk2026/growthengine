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

## 2025-05-18 - Full WAI-ARIA Tab Navigation & Arrow Key Support
**Learning:** Navigation tabs structured as a `tablist` require `aria-controls` on tab buttons and `aria-labelledby` on `tabpanel` containers. Implementing a roving `tabindex` (`0` for active, `-1` for inactive) along with `ArrowLeft`, `ArrowRight`, `Home`, and `End` key listeners enables seamless keyboard navigation without requiring repetitive Tab key presses across all items.
**Action:** Always link tabs to page panels with explicit ARIA control attributes, maintain roving `tabindex`, and bind arrow keys on `role="tablist"` elements for full WAI-ARIA accessibility compliance.
