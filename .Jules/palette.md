## 2025-05-27 - Toast Accessibility
**Learning:** Dynamic toast notifications are frequently missed by screen readers if they lack `role="alert"` or `role="status"`.
**Action:** Ensure all toast containers include `role`, `aria-live`, and `aria-atomic` attributes.
