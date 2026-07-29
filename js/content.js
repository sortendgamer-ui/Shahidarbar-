import { db } from "./firebase-init.js";
import {
  doc, getDoc, collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- site text (hero / about / contact / banquet) ---------------- */
async function loadSiteContent() {
  try {
    const snap = await getDoc(doc(db, "content", "site"));
    if (!snap.exists()) return; // keep static fallback text already in the HTML
    const c = snap.data();

    setText("heroSubtitle", c.heroSubtitle);
    setText("aboutPara1", c.aboutPara1);
    setText("aboutPara2", c.aboutPara2);
    setText("banquetText", c.banquetText);

    setText("ctAddress", c.address);
    setText("ctHours", c.hours);

    if (c.phone1) { setText("ctPhone1", c.phone1); setHref("ctPhone1", `tel:+91${digitsOnly(c.phone1)}`); }
    if (c.phone2) { setText("ctPhone2", c.phone2); setHref("ctPhone2", `tel:+91${digitsOnly(c.phone2)}`); }
    if (c.whatsapp) { setText("ctWhatsapp", c.whatsapp); setHref("ctWhatsapp", `https://wa.me/91${digitsOnly(c.whatsapp)}`); }
    if (c.email) { setText("ctEmail", c.email); setHref("ctEmail", `mailto:${c.email}`); }
  } catch (err) {
    console.warn("Site content not loaded (using defaults):", err.message);
  }
}

function digitsOnly(str) { return (str || "").replace(/\D/g, ""); }
function setText(id, value) {
  if (value === undefined || value === null || value === "") return;
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setHref(id, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute("href", value);
}

/* ---------------- menu items ---------------- */
function renderMenu(items) {
  const grid = document.getElementById("menuGrid");
  if (!grid || items.length === 0) return; // keep static fallback menu

  const half = Math.ceil(items.length / 2);
  const colA = items.slice(0, half);
  const colB = items.slice(half);

  const rowHtml = (item) => `
    <div class="menu-row">
      <div>
        <div class="m-name">${escapeHtml(item.name)}</div>
        ${item.desc ? `<div class="m-desc">${escapeHtml(item.desc)}</div>` : ""}
      </div>
    </div>`;

  grid.innerHTML = `
    <div class="menu-col reveal in">${colA.map(rowHtml).join("")}</div>
    <div class="menu-col reveal in">${colB.map(rowHtml).join("")}</div>
  `;
}
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function loadMenu() {
  const q = query(collection(db, "menu"), orderBy("order", "asc"));
  onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => d.data());
    renderMenu(items);
  }, (err) => {
    console.warn("Menu not loaded (using defaults):", err.message);
  });
}

loadSiteContent();
loadMenu();
