(() => {
  const bug = document.getElementById("roaming-bug");
  const pause = document.getElementById("pause-bug");
  const leap = document.getElementById("bug-leap");
  const sprite = leap.querySelector(".lab-beetle");
  const surprise = document.getElementById("bug-surprise");
  const release = document.getElementById("release-bug");
  const fix = document.getElementById("fix-bug");
  const stage = surprise.querySelector(".surprise-stage .lab-beetle");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false, catching = false, fixed = false, fixing = false, pointer = null, animation, last = 0, elapsed = 0;
  let width = innerWidth, height = innerHeight;
  let x = Math.max(12, width - 100), y = Math.max(100, height - 150), angle = 0;
  let target = { x: 24, y: Math.max(100, height - 100) }, obstacles = [];
  try { paused = localStorage.getItem("fieldwork-bug-paused") === "1"; } catch { /* Optional preference. */ }
  function paint() { bug.style.transform = `translate(${x}px,${y}px)`; bug.style.setProperty("--bug-angle", angle + "deg"); }
  function updatePause() {
    const stopped = paused || reduced.matches;
    pause.setAttribute("aria-pressed", String(stopped));
    pause.setAttribute("aria-label", stopped ? "Resume roaming bug" : "Pause roaming bug");
    pause.title = stopped ? "Resume roaming bug" : "Pause roaming bug";
    bug.classList.toggle("is-resting", stopped);
    pause.hidden = fixed || reduced.matches;
  }
  function chooseTarget() {
    for (let attempt = 0; attempt < 30; attempt++) {
      target = { x: 12 + Math.random() * Math.max(0, width - 80), y: 110 + Math.random() * Math.max(0, height - 200) };
      if (!blocked(target.x, target.y)) break;
    }
  }
  function scan() {
    obstacles = [...document.querySelectorAll("a,button,input,select,summary,textarea")].filter(el => el !== bug).map(el => el.getBoundingClientRect()).filter(b => b.width && b.height);
    if (!pointer && !paused && !reduced.matches && !catching && !fixed && !document.querySelector("dialog[open]") && document.activeElement !== bug && blocked(x, y)) {
      chooseTarget();
      if (!blocked(target.x, target.y)) { x = target.x; y = target.y; paint(); chooseTarget(); }
    }
  }
  function blocked(left, top) {
    return obstacles.some(b => left < b.right + 6 && left + 52 > b.left - 6 && top < b.bottom + 6 && top + 52 > b.top - 6);
  }
  function tick(now) {
    const dt = Math.min(40, now - (last || now)); last = now; elapsed += dt;
    const modal = Boolean(document.querySelector("dialog[open]"));
    bug.style.visibility = modal || catching || fixed ? "hidden" : "visible";
    pause.hidden = modal || catching || fixed || reduced.matches;
    bug.style.pointerEvents = blocked(x, y) ? "none" : "auto";
    if (elapsed > 350) { scan(); elapsed = 0; }
    if (!document.hidden && !modal && !paused && !reduced.matches && !catching && !fixed && document.activeElement !== bug) {
      if (pointer) {
        const orbit = Math.hypot(pointer.x - x - 26, pointer.y - y - 26) < 54 ? 18 : 0;
        target = {
          x: Math.max(8, Math.min(width - 60, pointer.x - 26 + Math.cos(now / 450) * orbit)),
          y: Math.max(8, Math.min(height - 60, pointer.y - 26 + Math.sin(now / 450) * orbit))
        };
      }
      const dx = target.x - x, dy = target.y - y, distance = Math.hypot(dx, dy);
      if (!pointer && distance < 6) chooseTarget();
      else if (distance > .1) {
        const step = Math.min(distance, dt * (pointer ? .18 : .042));
        const nextX = x + dx / distance * step, nextY = y + dy / distance * step;
        if (!pointer && blocked(nextX, nextY) && !blocked(x, y)) chooseTarget();
        else { x = nextX; y = nextY; angle = Math.atan2(dy, dx) * 180 / Math.PI + 90; paint(); }
      }
    }
    requestAnimationFrame(tick);
  }
  pause.addEventListener("click", () => {
    if (reduced.matches) { bug.focus(); return; }
    paused = !paused;
    try { localStorage.setItem("fieldwork-bug-paused", paused ? "1" : "0"); } catch { /* Optional preference. */ }
    updatePause();
  });
  reduced.addEventListener("change", () => { updatePause(); if (reduced.matches && (catching || fixing)) animation?.finish(); });
  document.addEventListener("pointermove", event => {
    if (event.pointerType !== "touch") pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { pointer = null; chooseTarget(); });
  addEventListener("resize", () => {
    width = innerWidth; height = innerHeight;
    x = Math.max(8, Math.min(x, width - 60)); y = Math.max(8, Math.min(y, height - 60));
    chooseTarget(); scan(); paint();
  });
  bug.addEventListener("click", async () => {
    if (catching) return;
    catching = true;
    const bounds = bug.getBoundingClientRect();
    bug.style.visibility = "hidden";
    surprise.returnValue = "";
    surprise.showModal();
    surprise.classList.add("is-jumping");
    release.disabled = fix.disabled = true;
    if (!reduced.matches) {
      leap.hidden = false;
      const end = stage.getBoundingClientRect();
      const size = end.width;
      sprite.style.width = size + "px"; sprite.style.height = size + "px";
      animation = sprite.animate([
        { transform: `translate(${bounds.x + 26 - size / 2}px,${bounds.y + 26 - size / 2}px) scale(${52 / size}) rotate(${angle}deg)`, opacity: 1 },
        { transform: `translate(${end.x}px,${end.y}px) scale(1.35) rotate(-5deg)`, opacity: 1, offset: .7 },
        { transform: `translate(${end.x}px,${end.y}px) scale(1) rotate(0deg)`, opacity: 1 }
      ], { duration: 600, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" });
      await animation.finished.catch(() => {});
      leap.hidden = true; animation.cancel();
    }
    surprise.classList.remove("is-jumping");
    release.disabled = fix.disabled = false;
    catching = false;
  });
  release.addEventListener("click", () => {
    surprise.close("roam");
  });
  fix.addEventListener("click", async () => {
    if (fixing || fixed) return;
    fixed = fixing = true;
    release.disabled = fix.disabled = true;
    animation = stage.animate(reduced.matches ? [{ opacity: 1 }, { opacity: 0 }] : [
      { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
      { transform: "translate(-12vw,-5vh) rotate(-25deg) scale(.85)", opacity: 1, offset: .2 },
      { transform: "translate(110vw,-65vh) rotate(190deg) scale(.15)", opacity: 0 }
    ], { duration: reduced.matches ? 150 : 650, easing: "ease-in", fill: "forwards" });
    await animation.finished.catch(() => {});
    fixing = false;
    surprise.classList.add("is-fixed");
    document.getElementById("surprise-heading").textContent = "Bug Fixeddd!";
    document.getElementById("bug-caption").textContent = "BUG HUNTER: 1 · BUG: 0";
    document.getElementById("bug-result").textContent = "Thrown out! Refresh the page for another bug hunt.";
    release.hidden = fix.hidden = true;
    document.getElementById("bug-done").hidden = false;
    if (surprise.open) document.querySelector("#bug-done button").focus();
  });
  surprise.addEventListener("close", () => {
    catching = false; animation?.cancel(); leap.hidden = true;
    surprise.classList.remove("is-jumping");
    if (fixed) {
      bug.hidden = pause.hidden = true;
      document.querySelector(".home-header .brand,.sidebar .brand,.login-tools a,a[href='/']")?.focus({ preventScroll: true });
    } else {
      paused = false; chooseTarget();
      try { localStorage.setItem("fieldwork-bug-paused", "0"); } catch { /* Optional preference. */ }
      updatePause();
      bug.style.visibility = "visible";
      (reduced.matches ? bug : pause).focus({ preventScroll: true });
    }
  });
  scan(); paint(); updatePause(); requestAnimationFrame(tick);
})();
