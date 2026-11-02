(() => {
  const settings = document.getElementById("lab-settings");
  if (!settings) return;
  const $ = id => document.getElementById(id);
  const switches = [...settings.querySelectorAll('[role="switch"]')];
  const bugArtwork = {
    BUG_AUTH_BYPASS: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    BUG_WEEKEND_OFFER: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2"/>',
    BUG_NO_LIMIT: '<path d="M9 8 6 5a4 4 0 0 0 0 14l3-3m6-8 3-3a4 4 0 0 1 0 14l-3-3M8 12h8"/>',
    BUG_TOTAL_MISMATCH: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3"/>'
  };
  switches.forEach(input => {
    const top = document.createElement("div");
    top.className = "bug-card-top";
    top.innerHTML = '<span class="bug-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + bugArtwork[input.name] + '</svg></span><span class="bug-card-state">Correct behaviour</span>';
    input.closest(".bug-card").prepend(top);
  });
  const playgroundSteps = document.createElement("ol");
  playgroundSteps.className = "playground-steps";
  playgroundSteps.setAttribute("aria-label", "How to use the QA playground");
  ["Flip a switch", "Try the bug", "Run checks"].forEach((text, index) => {
    const step = document.createElement("li");
    step.innerHTML = '<span aria-hidden="true">' + (index + 1) + '</span>';
    step.append(document.createTextNode(text));
    playgroundSteps.append(step);
  });
  settings.querySelector(".playground-heading").append(playgroundSteps);
  let currentRun = null;
  let timer = null;
  let elapsedTimer = null;
  let saving = null;
  let shownReport = null;
  let pendingReport = null;
  const checkRows = new Map();
  const detectionRows = new Map();
  const drawer = $("test-drawer");
  const reportFrame = $("report-frame");
  const checkLoading = document.createElement("div");
  checkLoading.id = "check-loading";
  checkLoading.className = "check-loading";
  checkLoading.hidden = true;
  checkLoading.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i++) {
    const row = document.createElement("div");
    row.className = "check-skeleton";
    row.innerHTML = '<span class="sk-mark"></span><span class="sk-copy"><span class="sk-line"></span><span class="sk-line sk-line-sm"></span></span>';
    checkLoading.append(row);
  }
  $("run-checks").before(checkLoading);
  const catchSummary = document.createElement("strong");
  catchSummary.id = "catch-summary";
  $("bug-caught-alert").append(catchSummary);
  const catchPopup = document.createElement("div");
  catchPopup.id = "catch-popup";
  catchPopup.className = "catch-popup";
  catchPopup.hidden = true;
  catchPopup.innerHTML = `<section class="catch-popup-card" role="status" aria-live="polite" aria-atomic="true">
    <button id="close-catch-popup" class="icon-button" aria-label="Dismiss bug celebration">×</button>
    <span class="eyebrow">BUG HUNT</span>
    <div class="catch-trophy" aria-hidden="true">
      <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="33" stroke="currentColor" stroke-width="2"/>
        <path d="M40 1v12m0 54v12M1 40h12m54 0h12M26 24l-6-6m34 6 6-6M22 40H13m45 0h9M26 55l-7 7m35-7 7 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <rect x="26" y="24" width="28" height="35" rx="14" fill="currentColor"/>
        <path d="m33 40 5 5 10-11" stroke="var(--catch-surface)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="catch-bonus">+1</span><div class="catch-particles"></div>
    </div>
    <h2 id="catch-popup-title"></h2><p id="catch-popup-name"></p>
    <p id="catch-popup-copy"></p><span id="catch-popup-score"></span>
    <button id="catch-popup-continue" class="button"></button>
  </section>`;
  for (let i = 0; i < 16; i++) {
    const particle = document.createElement("i");
    const angle = i * Math.PI / 8;
    particle.style.setProperty("--burst-x", Math.cos(angle) * (90 + i % 3 * 22) + "px");
    particle.style.setProperty("--burst-y", Math.sin(angle) * (90 + i % 3 * 22) + "px");
    particle.style.setProperty("--burst-delay", i % 4 * 35 + "ms");
    catchPopup.querySelector(".catch-particles").append(particle);
  }
  drawer.append(catchPopup);
  let catchRunId = null;
  let catchTimer = null;
  let activeCatch = null;
  let catchQueue = [];
  const queuedCatches = new Set();
  function showNextCatch() {
    if (activeCatch || !catchQueue.length) return;
    activeCatch = catchQueue.shift();
    try { sessionStorage.setItem(activeCatch.key, "seen"); } catch { /* Optional preference. */ }
    $("catch-popup-title").textContent = activeCatch.final ? activeCatch.count === 1 ? "BUG CAUGHT!" : "BUGS CAUGHT!" : "BUG SPOTTED!";
    $("catch-popup-name").textContent = activeCatch.names;
    $("catch-popup-copy").textContent = activeCatch.final ? "Caught by your tests. Switch the bugs off and run again to verify the fix." : "A matching check failed. Keep watching while we verify the full run.";
    $("catch-popup-score").textContent = activeCatch.count + " / " + activeCatch.total + " enabled bugs " + (activeCatch.final ? "verified" : "spotted");
    $("catch-popup-continue").textContent = activeCatch.final ? "See the evidence →" : "Keep watching →";
    catchPopup.querySelector(".catch-bonus").hidden = activeCatch.final;
    if (!drawer.open) openDrawer();
    // Commit the hidden state so consecutive catches each get their entrance animation.
    void catchPopup.offsetWidth;
    catchPopup.hidden = false;
    catchTimer = setTimeout(autoDismissCatch, activeCatch.final ? 9000 : 5500);
  }
  function dismissCatch() {
    clearTimeout(catchTimer);
    // Return focus before hiding a keyboard user's focused dismiss/action button.
    if (catchPopup.contains(document.activeElement)) $("close-tests").focus({ preventScroll: true });
    catchPopup.hidden = true;
    activeCatch = null;
    showNextCatch();
  }
  function autoDismissCatch() {
    if (catchPopup.matches(":hover") || catchPopup.contains(document.activeElement)) {
      catchTimer = setTimeout(autoDismissCatch, 1500);
    } else dismissCatch();
  }
  $("close-catch-popup").addEventListener("click", dismissCatch);
  $("catch-popup-continue").addEventListener("click", () => {
    const final = activeCatch?.final;
    dismissCatch();
    if (final) setReportView(true);
  });
  drawer.addEventListener("cancel", event => {
    if (catchPopup.hidden) return;
    event.preventDefault();
    dismissCatch();
  });
  function syncCatchPopup(run, detections) {
    if (catchRunId !== run.id) {
      catchRunId = run.id;
      catchQueue = [];
      queuedCatches.clear();
      dismissCatch();
    }
    const observed = detections.filter(detection => detection.observed > 0);
    const final = run.status === "completed" && run.matched && detections.length > 0 && detections.every(detection => detection.state === "verified");
    if (run.status !== "running") {
      catchQueue = [];
      if (!final || !activeCatch?.final) dismissCatch();
    }
    const enqueue = (id, names, count, verified) => {
      const key = "fieldwork-catch:" + run.id + ":" + id;
      if (queuedCatches.has(key)) return;
      queuedCatches.add(key);
      try { if (sessionStorage.getItem(key)) return; } catch { /* Optional preference. */ }
      catchQueue.push({ key, names, count, total: detections.length, final: verified });
    };
    if (final) enqueue("verified", detections.map(detection => detection.label).join(" · "), detections.length, true);
    else if (run.status === "running") observed.forEach(detection => {
      if (detection.state === "observed") enqueue(detection.id, detection.label, observed.length, false);
    });
    showNextCatch();
  }
  let reportThemeObserver;
  function syncReportTheme(reload = false) {
    const dark = document.documentElement.dataset.theme === "dark";
    // The pinned Playwright reporter reads this preference when it initializes.
    try { localStorage.setItem("theme", dark ? "dark-mode" : "light-mode"); } catch { /* Optional preference. */ }
    reportFrame.style.colorScheme = dark ? "dark" : "light";
    if (reload && reportFrame.getAttribute("src")) {
      try {
        const root = reportFrame.contentDocument?.documentElement;
        if (root && root.classList.contains("dark-mode") !== dark) reportFrame.contentWindow.location.reload();
      } catch { /* Only same-origin reports can be synchronized. */ }
    }
  }
  reportFrame.addEventListener("load", () => {
    reportThemeObserver?.disconnect();
    try {
      const doc = reportFrame.contentDocument;
      if (!doc || !reportFrame.contentWindow.location.pathname.startsWith("/lab-reports/")) return;
      const paint = () => {
        const background = reportFrame.contentWindow.getComputedStyle(doc.documentElement).getPropertyValue("--color-canvas-default").trim();
        if (!background) return;
        // Native report canvases are transparent. Paint them with their own theme,
        // including when its Settings menu changes theme independently of the shop.
        doc.documentElement.style.backgroundColor = background;
        doc.body.style.backgroundColor = background;
        reportFrame.style.backgroundColor = background;
        reportFrame.style.colorScheme = doc.documentElement.classList.contains("dark-mode") ? "dark" : "light";
      };
      paint();
      reportThemeObserver = new MutationObserver(paint);
      reportThemeObserver.observe(doc.documentElement, { attributes: true, attributeFilter: ["class"] });
    } catch { /* Report access and navigation stay usable if its DOM is unavailable. */ }
  });
  document.addEventListener("fieldwork:theme", () => syncReportTheme(true));
  function setReportView(show) {
    const reading = Boolean(show && pendingReport);
    drawer.classList.toggle("is-report-view", reading);
    $("toggle-report-view").textContent = reading ? "Run details" : "Read report";
    $("run-heading").textContent = reading ? "Your verification report" : "Verify this experience";
    drawer.querySelector(".drawer-body").scrollTop = 0;
  }
  function openDrawer() {
    syncReportTheme(true);
    if (!drawer.open) drawer.showModal();
    if (pendingReport && $("report-frame").getAttribute("src") !== pendingReport) $("report-frame").src = pendingReport;
    setReportView(Boolean(pendingReport));
  }
  $("open-tests").addEventListener("click", openDrawer);
  $("close-tests").addEventListener("click", () => drawer.close());
  $("toggle-report-view").addEventListener("click", () => setReportView(!drawer.classList.contains("is-report-view")));
  const playgroundToggle = $("toggle-playground");
  const loginPage = document.body.classList.contains("login-body");
  function setPlayground(open) {
    settings.hidden = !open;
    playgroundToggle.setAttribute("aria-expanded", String(open));
  }
  const compactNavigation = window.matchMedia("(max-width: 850px)").matches;
  try { setPlayground(!loginPage && !compactNavigation && localStorage.getItem("fieldwork-playground") !== "closed"); }
  catch { setPlayground(!loginPage && !compactNavigation); }
  playgroundToggle.addEventListener("click", () => {
    const open = settings.hidden;
    setPlayground(open);
    try { localStorage.setItem("fieldwork-playground", open ? "open" : "closed"); } catch { /* Optional preference. */ }
  });
  window.Fieldwork.openTests = openDrawer;

  function message(text, error = false) {
    $("lab-message").textContent = text;
    $("lab-message").classList.toggle("is-error", error);
    if (drawer.open && error) {
      $("runner-message").textContent = text;
      $("runner-message").classList.add("is-error");
    }
  }
  async function api(path, data) {
    const response = await fetch(path, data === undefined ? { cache: "no-store" } : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({ error: "The server is unavailable. Please retry shortly." }));
    if (!response.ok) {
      const error = new Error(result.error || "The request could not be completed.");
      error.status = response.status;
      throw error;
    }
    return result;
  }
  function updateSettings(state) {
    switches.forEach(input => {
      input.checked = Boolean(state.bugs[input.name]);
      input.closest(".bug-card").querySelector(".bug-card-state").textContent = input.checked ? "Bug active" : "Correct behaviour";
    });
    $("demo-clock").value = state.clock;
    const count = switches.filter(input => input.checked).length;
    $("bug-count").textContent = count ? count + (count === 1 ? " bug on" : " bugs on") : "All off";
    const expected = switches.filter(input => input.checked).reduce((sum, input) => sum + Number(input.dataset.failureCount), 0);
    const total = Number(settings.dataset.totalChecks);
    $("bug-expectation").textContent = expected ? "With these bugs on, expect " + expected + (expected === 1 ? " failed check and " : " failed checks and ") + (total - expected) +
      " passing checks. Switch the bugs off to verify the fix." : "All " + total + " checks should pass with the bugs off.";
    $("clock-value").textContent = "Shop clock: " + state.now.replace("T", " ").replace(".000Z", " UTC");
    $("clock-label").textContent = state.clock === "real" ? "Today" : state.clock[0].toUpperCase() + state.clock.slice(1);
    window.Fieldwork.labState = state;
    document.dispatchEvent(new CustomEvent("fieldwork:settings", { detail: state }));
  }
  async function save() {
    if (saving) return saving;
    const button = settings.querySelector('button[type="submit"]');
    button.disabled = true;
    settings.querySelectorAll("input, select").forEach(input => { input.disabled = true; });
    saving = api("/api/lab/settings", {
      bugs: Object.fromEntries(switches.map(input => [input.name, input.checked])), clock: $("demo-clock").value
    }).then(async state => {
      updateSettings(state);
      await window.Fieldwork.refresh();
      message("Settings applied. Try the behaviour right here.");
      return state;
    }).finally(() => {
      saving = null;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      settings.querySelectorAll("input, select").forEach(input => { input.disabled = false; });
    });
    return saving;
  }
  settings.addEventListener("submit", event => {
    event.preventDefault();
    save().catch(error => message(error.message, true));
  });
  switches.forEach(input => input.addEventListener("change", () => save().catch(error => message(error.message, true))));
  $("all-off").addEventListener("click", () => {
    switches.forEach(input => { input.checked = false; });
    save().catch(error => message(error.message, true));
  });
  $("reset-shop").addEventListener("click", async () => {
    const button = $("reset-shop");
    button.disabled = true;
    try { await api("/api/lab/reset", {}); location.assign("/products"); }
    catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });
  $("repeat-offer").addEventListener("click", async () => {
    const button = $("repeat-offer");
    button.disabled = true;
    try {
      const response = await fetch("/api/lab/repeat-offer", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json();
      $("repeat-result").hidden = false;
      $("repeat-result").textContent = "HTTP " + response.status + "\n" + JSON.stringify(body, null, 2) +
        (response.status === 401 ? "\nSign in as Customer and purchase the offer once, then retry." : "");
    } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  });

  function elapsed() {
    if (!currentRun) return;
    const end = currentRun.finishedAt ? Date.parse(currentRun.finishedAt) : Date.now();
    $("run-elapsed").textContent = Math.max(0, Math.round((end - Date.parse(currentRun.startedAt)) / 1000)) + "s";
  }
  function renderChecks(run) {
    const list = $("run-checks");
    checkLoading.hidden = run.status !== "running" || run.phase === "reporting" || (run.checks || []).length > 0;
    const labels = { passed: "Passed", failed: "Failed", timedOut: "Timed out", skipped: "Skipped", interrupted: "Stopped", running: "Running" };
    for (const check of run.checks || []) {
      let row = checkRows.get(check.id);
      if (!row) {
        row = document.createElement("li");
        const mark = document.createElement("span");
        mark.className = "check-mark";
        mark.setAttribute("aria-hidden", "true");
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = check.title;
        const detail = document.createElement("span");
        detail.className = "check-detail";
        const caught = document.createElement("span");
        caught.className = "check-defect";
        caught.hidden = true;
        copy.append(title, detail, caught);
        row.append(mark, copy);
        checkRows.set(check.id, row);
        list.prepend(row);
      }
      const status = check.status === "running" && run.status !== "running" ? "interrupted" : check.status;
      if (row.dataset.status !== status) {
        row.dataset.status = status;
        row.querySelector(".check-mark").textContent = status === "passed" ? "✓" : ["failed", "timedOut"].includes(status) ? "×" : status === "running" ? "" : "−";
        row.querySelector(".check-detail").textContent = (check.project || "Check") + " · " + (labels[status] || status);
      }
      const caught = row.querySelector(".check-defect");
      caught.hidden = !check.detectedBug;
      row.classList.toggle("is-expected-failure", Boolean(check.detectedBug));
      if (check.detectedBug) caught.textContent = (run.status === "completed" && run.matched ? "Caught your enabled bug: " : "Signal for your enabled bug: ") + check.detectedBug.label;
    }
    $("current-check").textContent = run.phase === "reporting" && run.status === "running" ? "Checks finished. Preparing your report and evidence…" :
      run.status === "running" ? (run.activeTests[0] || "Preparing the test browser…") : run.status === "completed" ? "All checks finished. Your report is ready below." : "Verification stopped. See the details below.";
  }
  function renderDetections(run) {
    const detections = run.detections || [];
    syncCatchPopup(run, detections);
    const list = $("run-detections");
    list.hidden = !detections.length;
    for (const detection of detections) {
      let row = detectionRows.get(detection.id);
      if (!row) {
        row = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = detection.label;
        const detail = document.createElement("span");
        row.append(title, detail);
        list.append(row);
        detectionRows.set(detection.id, row);
      }
      row.dataset.state = detection.state;
      const text = detection.state === "verified" ? "Caught and verified" : detection.state === "observed" ? "Bug spotted · verification continues" :
        detection.state === "pending" ? "Watching for this bug" : "Not verified · review this run";
      row.querySelector("span").textContent = text + " · " + detection.observed + "/" + detection.expected + " matching checks";
    }
    const observed = detections.filter(detection => detection.observed > 0);
    const verified = detections.filter(detection => detection.state === "verified");
    const alert = $("bug-caught-alert");
    alert.hidden = !observed.length;
    if (!observed.length) return;
    const confirmed = run.status === "completed" && run.matched && verified.length === detections.length;
    const running = run.status === "running";
    alert.dataset.state = confirmed ? "verified" : running ? "observed" : "review";
    catchSummary.hidden = !confirmed && !running;
    catchSummary.textContent = observed.length + (observed.length === 1 ? " bug " : " bugs ") + (confirmed ? "caught · verified" : "spotted · verifying");
    const title = confirmed ? verified.length === 1 ? "You enabled it. We caught it." : "You enabled these bugs. We caught them." :
      running ? "We spotted a bug you enabled" : "Bug signals found — this run needs review";
    const names = observed.map(detection => detection.label).join("; ");
    const copy = names + (confirmed ? ". All expected failures matched. Switch the bugs off and run again to verify the fix." :
      running ? ". Matching checks failed; verification is still running." : ". These signals are not a verified result. Inspect the report before rerunning.");
    if ($("bug-caught-title").textContent !== title) $("bug-caught-title").textContent = title;
    if ($("bug-caught-copy").textContent !== copy) $("bug-caught-copy").textContent = copy;
    alert.title = copy;
  }
  function renderRun(run) {
    currentRun = run;
    const running = run.status === "running";
    $("run-progress").hidden = false;
    $("run-tests").disabled = running;
    $("run-mode").disabled = running;
    $("cancel-run").hidden = !running;
    $("run-badge").textContent = running ? run.phase === "reporting" ? "Preparing report" : "Running" : run.status === "completed" ? "Finished" : run.status;
    $("test-launch-label").textContent = running ? "Running " + run.completed + "/" + (run.total || "…") : run.reportUrl ? "View report" : "Run checks";
    $("run-badge").className = "pill " + (run.status === "completed" && run.matched ? "success" : "neutral");
    $("run-status").textContent = running ? (run.phase === "reporting" ? "Preparing your pass/fail report…" : run.total ? run.completed + " of " + run.total + " checks completed" : "Starting Playwright…") :
      run.status === "completed" ? "Verification finished" : "Verification stopped";
    const progress = $("test-progress");
    progress.setAttribute("aria-valuemax", run.total || 1);
    progress.setAttribute("aria-valuenow", run.completed);
    progress.setAttribute("aria-valuetext", $("run-status").textContent);
    progress.classList.toggle("is-running", running);
    $("test-progress-fill").style.width = (run.total ? run.completed / run.total * 100 : 0) + "%";
    $("run-counts").textContent = run.passed + " passed · " + run.failed + " failed · " + run.skipped + " skipped";
    const enabled = switches.filter(input => run.bugs[input.name]).map(input => input.closest("label").querySelector("strong").textContent);
    $("run-snapshot").textContent = "This run's switches: " + (enabled.length ? enabled.join("; ") : "all off") +
      ". Settings changed during a run apply to the next run.";
    renderChecks(run);
    renderDetections(run);
    elapsed();
    if (running) return;
    clearTimeout(timer);
    clearInterval(elapsedTimer);
    $("run-result").hidden = false;
    $("run-result").classList.toggle("is-error", run.status !== "completed" || !run.matched);
    $("run-result").textContent = run.status === "completed"
      ? run.matched
        ? run.expectedFailures ? "Detection verified: exactly " + run.expectedFailures + " intended failures matched. Open a failed check to inspect its evidence."
          : "Correct build verified: every check passed."
        : "The results did not match the expected bug pattern. Review the report before calling this run verified."
      : run.error || "No complete report was produced.";
    if (run.reportUrl && shownReport !== run.id) {
      syncReportTheme();
      shownReport = run.id;
      $("open-report").hidden = false;
      $("open-report").href = run.reportUrl;
      $("open-report").target = "_blank";
      $("open-report").rel = "noopener";
      $("report-new-tab").href = run.reportUrl;
      pendingReport = run.reportUrl;
      $("toggle-report-view").hidden = false;
      $("report-section").hidden = false;
      $("report-verdict").textContent = run.status === "completed" && run.matched
        ? run.failed ? run.passed + " passed. All " + run.failed + " failures match your enabled bugs." : "All " + run.passed + " checks passed. Correct build verified."
        : "Inspect this report: the run did not match the expected result.";
      let seen = false;
      try { seen = sessionStorage.getItem("last-opened-report") === run.id; } catch { /* Optional preference. */ }
      if (!seen) {
        openDrawer();
        try { sessionStorage.setItem("last-opened-report", run.id); } catch { /* Optional preference. */ }
      }
    }
  }
  async function poll() {
    if (currentRun?.status !== "running") return;
    const requestedRun = currentRun;
    try {
      const run = await api("/api/lab/runs/" + requestedRun.id);
      if (currentRun !== requestedRun) return;
      renderRun(run);
      if (run.status === "running") timer = setTimeout(poll, 800);
    } catch (error) {
      if (currentRun !== requestedRun) return;
      if (error.status === 404) {
        renderRun({ ...currentRun, status: "error", finishedAt: new Date().toISOString(), activeTests: [],
          error: "This run expired or the server restarted. Start a new verification.", reportUrl: null });
        return;
      }
      message("Progress update failed: " + error.message + " Retrying shortly.", true);
      timer = setTimeout(poll, 2500);
    }
  }
  $("run-tests").addEventListener("click", async () => {
    $("run-tests").disabled = true;
    $("runner-message").textContent = "";
    try {
      await save();
      const run = await api("/api/lab/runs", { mode: $("run-mode").value });
      clearTimeout(timer);
      clearInterval(elapsedTimer);
      $("run-result").hidden = true;
      $("report-section").hidden = true;
      $("open-report").hidden = true;
      pendingReport = null;
      setReportView(false);
      $("toggle-report-view").hidden = true;
      checkRows.clear();
      $("run-checks").replaceChildren();
      detectionRows.clear();
      $("run-detections").replaceChildren();
      $("bug-caught-alert").hidden = true;
      $("report-frame").removeAttribute("src");
      renderRun(run);
      if (run.status === "running") {
        elapsedTimer = setInterval(elapsed, 1000);
        timer = setTimeout(poll, 500);
        message("Tests are running. The progress below comes from actual Playwright test events.");
      }
    } catch (error) {
      $("run-tests").disabled = false;
      message(error.message, true);
    }
  });
  $("cancel-run").addEventListener("click", async () => {
    try { renderRun(await api("/api/lab/runs/" + currentRun.id + "/cancel", {})); }
    catch (error) { message(error.message, true); }
  });
  api("/api/lab/state").then(async state => {
    updateSettings(state);
    if (state.lastRun) {
      try {
        renderRun(await api("/api/lab/runs/" + state.lastRun));
        if (currentRun.status === "running") { elapsedTimer = setInterval(elapsed, 1000); poll(); }
      } catch { message("The previous report has expired. Start a new verification."); }
    }
  }).catch(error => message("Could not load demo controls: " + error.message, true));
})();
