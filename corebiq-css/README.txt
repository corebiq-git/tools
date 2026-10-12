CoreBIQ Master CSS Design System
================================

Contents:
- css/tokens.css       Brand colours, typography tokens, spacing, radii and shadows
- css/base.css         Global reset and layout foundation
- css/typography.css   Headings, body text, labels and helper text
- css/buttons.css      Button variants, icon buttons, focus/disabled/loading states
- css/forms.css        Inputs, selects, textarea, checkbox, radio, switch, validation and file drop
- css/icons.css       Icon sizing and icon tiles (Lucide SVGs)
- css/cards.css        Cards, statistics, grids and empty states
- css/navigation.css   Header, slide-out sidebar, overlay, profile and fixed bottom nav
- css/tables.css       Tables, status chips, toolbar and pagination
- css/dialogs.css      Dialogs, alerts, toasts, progress, skeletons and tooltips
- css/utilities.css    Spacing, layout and helper classes
- css/responsive.css   Mobile/tablet/desktop breakpoints and reduced motion
- css/app.css          Imports all stylesheets
- components.html      Interactive component gallery and sidebar demo

Use in any HTML page:
<link rel="stylesheet" href="css/app.css">

Icon library:
The demo uses Lucide from a CDN and requires internet access. Production apps can bundle Lucide locally.
For icons, use:
<i data-lucide="search" class="cb-icon"></i>
Then run:
lucide.createIcons();

Sidebar demo:
- Closed by default
- Menu button opens
- Overlay and close button close it
- Escape closes it
- Swipe right from left edge opens
- Swipe left closes it
- Sidebar scrolls independently
- Bottom nav: Home, GST, Utilities, Invoices

CSS alone cannot implement navigation or interaction. The demo JavaScript implements the sidebar interactions. Connect menu items and bottom-nav hrefs to your actual HTML pages.

Brand tokens are in css/tokens.css. Update those tokens once to change the whole design system.
