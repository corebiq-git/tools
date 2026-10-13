import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  limit
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
  firebaseConfig
} from "./firebase-config.js";

// --------------------------------------------------
// INITIALIZE FIREBASE
// --------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);

let currentUser = null;
let currentClient = null;

// --------------------------------------------------
// SIDEBAR: OPEN, CLOSE, SWIPE
// --------------------------------------------------

const sidebar = $("sidebar");
const overlay = $("menuOverlay");
const openButton = $("menuOpen");

function setMenu(open) {
  if (!sidebar || !overlay || !openButton) return;

  sidebar.classList.toggle("is-open", open);
  overlay.classList.toggle("is-open", open);

  sidebar.setAttribute("aria-hidden", String(!open));
  openButton.setAttribute("aria-expanded", String(open));

  document.body.style.overflow = open ? "hidden" : "";
}

openButton?.addEventListener("click", () => setMenu(true));
$("menuClose")?.addEventListener("click", () => setMenu(false));
overlay?.addEventListener("click", () => setMenu(false));

document.addEventListener("keydown", event => {
  if (event.key === "Escape") setMenu(false);
});

let touchStart = null;

document.addEventListener("touchstart", event => {
  if (event.touches.length !== 1) return;

  touchStart = {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY
  };
}, { passive: true });

document.addEventListener("touchend", event => {
  if (!touchStart || event.changedTouches.length !== 1) return;

  const dx = event.changedTouches[0].clientX - touchStart.x;
  const dy = event.changedTouches[0].clientY - touchStart.y;

  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.3) {
    if (
      !sidebar?.classList.contains("is-open") &&
      touchStart.x < 28 &&
      dx > 0
    ) {
      setMenu(true);
    } else if (
      sidebar?.classList.contains("is-open") &&
      dx < 0
    ) {
      setMenu(false);
    }
  }

  touchStart = null;
}, { passive: true });

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  // Restart the hide timer without requiring a global timer variable.
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3000);
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function isCompleted(status) {
  return ["completed", "complete", "filed", "done"]
    .includes(String(status || "").trim().toLowerCase());
}

function statusClass(status) {
  const value = String(status || "pending").toLowerCase();

  if (isCompleted(value)) return "cb-chip--success";

  if (
    value.includes("overdue") ||
    value.includes("rejected") ||
    value.includes("late")
  ) {
    return "cb-chip--danger";
  }

  return "cb-chip--warning";
}

// --------------------------------------------------
// FIND CLIENT BY AUTHENTICATED EMAIL
// --------------------------------------------------

async function findClientByEmail(email) {
  if (!email) return null;

  const normalizedEmail = email.trim().toLowerCase();

  const clientQuery = query(
    collection(db, "clients"),
    where("clientEmail", "==", normalizedEmail),
    limit(2)
  );

  const snapshot = await getDocs(clientQuery);

  if (snapshot.empty) return null;

  if (snapshot.size > 1) {
    throw new Error(
      "Multiple client records use this email. Contact your administrator."
    );
  }

  const document = snapshot.docs[0];

  return {
    id: document.id,
    ...document.data()
  };
}

// --------------------------------------------------
// LOAD COMPLIANCE FROM YOUR FIRESTORE COLLECTION
//
// Collection: compliance
// Fields:
// clientId, complianceName, dueDate, fee, period, status
// --------------------------------------------------

async function loadClientCompliance(clientId) {
  const container = $("complianceContent");

  if (!container) {
    console.error("Missing #complianceContent in dashboard.html");
    return;
  }

  container.className = "cb-empty";
  container.innerHTML = "<p>Loading your compliance tasks...</p>";

  try {
    const complianceQuery = query(
      collection(db, "compliance"),
      where("clientId", "==", clientId)
    );

    const snapshot = await getDocs(complianceQuery);

    const items = snapshot.docs.map(document => ({
      id: document.id,
      ...document.data()
    }));

    // Sort by due date, earliest first.
    items.sort((a, b) =>
      String(a.dueDate || "9999-12-31")
        .localeCompare(String(b.dueDate || "9999-12-31"))
    );

    renderCompliance(items);

    setText("complianceCount", items.length);

    const pending = items.filter(item =>
      !isCompleted(item.status)
    ).length;

    setText("pendingCount", pending);

  } catch (error) {
    console.error("Compliance loading failed:", error);

    container.className = "cb-empty";
    container.innerHTML = `
      <h3>Unable to load compliance</h3>
      <p>Check your Firestore security rules and the client ID mapping.</p>
    `;

    showToast("Could not load compliance tasks.");
  }
}

// --------------------------------------------------
// RENDER COMPLIANCE TABLE
// --------------------------------------------------

