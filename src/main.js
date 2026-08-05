// Browser shell for the running-training-dataset.
//
// The views live in views.mjs, which is pure and DOM-free so scripts/prerender.mjs
// produces byte-identical markup - the same arrangement svg.mjs already uses for the
// charts. This file is only the browser half: History-API routing, link
// interception, search, and the language toggle.
//
// Routing is History API, not hash. Prerendered files exist at every path, so a
// cold hit on /anchor/rpe_10 is a real document a crawler can read; the click
// handler below then upgrades navigation to instant, no-reload lookups. That is the
// dictionary shape ADR 0001 settles on: a page for discovery, an app for use.
import "./style.css";
import {
  PLACEHOLDER,
  RECENT_LABEL,
  currentView,
  entryLabel,
  metaFor,
  renderPath,
  setBase,
  setLang,
  currentLang,
} from "./views.mjs";

const BASE = import.meta.env.BASE_URL || "/";
setBase(BASE);
setLang(localStorage.getItem("lang") || "ko");

const app = document.getElementById("app");
const searchInput = document.getElementById("search");
const langToggle = document.getElementById("lang-toggle");

// location.pathname -> the base-relative path views.mjs routes on.
function currentPath() {
  let p = location.pathname;
  if (BASE !== "/" && p.startsWith(BASE)) p = p.slice(BASE.length - 1);
  return p.replace(/\/+$/, "") || "/";
}

function currentQuery() {
  return new URLSearchParams(location.search).get("q") || "";
}

function navigate(path, q) {
  const url =
    BASE.replace(/\/$/, "") +
    (path === "/" ? "/" : path) +
    (q ? `?q=${encodeURIComponent(q)}` : "");
  if (url !== location.pathname + location.search) history.pushState(null, "", url);
  route();
}

function route() {
  const path = currentPath();
  const q = currentQuery();
  if (searchInput.value !== q) searchInput.value = q;
  app.innerHTML = renderPath(path, q);
  // Keep the tab title truthful on client-side navigation - the prerendered file
  // set it correctly on the cold load, but pushState does not.
  document.title = metaFor(path).title;
  syncChrome(path);
  recordVisit(path);
  if (path === "/" && !q) showRecent();
  kbdReset();
  window.scrollTo(0, 0);
}

// ---- recently viewed --------------------------------------------------------
// Per-reader, so it is injected after render and never prerendered: the files on
// disk must read the same for everyone.
const RECENT_KEY = "recent";
const RECENT_MAX = 8;

function readRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.path === "string") : [];
  } catch {
    return [];
  }
}

function recordVisit(path) {
  const entry = entryLabel(path);
  if (!entry) return;
  const next = [{ path, ...entry }, ...readRecent().filter((x) => x.path !== path)].slice(
    0,
    RECENT_MAX,
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode - the strip just stays empty */
  }
}

function showRecent() {
  const items = readRecent();
  if (!items.length) return;
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const el = document.createElement("section");
  el.className = "recent";
  el.innerHTML = `
    <h3 class="recent-h">${esc(RECENT_LABEL[currentLang()] || RECENT_LABEL.en)}</h3>
    <div class="recent-items">${items
      .map(
        (x) =>
          `<a class="wchip recent-item" href="${BASE}${esc(x.path.slice(1))}"><span class="recent-kind">${esc(x.kind)}</span>${esc(x.label)}</a>`,
      )
      .join("")}</div>`;
  app.prepend(el);
}

// The shell's chrome links are written relative ("./workouts") so they stay
// correct in the source HTML; from a nested entry like /anchor/rpe_10 they would
// resolve wrong, so pin them to the base once at boot. prerender.mjs does the same
// rewrite when it writes each file.
function pinChromeLinks() {
  for (const a of document.querySelectorAll('.topbar a[href^="./"]')) {
    a.setAttribute("href", BASE + a.getAttribute("href").slice(2));
  }
}

function syncChrome(path = currentPath()) {
  const l = currentLang();
  langToggle.textContent = l === "ko" ? "EN" : "한국어";
  searchInput.placeholder = PLACEHOLDER[l];
  document.documentElement.lang = l;
  const view = currentView(path);
  for (const a of document.querySelectorAll("[data-nav]")) {
    a.classList.toggle("active", a.dataset.nav === view);
  }
}

// Intercept same-origin link clicks so navigation stays instant. Anything unusual
// (new tab, modifier key, external host) falls through to the browser.
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  const a = e.target.closest?.("a");
  if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
  const href = a.getAttribute("href");
  if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:"))
    return;
  const url = new URL(a.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  history.pushState(null, "", url.pathname + url.search);
  route();
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchInput.value.trim();
    const path = currentPath().startsWith("/workouts") ? "/workouts" : "/";
    navigate(path, q);
  }, 120);
});

langToggle.addEventListener("click", () => {
  const next = currentLang() === "ko" ? "en" : "ko";
  setLang(next);
  localStorage.setItem("lang", next);
  route();
});

// ---- keyboard-first lookup --------------------------------------------------
// What separates a dictionary you consult from a site you browse: reach the search
// box without the mouse, walk the hits, open one, and get back out.
//   /  or  s   focus the search box        ArrowUp/Down   walk the results
//   Enter      open the highlighted hit    Esc            clear, then blur
let kbdIndex = -1;

function kbdResults() {
  return [...app.querySelectorAll("a.card, a.collision-item")];
}

function kbdReset() {
  kbdIndex = -1;
  for (const el of app.querySelectorAll(".kbd-active")) el.classList.remove("kbd-active");
}

function kbdMove(delta) {
  const items = kbdResults();
  if (!items.length) return;
  items[kbdIndex]?.classList.remove("kbd-active");
  kbdIndex = (kbdIndex + delta + items.length) % items.length;
  const el = items[kbdIndex];
  el.classList.add("kbd-active");
  el.scrollIntoView({ block: "nearest" });
}

function isTyping(el) {
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const typing = isTyping(document.activeElement);

  if ((e.key === "/" || e.key === "s") && !typing) {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  if (e.key === "Escape") {
    if (searchInput.value) {
      searchInput.value = "";
      navigate(currentPath().startsWith("/workouts") ? "/workouts" : "/", "");
    }
    searchInput.blur();
    kbdReset();
    return;
  }

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!kbdResults().length) return;
    e.preventDefault();
    kbdMove(e.key === "ArrowDown" ? 1 : -1);
    return;
  }

  if (e.key === "Enter" && kbdIndex >= 0) {
    const el = kbdResults()[kbdIndex];
    if (el) {
      e.preventDefault();
      el.click();
    }
  }
});

window.addEventListener("popstate", route);

// ---- offline ----------------------------------------------------------------
// The corpus already ships in the bundle, so offline costs only a cached shell.
// Production only: a worker in dev would serve stale modules over HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE }).catch(() => {
      /* offline is an enhancement; a refusal (private mode, http) changes nothing */
    });
  });
}

pinChromeLinks();
route();
