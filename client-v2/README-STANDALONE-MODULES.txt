CoreBIQ Compliance portal — standalone modules

Pages: dashboard.html, compliance.html, documents.html, payments.html, account.html. Each page is standalone HTML and shares CSS and JS utilities. Existing index.html remains the sign-in/signup page.

Firebase config: js/firebase-config.js. Client email is matched against clients.clientEmail. Compliance records are read from collection `compliance` using `clientId` matching client.clientId when present, otherwise client document ID. Fields: complianceName, dueDate, fee, period, status.

UPI payments: Pending tasks with a positive fee display Pay now/Generate QR. QR URI uses pa=accountree@upi, pn=Accountree, amount in INR and a note containing compliance/period/client. QR generation is a payment request only; it does not verify a successful payment or update Firestore. Do not mark paid without trusted payment verification.

CDN requirements: internet access for Outfit, Lucide and QRCode.js. Serve via HTTPS or localhost, not file://. Keep Firestore rules restrictive and test client-specific access.
