import { db } from "./firebase-init.js";
import { initNavAuth } from "./auth.js";
import {
  collection, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

initNavAuth();

const track = document.getElementById("homeTestimonials");
if (track) {
  const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(6));
  onSnapshot(q, (snap) => {
    if (snap.empty) return; // keep the static fallback cards already in the HTML
    const reviews = snap.docs.map(d => d.data());
    track.innerHTML = reviews.map(r => `
      <div class="t-card">
        <div class="t-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
        <p class="t-quote">${escapeHtml(r.text)}</p>
        <div class="t-name">${escapeHtml(r.username || "Guest")}</div>
        <div class="t-role">Verified Guest</div>
      </div>
    `).join("");
  }, () => { /* silently keep static fallback if Firebase isn't connected yet */ });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}
