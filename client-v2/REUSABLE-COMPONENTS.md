# CoreBIQ reusable components

All authenticated modules use the same shared shell.

## Reusable files
- `components/app-shell.html`: shared header, slide-out sidebar, client profile footer, bottom navigation and toast.
- `js/components.js`: mounts the shared HTML component, handles swipe/open/close navigation, marks active navigation, validates the Firebase session and exposes the authenticated client session.
- `css/components.css`: shared active states and mount styling.
- `css/app.css` and other CSS files: global design system.
- `js/compliance-data.js`: reusable Firestore compliance fetch, status helpers, currency formatting and HTML escaping.
- `js/upi-payment.js`: reusable UPI payment request, QR modal, copy-link and modal-close behaviour.

## How it works
Each standalone page contains `<div id="appShellMount"></div>` and imports its own page module. The page module calls `mountShell("page-key")`; shared header/sidebar/bottom-nav markup is fetched from `components/app-shell.html` and injected into that mount. Page-specific content and logic stay in each module's own HTML and JS file.

Because `fetch()` is used, run through localhost or HTTPS hosting; do not open pages via `file://`.

## Add a reusable component
1. Create its markup under `components/`.
2. Add shared behaviour in `js/components.js` or a dedicated JS module.
3. Add styling to `css/components.css` or a dedicated component CSS file.
4. Add a mount point in the target page and call `loadComponent(targetId, "components/your-component.html")`.

## Payment safety
UPI QR creation only starts a payment request; it does not verify payment. Do not update compliance status to paid from the browser without a trusted verification flow.
