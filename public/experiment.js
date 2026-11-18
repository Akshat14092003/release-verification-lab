(() => {
  function initialize() {
    const button = document.getElementById("attempt-purchase");
    if (!button || button.dataset.experimentReady) return;
    button.dataset.experimentReady = "true";
    const toggle = document.getElementById("experiment-bug");
    const error = document.getElementById("experiment-error");
    const verify = document.getElementById("experiment-run-checks");
    const { fetchJson, withButton } = window.Fieldwork;
    let edited = false;
    document.querySelector(".field-start")?.addEventListener("click", event => {
      event.preventDefault();
      document.getElementById("field-experiment").scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      toggle.focus({ preventScroll: true });
    });
    function showStep(number) {
      document.querySelectorAll("[data-desk-step]").forEach(step => {
        if (Number(step.dataset.deskStep) === number) step.setAttribute("aria-current", "step");
        else step.removeAttribute("aria-current");
      });
    }
    function explain(animate = false) {
      document.getElementById("switch-explanation").textContent = toggle.checked
        ? "On - the weekday protection is removed" : "Off - the weekday rule stays in place";
      document.getElementById("desk-behavior-title").textContent = toggle.checked
        ? "Expected with this bug: the offer slips through" : "Expected: purchase blocked";
      document.getElementById("desk-behavior-copy").textContent = toggle.checked
        ? "The shop will allow a weekend deal on Monday. Try it, then see whether the tests catch the broken rule."
        : "On Monday, the offer should be unavailable. No order or charge should be created.";
      const preview = document.querySelector(".desk-expectation");
      showStep(toggle.checked ? 2 : 1);
      if (animate && preview) {
        preview.classList.remove("is-changing");
        void preview.offsetWidth;
        preview.classList.add("is-changing");
      }
    }
    toggle.addEventListener("change", () => {
      edited = true;
      button.closest(".experiment-desk").dataset.storeDirty = "true";
      explain(true);
    });
    function showScope(state) {
      if (!button.isConnected) return;
      if (!edited) toggle.checked = state.bugs.BUG_WEEKEND_OFFER;
      document.getElementById("experiment-scope").textContent = state.sharedShop
        ? "Trying or verifying applies Monday and this switch to the shared shop across browsers. Other bug settings stay as set."
        : "Trying or verifying applies Monday and this switch to your demo shop. Other bug settings stay as set.";
      explain();
    }
    // Keep a refreshed page honest about the saved selection.
    document.addEventListener("fieldwork:settings", event => showScope(event.detail));
    fetchJson("/api/lab/state").then(showScope).catch(() => {
      if (button.isConnected) error.textContent = "Unable to load the lab setup. Reload or open QA playground.";
    });
    async function applySelection() {
      const state = await fetchJson("/api/lab/state");
      const saved = await fetchJson("/api/lab/settings", {
        bugs: { ...state.bugs, BUG_WEEKEND_OFFER: toggle.checked }, clock: "monday"
      });
      document.dispatchEvent(new CustomEvent("fieldwork:experiment-setup", { detail: saved }));
    }
    button.addEventListener("click", () => withButton(button, async () => {
      error.textContent = "";
      try {
        await applySelection();
        showStep(2);
        location.assign("/offers");
      } catch (problem) { error.textContent = problem.message; }
    }, [toggle, verify]));
    verify.addEventListener("click", () => withButton(verify, async () => {
      error.textContent = "";
      try {
        await applySelection();
        document.getElementById("run-mode").value = "current";
        showStep(3);
        document.getElementById("test-drawer").addEventListener("close", () => {
          document.getElementById("experiment-run-checks")?.focus({ preventScroll: true });
        }, { once: true });
        window.Fieldwork.openTests();
      } catch (problem) { error.textContent = problem.message; }
    }, [toggle, button]));
  }
  document.addEventListener("fieldwork:content", initialize);
  initialize();
})();
