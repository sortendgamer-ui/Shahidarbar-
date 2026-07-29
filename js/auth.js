import { auth, db } from "./firebase-init.js";
import { AUTH_EMAIL_DOMAIN } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ============================= TOASTS ============================= */
export function showToast(message, type = "info") {
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 400);
  }, 3800);
}

/* ============================= HELPERS ============================= */
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export function validateUsername(username) {
  if (!username || !USERNAME_RE.test(username)) {
    return "Username must be 3-20 characters: letters, numbers, underscores only.";
  }
  return null;
}

export async function usernameExists(username) {
  const ref = doc(db, "usernames", username.trim().toLowerCase());
  const snap = await getDoc(ref);
  return snap.exists();
}

/* ============================= REGISTER ============================= */
export async function registerUser(username, password) {
  const uErr = validateUsername(username);
  if (uErr) throw new Error(uErr);
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const usernameLower = username.trim().toLowerCase();
  const taken = await usernameExists(usernameLower);
  if (taken) throw new Error("That username is already taken. Please choose another.");

  const email = usernameToEmail(usernameLower);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await updateProfile(cred.user, { displayName: username.trim() });

  await setDoc(doc(db, "users", uid), {
    username: username.trim(),
    usernameLower,
    isAdmin: false,
    reviewCount: 0,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "usernames", usernameLower), { uid });

  return cred.user;
}

/* ============================= LOGIN ============================= */
export async function loginUser(username, password) {
  if (!username || !password) throw new Error("Enter your username and password.");
  const email = usernameToEmail(username);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  } catch (err) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
      throw new Error("Incorrect username or password.");
    }
    throw new Error(err.message || "Login failed.");
  }
}

/* ============================= LOGOUT ============================= */
export async function logoutUser() {
  await signOut(auth);
}

/* ============================= USER DOC ============================= */
const userDocCache = new Map();
export async function getUserDoc(uid, { force = false } = {}) {
  if (!force && userDocCache.has(uid)) return userDocCache.get(uid);
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? snap.data() : null;
  userDocCache.set(uid, data);
  return data;
}
export function clearUserDocCache(uid) { userDocCache.delete(uid); }

/* ============================= NAV RENDERING ============================= */
function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export function initNavAuth() {
  const area = document.getElementById("authArea");
  if (!area) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      area.innerHTML = `
        <a href="login.html" class="auth-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          Login / Register
        </a>`;
      document.body.classList.remove("is-authed");
      document.body.classList.remove("is-admin");
      return;
    }

    const data = await getUserDoc(user.uid, { force: true });
    const displayName = data?.username || user.displayName || "Guest";
    const isAdmin = !!data?.isAdmin;
    document.body.classList.add("is-authed");
    document.body.classList.toggle("is-admin", isAdmin);

    area.innerHTML = `
      <div class="user-chip" id="userChip">
        <div class="user-avatar">${initials(displayName)}</div>
        <span class="user-name">${displayName}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        <div class="user-dropdown">
          <div style="padding:8px 12px 10px;">
            <div style="font-family:'Cormorant Garamond',serif; font-size:1.05rem; color:var(--ivory);">${displayName}</div>
            ${isAdmin ? '<span class="admin-pill" style="margin-top:6px; display:inline-block;">Admin</span>' : ""}
          </div>
          <hr>
          <a href="reviews.html">My Reviews</a>
          ${isAdmin ? '<a href="admin.html">Admin Panel</a>' : ""}
          <hr>
          <button id="logoutBtn" type="button">Sign Out</button>
        </div>
      </div>`;

    const chip = document.getElementById("userChip");
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      chip.classList.toggle("open");
    });
    document.addEventListener("click", () => chip.classList.remove("open"));

    document.getElementById("logoutBtn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await logoutUser();
      showToast("You've been signed out.", "info");
      setTimeout(() => { window.location.href = "index.html"; }, 500);
    });
  });
}

/* ============================= ROUTE GUARDS ============================= */
/** Resolves with the Firebase user once auth state is known (once, not live). */
export function waitForAuth() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

/** Redirects to login.html if not signed in. Returns the user if signed in. */
export async function requireLogin(redirectPage) {
  const user = await waitForAuth();
  if (!user) {
    const target = redirectPage || window.location.pathname.split("/").pop();
    window.location.href = `login.html?redirect=${encodeURIComponent(target)}`;
    return null;
  }
  return user;
}

/** Redirects to login (then shows access-denied) if not an admin. */
export async function requireAdmin() {
  const user = await waitForAuth();
  if (!user) {
    window.location.href = "login.html?redirect=admin.html";
    return null;
  }
  const data = await getUserDoc(user.uid, { force: true });
  if (!data?.isAdmin) {
    return { user, isAdmin: false };
  }
  return { user, isAdmin: true, data };
}
