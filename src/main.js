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
  currentView,
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
  window.scrollTo(0, 0);
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

window.addEventListener("popstate", route);

pinChromeLinks();
route();
