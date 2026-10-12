# Install on Android

This project can be installed from Android Chrome as a Progressive Web App (PWA). It uses the existing Express server for GST processing; the app and its API must be deployed together.

## Deploy

1. Host the Node.js app behind HTTPS. Android requires a secure origin to install a PWA; plain HTTP works only for local development.
2. Configure the host or reverse proxy to forward requests to the Express app and retain the app's writable storage for uploaded and generated files.
3. Restrict access to the hosted service. The existing Express routes do not provide user authentication or per-user data isolation, so do not expose this app to the public internet without adding appropriate access controls.

## Install

1. Open the deployed HTTPS address in Chrome on the Android phone.
2. Open Chrome's menu and choose **Install app** or **Add to Home screen**.
3. Launch **GST Offline** from the home screen. An internet connection to the hosted service is required for GST workflows.

The service worker caches only a connection-required fallback page. GST pages, files, API responses, and other user data are not cached. This provides an Android home-screen installation, not a Play Store APK.
