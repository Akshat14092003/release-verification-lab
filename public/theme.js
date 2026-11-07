(() => {
  // Runs inline in <head> before app.js; keep a local storage helper here.
  const store = (key, val) => { try { return val === undefined ? localStorage.getItem(key) : localStorage.setItem(key, val); } catch { /* Storage may be disabled. */ } };
  const saved = store("lab-theme");
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = ["light", "dark"].includes(saved) ? saved : preferred;
  try { document.documentElement.dataset.sidebar = localStorage.getItem("fieldwork-sidebar") || "expanded"; } catch { /* Default layout. */ }
  function updatePhotos(root = document) {
    const media = document.documentElement.dataset.theme === "dark" ? "all" : "not all";
    if (root.matches?.("source[data-dark-photo]")) root.media = media;
    root.querySelectorAll("source[data-dark-photo]").forEach(source => { source.media = media; });
  }
  // Apply saved overrides as pictures arrive, including inline cart/product updates.
  // Without JavaScript, native picture sources follow the system colour scheme.
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType === 1) updatePhotos(node);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  function updateButtons() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "Light mode" : "Dark mode";
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    updatePhotos();
    updateButtons();
    document.querySelectorAll("[data-theme-toggle]").forEach(button => button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      const rect = button.getBoundingClientRect();
      document.documentElement.style.setProperty("--theme-x", rect.left + rect.width / 2 + "px");
      document.documentElement.style.setProperty("--theme-y", rect.top + rect.height / 2 + "px");
      // Navigation can cancel the deferred View Transition callback. Save the choice first.
      store("lab-theme", next);
      const apply = () => {
        document.documentElement.dataset.theme = next;
        updatePhotos();
        updateButtons();
        document.dispatchEvent(new CustomEvent("fieldwork:theme", { detail: { theme: next } }));
      };
      // Root snapshots capture native dialogs too, temporarily blocking their controls.
      if (document.startViewTransition && !document.querySelector("dialog[open]") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("theme-changing");
        const transition = document.startViewTransition(apply);
        transition.finished.catch(() => {}).finally(() => document.documentElement.classList.remove("theme-changing"));
      } else apply();
    }));
  });
})();
