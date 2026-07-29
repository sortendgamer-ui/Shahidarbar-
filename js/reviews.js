import { auth, db } from "./firebase-init.js";
import { showToast, waitForAuth, getUserDoc } from "./auth.js";
import {
  collection, query, orderBy, onSnapshot, doc, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MAX_REVIEWS_PER_USER = 10;

const listEl = document.getElementById("reviewList");
const summaryEl = document.getElementById("reviewSummary");
const writeWrap = document.getElementById("reviewWriteWrap");
const lockedWrap = document.getElementById("reviewLockedWrap");
const form = document.getElementById("reviewForm");
const starPicker = document.getElementById("starPicker");
const ratingInput = document.getElementById("ratingInput");
const reviewText = document.getElementById("reviewText");
const submitBtn = document.getElementById("reviewSubmitBtn");
const formMsg = document.getElementById("reviewFormMsg");

let allReviews = [];
let currentUser = null;
let currentUserData = null;

/* ---------------- star picker widget ---------------- */
const STAR_SVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`;
function buildStarPicker() {
  starPicker.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.value = i;
    btn.innerHTML = STAR_SVG;
    starPicker.appendChild(btn);
  }
  const buttons = [...starPicker.querySelectorAll("button")];

  function paint(value) {
    buttons.forEach(b => b.classList.toggle("active", +b.dataset.value <= value));
  }
  buttons.forEach(b => {
    b.addEventListener("mouseenter", () => {
      starPicker.classList.add("hovering");
      buttons.forEach(x => x.classList.toggle("pre-active", +x.dataset.value <= +b.dataset.value));
    });
    b.addEventListener("mouseleave", () => {
      starPicker.classList.remove("hovering");
      buttons.forEach(x => x.classList.remove("pre-active"));
    });
    b.addEventListener("click", () => {
      ratingInput.value = b.dataset.value;
      paint(+b.dataset.value);
    });
  });
}
buildStarPicker();

function starsDisplay(rating) {
  const r = Math.round(rating);
  let out = "";
  for (let i = 1; i <= 5; i++) out += i <= r ? "★" : `<span class="empty">★</span>`;
  return out;
}

/* ---------------- rendering ---------------- */
function renderSummary() {
  const total = allReviews.length;
  if (total === 0) {
    summaryEl.innerHTML = `
      <div class="rs-score">
        <div class="num">—</div>
        <div class="star-display">${starsDisplay(0)}</div>
        <div class="count">No reviews yet</div>
      </div>
      <div class="rs-bars">
        ${[5,4,3,2,1].map(n => `
          <div class="rs-bar-row"><span>${n}★</span><div class="track"><div class="fill" style="width:0%"></div></div><span>0</span></div>
        `).join("")}
      </div>`;
    return;
  }
  const avg = allReviews.reduce((s, r) => s + r.rating, 0) / total;
  const counts = [5,4,3,2,1].map(n => allReviews.filter(r => r.rating === n).length);

  summaryEl.innerHTML = `
    <div class="rs-score">
      <div class="num">${avg.toFixed(1)}</div>
      <div class="star-display">${starsDisplay(avg)}</div>
      <div class="count">${total} review${total !== 1 ? "s" : ""}</div>
    </div>
    <div class="rs-bars">
      ${[5,4,3,2,1].map((n, i) => `
        <div class="rs-bar-row">
          <span>${n}★</span>
          <div class="track"><div class="fill" style="width:${total ? (counts[i]/total*100) : 0}%"></div></div>
          <span>${counts[i]}</span>
        </div>
      `).join("")}
    </div>`;
}

function formatDate(ts) {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderList() {
  if (allReviews.length === 0) {
    listEl.innerHTML = `<div class="review-empty">Be the first to share your experience at Shahi Darbar.</div>`;
    return;
  }
  const isAdmin = !!currentUserData?.isAdmin;

  listEl.innerHTML = allReviews.map(r => `
    <div class="review-card">
      <div class="rc-top">
        <div class="rc-user">
          <div class="user-avatar">${(r.username || "?").charAt(0).toUpperCase()}</div>
          <div>
            <div class="rc-name">${escapeHtml(r.username || "Guest")}</div>
            <div class="rc-date">${formatDate(r.createdAt)}</div>
          </div>
        </div>
        <div class="star-display">${starsDisplay(r.rating)}</div>
      </div>
      <p class="rc-text">${escapeHtml(r.text)}</p>
      ${isAdmin ? `<div style="margin-top:0.9rem; text-align:right;"><button class="rc-del" data-id="${r.id}" data-uid="${r.uid}">Remove (admin)</button></div>` : ""}
    </div>
  `).join("");

  if (isAdmin) {
    listEl.querySelectorAll(".rc-del").forEach(btn => {
      btn.addEventListener("click", () => adminDeleteReview(btn.dataset.id, btn.dataset.uid));
    });
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

async function adminDeleteReview(reviewId, ownerUid) {
  if (!confirm("Remove this review?")) return;
  try {
    const { deleteDoc, doc: fsDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await deleteDoc(fsDoc(db, "reviews", reviewId));
    await updateDoc(fsDoc(db, "users", ownerUid), { reviewCount: increment(-1) });
    showToast("Review removed.", "success");
  } catch (err) {
    showToast(err.message || "Could not remove review.", "error");
  }
}

/* ---------------- write-review gating ---------------- */
async function refreshWriteAccess() {
  currentUser = auth.currentUser;
  if (!currentUser) {
    writeWrap.style.display = "none";
    lockedWrap.style.display = "block";
    lockedWrap.innerHTML = `
      <p>Sign in to share your experience with a rating and a short note.</p>
      <a href="login.html?redirect=reviews.html" class="btn btn-primary">Login / Register to Review</a>`;
    return;
  }
  currentUserData = await getUserDoc(currentUser.uid, { force: true });
  const count = currentUserData?.reviewCount || 0;

  if (count >= MAX_REVIEWS_PER_USER) {
    writeWrap.style.display = "none";
    lockedWrap.style.display = "block";
    lockedWrap.innerHTML = `<p>You've shared ${MAX_REVIEWS_PER_USER} reviews with us already — thank you for all your feedback!</p>`;
    return;
  }

  writeWrap.style.display = "block";
  lockedWrap.style.display = "none";
  renderList(); // refresh admin delete buttons visibility
}

