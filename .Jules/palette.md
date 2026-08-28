# Palette's Journal - UX & Accessibility Learnings

## 2025-05-18 - Dynamic ARIA Labels for State-Toggling Icon Buttons
**Learning:** Icon-only buttons (such as theme toggles or chat send buttons) are inaccessible to screen readers without `aria-label` and `title` attributes. When state changes (e.g., toggling dark/light mode), static labels become inaccurate and confusing.
**Action:** Always provide initial `aria-label` and `title` attributes on icon-only buttons in HTML, and dynamically update `aria-label` and `title` in JavaScript event handlers to accurately reflect the next state/action available to the user.

## 2025-05-18 - Tab Navigation Hover States
**Learning:** Inactive navigation tab buttons with faint text colors lack visual feedback on mouse hover if hover rules are missing, making interactive areas feel static.
**Action:** Ensure all navigation tabs have distinct `:hover` text color states for both dark and light themes while preserving active indicator styles.
