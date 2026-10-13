import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth,onAuthStateChanged,signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore,collection,query,where,getDocs,limit } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const sidebar=$("sidebar"),overlay=$("menuOverlay"),openBtn=$("menuOpen");
function menu(open){sidebar.classList.toggle("is-open",open);overlay.classList.toggle("is-open",open);sidebar.setAttribute("aria-hidden",String(!open));openBtn.setAttribute("aria-expanded",String(open));document.body.style.overflow=open?"hidden":"";}
openBtn.onclick=()=>menu(true);$("menuClose").onclick=()=>menu(false);overlay.onclick=()=>menu(false);document.onkeydown=e=>{if(e.key==="Escape")menu(false)};
let start=null;document.addEventListener("touchstart",e=>{if(e.touches.length===1)start={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});document.addEventListener("touchend",e=>{if(!start||!e.changedTouches.length)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.3){if(!sidebar.classList.contains("is-open")&&start.x<28&&dx>0)menu(true);else if(sidebar.classList.contains("is-open")&&dx<0)menu(false);}start=null;},{passive:true});
async function clientFor(email){const s=await getDocs(query(collection(db,"clients"),where("clientEmail","==",email.toLowerCase()),limit(1)));return s.empty?null:{id:s.docs[0].id,...s.docs[0].data()};}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(items,kind){const root=$(kind==="compliance"?"complianceContent":"documentsContent");if(!items.length){root.className="cb-empty";root.innerHTML=kind==="compliance"?"<h3>No compliance items yet</h3><p>Your service provider has not added tasks to this record.</p>":"<h3>No documents available</h3><p>Documents shared with you will appear here.</p>";return;}root.className="cb-table-wrap";if(kind==="compliance"){root.innerHTML="<table class='cb-table'><thead><tr><th>Item</th><th>Due date</th><th>Status</th></tr></thead><tbody>"+items.map(x=>{const st=String(x.status||"Pending"),cls=/complete|filed|done/i.test(st)?"success":/overdue|late/i.test(st)?"danger":"warning";return `<tr><td>${esc(x.title||x.name||x.service||"Compliance item")}</td><td>${esc(x.dueDate||x.due||"—")}</td><td><span class="cb-chip cb-chip--${cls}">${esc(st)}</span></td></tr>`}).join("")+"</tbody></table>";}else{root.innerHTML="<table class='cb-table'><thead><tr><th>Document</th><th>Access</th></tr></thead><tbody>"+items.map(x=>{let u="";try{const z=new URL(x.url||x.downloadURL||"");if(["https:","http:"].includes(z.protocol))u=esc(z.href);}catch{}return `<tr><td>${esc(x.name||x.title||"Document")}</td><td>${u?`<a class="cb-link" href="${u}" target="_blank" rel="noopener noreferrer">Open document</a>`:"Not available"}</td></tr>`}).join("")+"</tbody></table>";}}
async function load(){const user=auth.currentUser;if(!user)return;try{const c=await clientFor(user.email||"");if(!c){await signOut(auth);location.replace("index.html");return;}const name=c.clientName||c.name||c.businessName||user.email;const compliance=Array.isArray(c.compliance)?c.compliance:[],docs=Array.isArray(c.documents)?c.documents:[];$("clientName").textContent=name;$("clientEmail").textContent=user.email;$("avatarInitials").textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();$("complianceCount").textContent=compliance.length;$("pendingCount").textContent=compliance.filter(x=>!["completed","complete","filed","done"].includes(String(x.status||"").toLowerCase())).length;$("documentCount").textContent=docs.length;render(compliance,"compliance");render(docs,"documents");}catch(e){$("complianceContent").textContent="Could not load client data. Check Firestore rules and fields.";}}
async function logout(){await signOut(auth);location.replace("index.html");}
$("sidebarSignOut").onclick=logout;$("profileButton").onclick=()=>menu(true);$("bottomProfile").onclick=()=>menu(true);$("refreshButton").onclick=load;$("reloadCompliance").onclick=load;
onAuthStateChanged(auth,user=>{if(!user){location.replace("index.html");return;}load();});
if(window.lucide)window.lucide.createIcons();
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

async function loadCompliance(db, clientId) {
  const q = query(
    collection(db, "compliance"),
    where("clientId", "==", clientId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
function renderCompliance(items) {
  const container = document.getElementById("complianceContent");

  if (!items.length) {
    container.innerHTML = "<p>No compliance tasks assigned yet.</p>";
    return;
  }

  container.innerHTML = `
    <div class="cb-table-wrap">
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
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.complianceName || "")}</td>
              <td>${escapeHtml(item.period || "")}</td>
              <td>${escapeHtml(item.dueDate || "")}</td>
              <td>₹${escapeHtml(item.fee || "0")}</td>
              <td>
                <span class="cb-chip ${
                  item.status === "completed"
                    ? "cb-chip--success"
                    : "cb-chip--warning"
                }">
                  ${escapeHtml(item.status || "pending")}
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