function renderCompliance(items) {
  const container = $("complianceContent");
  if (!container) return;

  if (!items.length) {
    container.className = "cb-empty";
    container.innerHTML = `
      <h3>No compliance tasks assigned yet</h3>
      <p>Your compliance tasks will appear here when assigned.</p>
    `;
    return;
  }

  container.className = "cb-table-wrap";

  const rows = items.map(item => {
    const name = escapeHtml(item.complianceName || "Compliance");
    const period = escapeHtml(item.period || "—");
    const dueDate = escapeHtml(item.dueDate || "—");
    const fee = escapeHtml(item.fee ?? "0");
    const status = escapeHtml(item.status || "pending");
    const badgeClass = statusClass(item.status);

    return `
      <tr>
        <td>${name}</td>
        <td>${period}</td>
        <td>${dueDate}</td>
        <td>₹${fee}</td>
        <td>
          <span class="cb-chip ${badgeClass}">
            ${status}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <table class="cb-table">
      <thead>
        <tr>
          <th>Compliance</th>
          <th>Period</th>
          <th>Due date</th>
          <th>Fee (₹)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// --------------------------------------------------
// LOAD CLIENT DOCUMENTS
//
// Expects an array named "documents" on the client
// document. Each item may contain name and url.
// --------------------------------------------------

function safeDocumentUrl(value) {
  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (_) {}

  return "";
}

function renderDocuments(documents) {
  const container = $("documentsContent");
  if (!container) return;

  if (!Array.isArray(documents) || documents.length === 0) {
    container.className = "cb-empty";
    container.innerHTML = `
      <h3>No documents available</h3>
      <p>Documents shared with you will appear here.</p>
    `;
    setText("documentCount", 0);
    return;
  }

  setText("documentCount", documents.length);
  container.className = "cb-table-wrap";

  const rows = documents.map(document => {
    const name = escapeHtml(
      document.name || document.title || "Document"
    );

    const url = safeDocumentUrl(
      document.url || document.downloadURL || ""
    );

    const access = url
      ? `<a class="cb-link"
            href="${escapeHtml(url)}"
            target="_blank"
            rel="noopener noreferrer">Open document</a>`
      : "Not available";

    return `<tr><td>${name}</td><td>${access}</td></tr>`;
  }).join("");

  container.innerHTML = `
    <table class="cb-table">
      <thead>
        <tr>
          <th>Document</th>
          <th>Access</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// --------------------------------------------------
// LOAD THE AUTHENTICATED CLIENT DASHBOARD
// --------------------------------------------------

async function loadDashboard() {
  if (!currentUser) return;

  try {
    const client = await findClientByEmail(currentUser.email);

    if (!client) {
      await signOut(auth);
      location.replace("index.html");
      return;
    }

    currentClient = client;

    const clientName =
      client.clientName ||
      client.businessName ||
      client.name ||
      currentUser.email;

    setText("clientName", clientName);
    setText("clientEmail", currentUser.email);

    const initials = clientName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();

    setText("avatarInitials", initials || "CB");

    // IMPORTANT:
    // Your compliance documents contain clientId: "C40001".
    // If the Firestore clients document ID is also C40001,
    // client.id is correct. Otherwise, resolve the actual
    // client ID field from the client record.
    const clientId = client.clientId || client.id;

    await Promise.all([
      loadClientCompliance(clientId),
      Promise.resolve().then(() => {
        renderDocuments(
          Array.isArray(client.documents) ? client.documents : []
        );
      })
    ]);

  } catch (error) {
    console.error("Dashboard loading failed:", error);

    showToast(
      "Dashboard could not load. Check Firebase configuration and Firestore rules."
    );
  }
}

// --------------------------------------------------
// SIGN OUT AND REFRESH ACTIONS
// --------------------------------------------------

async function logout() {
  try {
    await signOut(auth);
    location.replace("index.html");
  } catch (error) {
    console.error("Sign-out failed:", error);
    showToast("Could not sign out. Please try again.");
  }
}

$("sidebarSignOut")?.addEventListener("click", logout);
$("profileButton")?.addEventListener("click", () => setMenu(true));
$("bottomProfile")?.addEventListener("click", () => setMenu(true));

$("refreshButton")?.addEventListener("click", loadDashboard);
$("reloadCompliance")?.addEventListener("click", async () => {
  if (currentClient) {
    await loadClientCompliance(
      currentClient.clientId || currentClient.id
    );
  }
});

// --------------------------------------------------
// AUTHENTICATION GUARD
// --------------------------------------------------

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.replace("index.html");
    return;
  }

  currentUser = user;
  await loadDashboard();
});

// Initialize Lucide icons if the CDN is available.
if (window.lucide) {
  window.lucide.createIcons();
}
