CoreBIQ Compliance Client Portal
================================
Pages:
- index.html: Firebase email/password sign-in, signup, password reset
- dashboard.html: client compliance dashboard
- css/app.css: imports the shared CoreBIQ CSS design system
- css/auth.css and css/dashboard.css: page-specific styles
- js/firebase-config.js: add your Firebase web config
- js/auth.js: Firebase Auth and Firestore client email matching
- js/dashboard.js: auth guard and dashboard data
- firestore.rules.example: example rules; review before production

Expected Firestore data:
clients/{docId}
  clientEmail: "client@example.com"   REQUIRED; store lowercase
  clientName: "Client Name"           optional
  businessName: "Business Name"       optional
  compliance: [{ title, dueDate, status }] optional array
  documents: [{ name, url }] optional array

How access works:
1. Enable Email/Password in Firebase Authentication.
2. Paste Firebase web config into js/firebase-config.js.
3. Sign-in/signup uses Firebase Authentication.
4. The app queries collection "clients" for clientEmail matching the signed-in email.
5. Dashboard is accessible only when a matching client record exists.
6. Client users cannot write client registry records.

New signup is allowed by Auth, but if the email is not yet present in clients, the user is signed out and cannot access the dashboard. Add client records through trusted admin tools only.
Use HTTPS or localhost (not file://) because the app uses JavaScript modules.
Dashboard currently expects compliance and documents as arrays on the client document. Adjust js/dashboard.js if your schema uses subcollections.
This is a starter portal; payment gateway, document upload, email notifications, and admin workflows are not included.
