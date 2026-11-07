(() => {
  // Runs inline in <head> before app.js; keep a local storage helper here.
  const store = (key, val) => { try { return val === undefined ? localStorage.getItem(key) : localStorage.setItem(key, val); } catch { /* Storage may be disabled. */ } };
  const saved = store("lab-theme");
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = ["light", "dark"].includes(saved) ? saved : preferred;
  document.documentElement.dataset.sidebar = store("fieldwork-sidebar") || "expanded";
  function updateButtons() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach(button => {
      button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "Light mode" : "Dark mode";
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
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
        updateButtons();
        document.dispatchEvent(new CustomEvent("fieldwork:theme", { detail: { theme: next } }));
      };
      if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.classList.add("theme-changing");
        const transition = document.startViewTransition(apply);
        transition.finished.catch(() => {}).finally(() => document.documentElement.classList.remove("theme-changing"));
      } else apply();
    }));
  });
})();
