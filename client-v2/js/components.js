import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const $ = id => document.getElementById(id);

export async function loadComponent(targetId, path) {
  const target = $(targetId);
  if (!target) return;
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load component: ${path}`);
  target.innerHTML = await response.text();
}

export function initNavigation(activePage) {
  const sidebar = $("sidebar"), overlay = $("menuOverlay"), open = $("menuOpen");
  const setMenu = value => {
    if (!sidebar || !overlay || !open) return;
    sidebar.classList.toggle("is-open", value);
    overlay.classList.toggle("is-open", value);
    sidebar.setAttribute("aria-hidden", String(!value));
    open.setAttribute("aria-expanded", String(value));
    document.body.style.overflow = value ? "hidden" : "";
  };
  open?.addEventListener("click", () => setMenu(true));
  $("menuClose")?.addEventListener("click", () => setMenu(false));
  overlay?.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  let start = null;
  document.addEventListener("touchstart", e => {
    if (e.touches.length === 1) start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  document.addEventListener("touchend", e => {
    if (!start || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      if (!sidebar?.classList.contains("is-open") && start.x < 28 && dx > 0) setMenu(true);
      else if (sidebar?.classList.contains("is-open") && dx < 0) setMenu(false);
    }
    start = null;
  }, { passive: true });

  document.querySelectorAll("[data-nav]").forEach(link => {
    const isActive = link.dataset.nav === activePage;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  $("sidebarSignOut")?.addEventListener("click", async () => {
    await signOut(auth);
    location.replace("index.html");
  });
  $("profileButton")?.addEventListener("click", () => setMenu(true));
}

export async function findClientByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const snap = await getDocs(query(collection(db, "clients"), where("clientEmail", "==", normalized), limit(2)));
  if (snap.empty) return null;
  if (snap.size > 1) throw new Error("Multiple client records use this email.");
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export function startClientSession(activePage) {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async user => {
      if (!user) { location.replace("index.html"); return; }
      try {
        const client = await findClientByEmail(user.email);
        if (!client) { await signOut(auth); location.replace("index.html"); return; }
        const name = client.clientName || client.businessName || client.name || user.email;
        const initials = name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join("").toUpperCase() || "CB";
        ["clientName"].forEach(id => { if ($(id)) $(id).textContent = name; });
        ["clientEmail"].forEach(id => { if ($(id)) $(id).textContent = user.email; });
        ["avatarInitials"].forEach(id => { if ($(id)) $(id).textContent = initials; });
        document.querySelectorAll("[data-client-name]").forEach(el => el.textContent = name);
        document.querySelectorAll("[data-client-email]").forEach(el => el.textContent = user.email);
        const session = { user, client, db, auth };
        window.corebiqSession = session;
        initNavigation(activePage);
        $("refreshButton")?.addEventListener("click", () => window.dispatchEvent(new Event("corebiq:refresh")));
        if (window.lucide) window.lucide.createIcons();
        window.dispatchEvent(new CustomEvent("corebiq:ready", { detail: session }));
        resolve(session);
      } catch (error) { reject(error); }
    });
  });
}

export async function mountShell(activePage) {
  await loadComponent("appShellMount", "components/app-shell.html");
  return startClientSession(activePage);
}
