(() => {
  const bug = document.getElementById("roaming-bug");
  const dialog = document.getElementById("bug-surprise");
  if (!bug || !dialog) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pause = document.getElementById("pause-wandering");
  let fixed = false, paused = false, hovered = false, timer, motion, leap, leapLayer, heading = 0;
  let position = { x: Math.max(8, innerWidth - 56), y: Math.max(90, innerHeight - 100) };
  function free(point, from = point) {
    const left = Math.min(point.x, from.x), top = Math.min(point.y, from.y);
    const right = Math.max(point.x, from.x) + 44, bottom = Math.max(point.y, from.y) + 44;
    return ![...document.querySelectorAll("a,button,input,select,textarea,summary,[role='button']")].some(element => {
      if (element === bug || dialog.contains(element)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width && rect.height && left < rect.right + 8 && right > rect.left - 8 && top < rect.bottom + 8 && bottom > rect.top - 8;
    });
  }
  function edgePoint() {
    const side = Math.floor(Math.random() * 3);
    return side === 0 ? { x: 8, y: 90 + Math.random() * Math.max(0, innerHeight - 150) }
      : side === 1 ? { x: Math.max(8, innerWidth - 56), y: 90 + Math.random() * Math.max(0, innerHeight - 150) }
        : { x: 8 + Math.random() * Math.max(0, innerWidth - 64), y: Math.max(90, innerHeight - 56) };
  }
  function paint() { bug.style.translate = position.x + "px " + position.y + "px"; }
  function canMove() {
    return !fixed && !paused && !hovered && !reduced.matches && !document.hidden && !document.querySelector("dialog[open]")
      && !document.activeElement?.matches("input,textarea,select")
      && !(document.activeElement === bug && bug.matches(":focus-visible"));
  }
  function stop() {
    clearTimeout(timer);
    bug.classList.remove("is-walking");
    if (motion) {
      const coordinates = getComputedStyle(bug).translate.split(" ").map(parseFloat);
      if (coordinates.length >= 2 && coordinates.every(Number.isFinite)) position = { x: coordinates[0], y: coordinates[1] };
      motion.cancel(); motion = null;
    }
    paint();
  }
  function schedule(delay = 0) {
    clearTimeout(timer);
    if (canMove()) timer = setTimeout(wander, delay);
  }
  function update() {
    stop();
    bug.hidden = fixed || Boolean(document.querySelector("dialog[open]"));
    if (!bug.hidden && !free(position)) {
      let found = false;
      for (let i = 0; i < 30; i++) { const candidate = edgePoint(); if (free(candidate)) { position = candidate; found = true; break; } }
      bug.hidden = !found;
    }
    paint(); schedule();
  }
  function wander() {
    if (!canMove()) return;
    let candidate;
    const offset = Math.round((heading - 90) / 45) + Math.floor(Math.random() * 3) - 1;
    for (const distance of [72, 44, 24]) {
      for (const step of [0, 1, -1, 2, -2, 3, -3, 4]) {
        const angle = (offset + step) * Math.PI / 4;
        const point = {
          x: Math.max(8, Math.min(innerWidth - 52, position.x + Math.cos(angle) * distance)),
          y: Math.max(85, Math.min(innerHeight - 52, position.y + Math.sin(angle) * distance))
        };
        const nearEdge = point.x < 90 || point.x > innerWidth - 100 || point.y > innerHeight - 100;
        if (nearEdge && free(point, position) && Math.hypot(point.x - position.x, point.y - position.y) >= 12) { candidate = point; break; }
      }
      if (candidate) break;
    }
    if (!candidate) { bug.classList.remove("is-walking"); schedule(150); return; }
    const nextHeading = Math.atan2(candidate.y - position.y, candidate.x - position.x) * 180 / Math.PI + 90;
    heading += ((nextHeading - heading + 180) % 360 + 360) % 360 - 180;
    bug.querySelector(".lab-beetle").style.rotate = heading + "deg";
    bug.classList.add("is-walking");
    motion = bug.animate([{ translate: position.x + "px " + position.y + "px" }, { translate: candidate.x + "px " + candidate.y + "px" }], { duration: Math.hypot(candidate.x - position.x, candidate.y - position.y) / 28 * 1000, easing: "linear" });
    motion.finished.then(() => { position = candidate; motion = null; paint(); schedule(); }).catch(() => {});
  }
  bug.addEventListener("pointerenter", () => { hovered = true; stop(); });
  bug.addEventListener("pointerleave", () => { hovered = false; schedule(); });
  document.addEventListener("focusin", update);
  document.addEventListener("focusout", () => queueMicrotask(update));
  document.addEventListener("visibilitychange", update);
  document.addEventListener("scroll", update, { passive: true, capture: true });
  addEventListener("resize", () => { position = edgePoint(); update(); });
  reduced.addEventListener("change", () => { cancelLeap(); update(); });
  new MutationObserver(update).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  document.addEventListener("fieldwork:content", update);
  function cancelLeap() {
    leap?.cancel(); leap = null;
    leapLayer?.remove(); leapLayer = null;
    dialog.querySelector(".mascot-art").style.visibility = "";
  }
  bug.addEventListener("click", event => {
    stop();
    const origin = bug.getBoundingClientRect();
    dialog.showModal();
    if (reduced.matches || event.detail === 0) return;
    cancelLeap();
    const target = dialog.querySelector(".mascot-art .lab-beetle").getBoundingClientRect();
    const size = Math.min(400, innerWidth * .78);
    leapLayer = document.createElement("div");
    leapLayer.className = "mascot-leap";
    leapLayer.setAttribute("aria-hidden", "true");
    const sprite = bug.querySelector(".lab-beetle").cloneNode(true);
    sprite.removeAttribute("style");
    sprite.style.width = sprite.style.height = size + "px";
    leapLayer.append(sprite); dialog.append(leapLayer);
    dialog.querySelector(".mascot-art").style.visibility = "hidden";
    const centerX = (innerWidth - size) / 2, centerY = (innerHeight - size) / 2;
    const transform = (x, y, scale, angle) => `translate(${x}px,${y}px) scale(${scale}) rotate(${angle}deg)`;
    leap = sprite.animate([
      { transform: transform(origin.x + 22 - size / 2, origin.y + 22 - size / 2, 28 / size, 0), easing: "cubic-bezier(.23,1,.32,1)" },
      { transform: transform(centerX, centerY, 1.2, -8), offset: .46, easing: "ease-in-out" },
      { transform: transform(centerX, centerY, 1, 5), offset: .66, easing: "cubic-bezier(.23,1,.32,1)" },
      { transform: transform(target.x + target.width / 2 - size / 2, target.y + target.height / 2 - size / 2, target.width / size, 0) }
    ], { duration: 650, easing: "linear" });
    leap.finished.then(cancelLeap).catch(() => {});
  });
  document.getElementById("release-bug").addEventListener("click", () => dialog.close());
  pause.addEventListener("click", () => {
    paused = !paused; pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "Resume wandering" : "Pause wandering";
  });
  document.getElementById("fix-bug").addEventListener("click", () => {
    cancelLeap();
    fixed = true; stop();
    document.getElementById("surprise-heading").textContent = "Bug fixed.";
    document.getElementById("bug-result").textContent = "One small bug, taken care of. Refresh the page to bring it back. Your shop settings are unchanged.";
    document.getElementById("release-bug").hidden = true;
    document.getElementById("fix-bug").hidden = true;
    pause.hidden = true;
    document.getElementById("bug-done").hidden = false;
    dialog.classList.add("is-fixed");
    document.getElementById("bug-done").focus();
  });
  document.getElementById("bug-done").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    cancelLeap();
    hovered = false; update();
    if (fixed) document.querySelector(".mobile-brand,.sidebar .brand")?.focus({ preventScroll: true });
    else { bug.hidden = false; bug.focus({ preventScroll: true }); }
  });
  update();
})();
