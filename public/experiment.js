(() => {
  function initialize() {
    const button = document.getElementById("attempt-purchase");
    if (!button || button.dataset.experimentReady) return;
    button.dataset.experimentReady = "true";
    const toggle = document.getElementById("experiment-bug");
    const error = document.getElementById("experiment-error");
    const { fetchJson, withButton } = window.Fieldwork;
    let edited = false;
    function explain() {
      document.getElementById("switch-explanation").textContent = toggle.checked
        ? "Selected: bypass the weekday check" : "Selected: reject weekday purchases";
  }
  toggle.addEventListener("change", () => {
    edited = true;
    button.closest(".experiment").dataset.storeDirty = "true";
    explain();
  });
  function showScope(state) {
    if (!edited) toggle.checked = state.bugs.BUG_WEEKEND_OFFER;
    document.getElementById("experiment-scope").textContent = state.sharedShop
      ? "Applies Monday and this bug setting to the shared shop across all browsers. Other bug switches stay as set."
      : "Applies Monday and this bug setting to your demo shop. Other bug switches stay as set.";
    explain();
  }
  fetchJson("/api/lab/state").then(showScope).catch(() => {
    error.textContent = "Unable to load the lab setup. Try opening QA playground.";
  });
  button.addEventListener("click", () => withButton(button, async () => {
    error.textContent = "";
    try {
      const state = await fetchJson("/api/lab/state");
      await fetchJson("/api/lab/settings", {
        bugs: { ...state.bugs, BUG_WEEKEND_OFFER: toggle.checked }, clock: "monday"
      });
      location.assign("/offers");
    } catch (problem) {
      error.textContent = problem.message;
    }
  }, [toggle]));
  document.getElementById("experiment-run-checks").addEventListener("click", () => window.Fieldwork.openTests());
  }
  document.addEventListener("fieldwork:content", initialize);
  initialize();
})();
