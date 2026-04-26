// ============================================================
// POSPro - Shared Utilities (utils.js)
// ============================================================

const APPS_SCRIPT_URL = "GANTI_DENGAN_URL_APPS_SCRIPT_KAMU";

// ── Routing Helper ──
function goToPage(page) {
  let path = window.location.pathname;
  if (!path.endsWith('/')) {
    let lastSlash = path.lastIndexOf('/');
    if (path.includes('.html')) {
      path = path.substring(0, lastSlash + 1);
    } else {
      path += '/';
    }
  }
  window.location.href = path + page;
}

// ── Session ──
function getSession() {
  try { return JSON.parse(sessionStorage.getItem("pos_session")); } catch { return null; }
}
function setSession(data) { sessionStorage.setItem("pos_session", JSON.stringify(data)); }
function clearSession() { sessionStorage.removeItem("pos_session"); }

function requireSession(allowedRoles) {
  const s = getSession();
  if (!s) { goToPage("index.html"); return null; }
  if (allowedRoles && !allowedRoles.includes(s.role)) { goToPage("index.html"); return null; }
  return s;
}

// ── Fetch ──
async function apiFetch(body) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("GANTI")) {
    throw new Error("APPS_SCRIPT_URL belum diisi di js/utils.js");
  }
  const session = getSession();
  if (session) {
    body.requesterId = body.requesterId || session.id;
    body.requesterRole = body.requesterRole || session.role;
  }
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return data;
}

// ── Toast ──
function toast(msg, type = "info", duration = 4000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), duration);
}
function toastOk(msg) { toast(msg, "success"); }
function toastErr(msg) { toast(msg, "error"); }
function toastInfo(msg) { toast(msg, "info"); }

// ── Loading ──
function showLoading(msg = "Memproses...") {
  let el = document.getElementById("loading-overlay");
  if (!el) {
    el = document.createElement("div");
    el.id = "loading-overlay";
    el.innerHTML = `<div class="spinner"></div><p>${msg}</p>`;
    document.body.appendChild(el);
  }
  el.querySelector("p").textContent = msg;
  el.classList.add("active");
}
function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.classList.remove("active");
}

// ── Format ──
function formatRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}
function formatDate(str) {
  if (!str) return "-";
  return str;
}
function nowJakarta() {
  return new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}
function todayJakarta() {
  return new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit", month: "2-digit", year: "numeric"
  }).split("/").join("/");
}

// ── Modal Helpers ──
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add("active");
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove("active");
}

// ── Tab Helpers ──
function initTabs(tabsSelector, panelsSelector) {
  const tabs = document.querySelectorAll(tabsSelector);
  const panels = document.querySelectorAll(panelsSelector);
  tabs.forEach((btn, i) => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      panels[i].classList.add("active");
      btn.dispatchEvent(new CustomEvent("tabactivated", { bubbles: true }));
    });
  });
}

// ── Sidebar ──
function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");
  const hamburger = document.querySelector(".hamburger");
  if (!sidebar) return;
  function open() { sidebar.classList.add("open"); overlay && overlay.classList.add("open"); }
  function close() { sidebar.classList.remove("open"); overlay && overlay.classList.remove("open"); }
  if (hamburger) hamburger.addEventListener("click", () => sidebar.classList.contains("open") ? close() : open());
  if (overlay) overlay.addEventListener("click", close);
}

// ── Render sidebar nav by role ──
function renderNav(activeHref) {
  const session = getSession();
  if (!session) return;
  const role = session.role;

  const nav = document.querySelector(".sidebar-nav");
  if (!nav) return;

  const menus = [
    { href: "kasir.html", icon: "🛒", label: "Kasir", roles: ["Owner", "Admin", "Kasir"] },
    { href: "riwayat.html", icon: "📋", label: "Riwayat", roles: ["Owner", "Admin", "Kasir"] },
    { href: "produk.html", icon: "📦", label: "Produk & Stok", roles: ["Owner", "Admin", "Kasir"] },
    { href: "laporan.html", icon: "📊", label: "Laporan", roles: ["Owner", "Admin"] },
    { href: "pengaturan.html", icon: "⚙️", label: "Pengaturan", roles: ["Owner"] },
  ];

  let html = "";
  menus.forEach(m => {
    if (!m.roles.includes(role)) return;
    const isActive = activeHref && location.pathname.endsWith(m.href);
    html += `<button onclick="goToPage('${m.href}')" class="nav-item${isActive ? " active" : ""}">
      <span class="nav-icon">${m.icon}</span>${m.label}</button>`;
  });
  html += `<hr class="nav-divider">
    <button class="nav-item btn-logout" onclick="logout()">
      <span class="nav-icon">🚪</span>Logout</button>`;
  nav.innerHTML = html;

  // user info
  const userEl = document.querySelector(".sidebar-user");
  if (userEl) {
    userEl.innerHTML = `<div class="user-name">${session.nama}</div>
      <span class="user-role role-${role.toLowerCase()}">${role}</span>`;
  }
}

function logout() {
  if (!confirm("Yakin logout?")) return;
  clearSession();
  goToPage("index.html");
}

// ── Pengaturan Cache ──
let _config = null;
async function getConfig() {
  if (_config) return _config;
  try {
    const r = await apiFetch({ action: "getPengaturan" });
    if (r.success) _config = r.config;
    return _config || {};
  } catch { return {}; }
}

// ── Number input format ──
function numVal(el) { return parseFloat(String(el.value).replace(/[^0-9.]/g, "")) || 0; }
