import { db } from "./firebase-init.js";
import {
  collection, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const grid = document.getElementById("galleryGrid");
const filtersWrap = document.getElementById("galleryFilters");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxCap = document.getElementById("lightboxCap");
const lightboxClose = document.getElementById("lightboxClose");

let allItems = [];
let activeFilter = "All";

function renderFilters() {
  const cats = ["All", ...new Set(allItems.map(i => i.category).filter(Boolean))];
  filtersWrap.innerHTML = cats.map(c =>
    `<button class="gfilter ${c === activeFilter ? "active" : ""}" data-cat="${c}">${c}</button>`
  ).join("");
  filtersWrap.querySelectorAll(".gfilter").forEach(btn => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.cat;
      renderFilters();
      renderGrid();
    });
  });
}

function renderGrid() {
  const items = activeFilter === "All" ? allItems : allItems.filter(i => i.category === activeFilter);

  if (items.length === 0) {
    grid.innerHTML = `<div class="gm-empty">No photos in this category yet — check back soon.</div>`;
    return;
  }

  grid.innerHTML = items.map((item, idx) => `
    <div class="gm-item" data-idx="${idx}" data-cat="${item.category || ""}">
      <img src="${item.url}" alt="${escapeHtml(item.caption || "Shahi Darbar")}" loading="lazy">
      <div class="gm-cap">${escapeHtml(item.caption || "")}</div>
    </div>
  `).join("");

  grid.querySelectorAll(".gm-item").forEach(el => {
    el.addEventListener("click", () => openLightbox(items[+el.dataset.idx]));
  });

  // re-run reveal animation for new nodes
  requestAnimationFrame(() => {
    grid.querySelectorAll(".gm-item").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), i * 40);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function openLightbox(item) {
  lightboxImg.src = item.url;
  lightboxImg.alt = item.caption || "Shahi Darbar";
  lightboxCap.textContent = item.caption || "";
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}
lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

/* -------- live data from Firestore -------- */
const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderFilters();
  renderGrid();
}, (err) => {
  console.error(err);
  grid.innerHTML = `<div class="gm-empty">Couldn't load the gallery. If you haven't connected Firebase yet, see SETUP-GUIDE.md.</div>`;
});
