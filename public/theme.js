(() => {
  let saved;
  try { saved = localStorage.getItem("lab-theme"); } catch { /* Storage can be disabled. */ }
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = ["light", "dark"].includes(saved) ? saved : preferred;
  try { document.documentElement.dataset.sidebar = localStorage.getItem("fieldwork-sidebar") || "expanded"; } catch { /* Default layout. */ }
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
      const apply = () => {
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem("lab-theme", next); } catch { /* Keep the session preference. */ }
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