/* ---------------- submit ---------------- */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  formMsg.classList.remove("show", "error", "success");

  const rating = +ratingInput.value;
  const text = reviewText.value.trim();

  if (!rating) { showFormMsg("Please select a star rating.", "error"); return; }
  if (text.length < 5) { showFormMsg("Please write a short description (at least 5 characters).", "error"); return; }
  if (!currentUser) { showFormMsg("Please log in first.", "error"); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const userRef = doc(db, "users", currentUser.uid);
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      const count = userSnap.data()?.reviewCount || 0;
      if (count >= MAX_REVIEWS_PER_USER) {
        throw new Error(`You've reached the limit of ${MAX_REVIEWS_PER_USER} reviews.`);
      }
      const reviewRef = doc(collection(db, "reviews"));
      tx.set(reviewRef, {
        uid: currentUser.uid,
        username: userSnap.data()?.username || currentUser.displayName || "Guest",
        rating,
        text,
        createdAt: serverTimestamp()
      });
      tx.update(userRef, { reviewCount: count + 1 });
    });

    showFormMsg("Thank you — your review has been posted!", "success");
    showToast("Review submitted. Thank you!", "success");
    form.reset();
    ratingInput.value = "0";
    starPicker.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    await refreshWriteAccess();
  } catch (err) {
    showFormMsg(err.message || "Something went wrong. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Post Review";
  }
});

function showFormMsg(msg, type) {
  formMsg.textContent = msg;
  formMsg.className = `form-msg show ${type}`;
}

/* ---------------- live data ---------------- */
const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  allReviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSummary();
  renderList();
}, (err) => {
  console.error(err);
  listEl.innerHTML = `<div class="review-empty">Couldn't load reviews. If you haven't connected Firebase yet, see SETUP-GUIDE.md.</div>`;
});

waitForAuth().then(refreshWriteAccess);
auth.onAuthStateChanged(() => refreshWriteAccess());
