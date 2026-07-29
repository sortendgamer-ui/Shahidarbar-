import { db } from "./firebase-init.js";
import { showToast, requireAdmin } from "./auth.js";
import {
  collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, increment, getDocs, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const shell = document.getElementById("adminShell");
const deniedView = document.getElementById("accessDenied");

/* ---------------- access guard ---------------- */
const result = await requireAdmin();
if (result === null) {
  // requireAdmin already redirected to login
} else if (!result.isAdmin) {
  shell.style.display = "none";
  deniedView.style.display = "flex";
} else {
  shell.style.display = "grid";
  deniedView.style.display = "none";
  initAdmin();
}

function initAdmin() {
  /* ---------------- side nav switching ---------------- */
  const navItems = document.querySelectorAll(".admin-nav-item");
  const views = document.querySelectorAll(".admin-panel-view");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(n => n.classList.remove("active"));
      views.forEach(v => v.classList.remove("active"));
      item.classList.add("active");
      document.getElementById(item.dataset.view).classList.add("active");
    });
  });

  let galleryItems = [];
  let reviewItems = [];
  let userItems = [];

  /* ---------------- dashboard stats ---------------- */
  function renderStats() {
    document.getElementById("statPhotos").textContent = galleryItems.length;
    document.getElementById("statReviews").textContent = reviewItems.length;
    document.getElementById("statUsers").textContent = userItems.length;
    const avg = reviewItems.length
      ? (reviewItems.reduce((s, r) => s + r.rating, 0) / reviewItems.length).toFixed(1)
      : "—";
    document.getElementById("statAvgRating").textContent = avg;
  }

  /* ---------------- GALLERY MANAGEMENT ---------------- */
  const galleryForm = document.getElementById("galleryForm");
  const galleryTableBody = document.querySelector("#galleryTable tbody");
  const galleryEditId = document.getElementById("galleryEditId");
  const gFormTitle = document.getElementById("galleryFormTitle");
  const gCancelEdit = document.getElementById("galleryCancelEdit");

  function renderGalleryTable() {
    if (galleryItems.length === 0) {
      galleryTableBody.innerHTML = `<tr><td colspan="4" class="dt-empty">No photos yet — add your first one above.</td></tr>`;
      return;
    }
    galleryTableBody.innerHTML = galleryItems.map(item => `
      <tr>
        <td><div class="dt-thumb"><img src="${item.url}" alt=""></div></td>
        <td>${escapeHtml(item.caption || "—")}</td>
        <td>${escapeHtml(item.category || "—")}</td>
        <td>
          <div class="dt-actions">
            <button class="btn-ghost btn-sm" data-edit="${item.id}">Edit</button>
            <button class="btn-danger" data-del="${item.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    galleryTableBody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => loadGalleryForEdit(btn.dataset.edit));
    });
    galleryTableBody.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => deleteGalleryItem(btn.dataset.del));
    });
  }

  function loadGalleryForEdit(id) {
    const item = galleryItems.find(g => g.id === id);
    if (!item) return;
    galleryEditId.value = id;
    document.getElementById("galleryUrl").value = item.url || "";
    document.getElementById("galleryCaption").value = item.caption || "";
    document.getElementById("galleryCategory").value = item.category || "";
    gFormTitle.textContent = "Edit Photo";
    gCancelEdit.style.display = "inline-flex";
    galleryForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  gCancelEdit.addEventListener("click", () => {
    galleryForm.reset();
    galleryEditId.value = "";
    gFormTitle.textContent = "Add New Photo";
    gCancelEdit.style.display = "none";
  });

  galleryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("galleryUrl").value.trim();
    const caption = document.getElementById("galleryCaption").value.trim();
    const category = document.getElementById("galleryCategory").value.trim();
    if (!url) { showToast("Please provide an image URL.", "error"); return; }

    const submitBtn = galleryForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (galleryEditId.value) {
        await updateDoc(doc(db, "gallery", galleryEditId.value), { url, caption, category });
        showToast("Photo updated.", "success");
      } else {
        await addDoc(collection(db, "gallery"), { url, caption, category, createdAt: serverTimestamp() });
        showToast("Photo added to gallery.", "success");
      }
      galleryForm.reset();
      galleryEditId.value = "";
      gFormTitle.textContent = "Add New Photo";
      gCancelEdit.style.display = "none";
    } catch (err) {
      showToast(err.message || "Could not save photo.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  async function deleteGalleryItem(id) {
    if (!confirm("Delete this photo from the gallery?")) return;
    try {
      await deleteDoc(doc(db, "gallery", id));
      showToast("Photo deleted.", "success");
    } catch (err) {
      showToast(err.message || "Could not delete photo.", "error");
    }
  }

  /* ---------------- MENU MANAGEMENT ---------------- */
  const menuForm = document.getElementById("menuForm");
  const menuTableBody = document.querySelector("#menuTable tbody");
  const menuEditId = document.getElementById("menuEditId");
  const mFormTitle = document.getElementById("menuFormTitle");
  const mCancelEdit = document.getElementById("menuCancelEdit");
  let menuItemsCache = [];

  function renderMenuTable() {
    if (menuItemsCache.length === 0) {
      menuTableBody.innerHTML = `<tr><td colspan="4" class="dt-empty">No menu items yet — the homepage is showing its default menu.</td></tr>`;
      return;
    }
    menuTableBody.innerHTML = menuItemsCache.map(item => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.desc || "—")}</td>
        <td>${item.order ?? "—"}</td>
        <td>
          <div class="dt-actions">
            <button class="btn-ghost btn-sm" data-medit="${item.id}">Edit</button>
            <button class="btn-danger" data-mdel="${item.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");

    menuTableBody.querySelectorAll("[data-medit]").forEach(btn => {
      btn.addEventListener("click", () => loadMenuForEdit(btn.dataset.medit));
    });
    menuTableBody.querySelectorAll("[data-mdel]").forEach(btn => {
      btn.addEventListener("click", () => deleteMenuItem(btn.dataset.mdel));
    });
  }

  function loadMenuForEdit(id) {
    const item = menuItemsCache.find(m => m.id === id);
    if (!item) return;
    menuEditId.value = id;
    document.getElementById("menuName").value = item.name || "";
    document.getElementById("menuDesc").value = item.desc || "";
    document.getElementById("menuOrder").value = item.order ?? 1;
    mFormTitle.textContent = "Edit Menu Item";
    mCancelEdit.style.display = "inline-flex";
    menuForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  mCancelEdit.addEventListener("click", () => {
    menuForm.reset();
    menuEditId.value = "";
    mFormTitle.textContent = "Add New Menu Item";
    mCancelEdit.style.display = "none";
  });

  menuForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("menuName").value.trim();
    const desc = document.getElementById("menuDesc").value.trim();
    const order = +document.getElementById("menuOrder").value || 1;
    if (!name) { showToast("Please enter a dish name.", "error"); return; }

    const submitBtn = menuForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      if (menuEditId.value) {
        await updateDoc(doc(db, "menu", menuEditId.value), { name, desc, order });
        showToast("Menu item updated.", "success");
      } else {
        await addDoc(collection(db, "menu"), { name, desc, order, createdAt: serverTimestamp() });
        showToast("Menu item added.", "success");
      }
      menuForm.reset();
      menuEditId.value = "";
      mFormTitle.textContent = "Add New Menu Item";
      mCancelEdit.style.display = "none";
    } catch (err) {
      showToast(err.message || "Could not save menu item.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  async function deleteMenuItem(id) {
    if (!confirm("Delete this menu item?")) return;
    try {
      await deleteDoc(doc(db, "menu", id));
      showToast("Menu item deleted.", "success");
    } catch (err) {
      showToast(err.message || "Could not delete menu item.", "error");
    }
  }

  /* ---------------- SITE CONTENT ---------------- */
  const contentForm = document.getElementById("contentForm");
  const contentFields = {
    heroSubtitle: "cHeroSubtitle",
    aboutPara1: "cAboutPara1",
    aboutPara2: "cAboutPara2",
    banquetText: "cBanquetText",
    address: "cAddress",
    hours: "cHours",
    email: "cEmail",
    phone1: "cPhone1",
    phone2: "cPhone2",
    whatsapp: "cWhatsapp"
  };

  async function loadContentForm() {
    try {
      const snap = await getDoc(doc(db, "content", "site"));
      if (!snap.exists()) return;
      const data = snap.data();
      Object.entries(contentFields).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el && data[key]) el.value = data[key];
      });
    } catch (err) {
      console.warn("Could not load site content for editing:", err.message);
    }
  }

  contentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {};
    Object.entries(contentFields).forEach(([key, id]) => {
      payload[key] = document.getElementById(id).value.trim();
    });
    const submitBtn = contentForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";
    try {
      await setDoc(doc(db, "content", "site"), payload, { merge: true });
      showToast("Site content updated — changes are now live.", "success");
    } catch (err) {
      showToast(err.message || "Could not save site content.", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Save Changes";
    }
  });

  loadContentForm();

  /* ---------------- REVIEW MODERATION ---------------- */
  const reviewsTableBody = document.querySelector("#reviewsTable tbody");

  function renderReviewsTable() {
    if (reviewItems.length === 0) {
      reviewsTableBody.innerHTML = `<tr><td colspan="4" class="dt-empty">No reviews yet.</td></tr>`;
      return;
    }
    reviewsTableBody.innerHTML = reviewItems.map(r => `
      <tr>
        <td>${escapeHtml(r.username || "Guest")}</td>
        <td>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
        <td style="max-width:340px;">${escapeHtml(r.text)}</td>
        <td><button class="btn-danger" data-rdel="${r.id}" data-uid="${r.uid}">Remove</button></td>
      </tr>
    `).join("");

    reviewsTableBody.querySelectorAll("[data-rdel]").forEach(btn => {
      btn.addEventListener("click", () => deleteReview(btn.dataset.rdel, btn.dataset.uid));
    });
  }

  async function deleteReview(id, ownerUid) {
    if (!confirm("Remove this review? The user will be able to post a new one in its place.")) return;
    try {
      await deleteDoc(doc(db, "reviews", id));
      await updateDoc(doc(db, "users", ownerUid), { reviewCount: increment(-1) });
      showToast("Review removed.", "success");
    } catch (err) {
      showToast(err.message || "Could not remove review.", "error");
    }
  }

  /* ---------------- USERS (read-only) ---------------- */
  const usersTableBody = document.querySelector("#usersTable tbody");
  function renderUsersTable() {
    if (userItems.length === 0) {
      usersTableBody.innerHTML = `<tr><td colspan="4" class="dt-empty">No registered users yet.</td></tr>`;
      return;
    }
    usersTableBody.innerHTML = userItems.map(u => `
      <tr>
        <td>${escapeHtml(u.username || "—")}</td>
        <td>${u.reviewCount || 0}</td>
        <td>${u.isAdmin ? '<span class="admin-pill">Admin</span>' : "—"}</td>
        <td>${u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : "—"}</td>
      </tr>
    `).join("");
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  /* ---------------- live listeners ---------------- */
  onSnapshot(query(collection(db, "gallery"), orderBy("createdAt", "desc")), (snap) => {
    galleryItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGalleryTable();
    renderStats();
  });

  onSnapshot(query(collection(db, "menu"), orderBy("order", "asc")), (snap) => {
    menuItemsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMenuTable();
  });

  onSnapshot(query(collection(db, "reviews"), orderBy("createdAt", "desc")), (snap) => {
    reviewItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderReviewsTable();
    renderStats();
  });

  onSnapshot(collection(db, "users"), (snap) => {
    userItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderUsersTable();
    renderStats();
  });
}
