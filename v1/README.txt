CorbiQ Tools — responsive multi-page starter
=============================================

Files:
- index.html       Dashboard, no sidebar
- gstr1.html       GST Tools / GSTR-1 starter workspace
- calc.html        Working calculator
- qr.html          QR generator (QRCode.js CDN required)
- html-viewer.html Sandboxed HTML preview
- invoice.html     Invoice generator with print / Save as PDF
- style.css        Shared responsive styles

Navigation:
Bottom nav has Home + 3 main modules: GST, Utilities, Invoices.
Each tool is a separate page. QR Maker is qr.html and Calculator is calc.html.

Deploy:
Upload all files preserving their names and folder structure to the same directory on GitHub Pages or your Hostinger web root. Open index.html.

Important:
The GSTR-1 page is a starter CSV import/preview/export workspace. It does not yet implement the official GST offline-tool JSON schema. Validate invoice tax details before issuing. QR generation requires internet access to load QRCode.js from CDN.
