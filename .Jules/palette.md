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

## 2026-09-03 - Search Suggestion Dropdown Keyboard Navigation & ARIA
**Learning:** Custom autocomplete and search suggestion dropdowns constructed with `<div>` elements are invisible to screen readers and inaccessible to keyboard users unless explicitly decorated with `role="listbox"` on the dropdown container and `role="option"`, `tabindex="0"`, and `aria-label` on individual suggestions. Furthermore, keyboard users expect `Escape` to dismiss the dropdown and `ArrowDown`/`ArrowUp` to navigate suggestions.
**Action:** Always render search suggestion items with `role="option"` and `tabindex="0"`, and attach keyboard event handlers for `Escape` dismissal, `ArrowDown`/`ArrowUp` focus traversal, and `Enter`/`Space` option selection.
