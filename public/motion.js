(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const active = new WeakMap();
  let keyboard = false;
  document.documentElement.dataset.input = "pointer";
  document.addEventListener("keydown", () => { keyboard = true; document.documentElement.dataset.input = "keyboard"; }, true);
  document.addEventListener("pointerdown", () => { keyboard = false; document.documentElement.dataset.input = "pointer"; }, true);
  function cancel(element) { active.get(element)?.cancel(); active.delete(element); }
  function run(element, frames, duration, finish) {
    if (active.has(element)) {
      const style = getComputedStyle(element);
      frames = [{ opacity: style.opacity, transform: style.transform }, ...frames.slice(1)];
    }
    cancel(element);
    if (keyboard || !element.animate) { finish?.(); return; }
    if (reduced.matches) frames = frames.map(frame => ({ opacity: frame.opacity }));
    const animation = element.animate(frames, { duration: reduced.matches ? 80 : duration, easing: "cubic-bezier(.23,1,.32,1)", fill: "both" });
    active.set(element, animation);
    animation.finished.then(() => {
      if (active.get(element) !== animation) return;
      active.delete(element); animation.cancel(); finish?.();
    }).catch(() => {});
  }
  const closed = kind => ({ opacity: 0, transform: kind === "drawer" ? "translateX(-24px)" : kind === "toast" ? "translateY(8px)" : "translateY(-3px) scale(.97)" });
  // Pointer tilt on product imagery only — no layout movement, fine pointers only.
  (() => {
    const fine = matchMedia("(pointer: fine)");
    if (!fine.matches) return;
    const MAX = 6;
    function bind(card) {
      const panel = card.querySelector(".art-panel");
      if (!panel || panel.dataset.tilt) return;
      panel.dataset.tilt = "1";
      card.addEventListener("pointermove", event => {
        if (reduced.matches || keyboard) return;
        const box = panel.getBoundingClientRect();
        const px = (event.clientX - box.left) / box.width - 0.5;
        const py = (event.clientY - box.top) / box.height - 0.5;
        panel.style.transform = "perspective(600px) rotateX(" + (-py * MAX).toFixed(2) + "deg) rotateY(" + (px * MAX).toFixed(2) + "deg)";
      });
      card.addEventListener("pointerleave", () => { panel.style.transform = ""; });
    }
    const scan = () => document.querySelectorAll(".product-card").forEach(bind);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scan);
    else scan();
  })();
  window.FieldworkMotion = {
    enter(element, kind = "popover", trigger) {
      if (trigger) {
        const panel = element.getBoundingClientRect(), anchor = trigger.getBoundingClientRect();
        element.style.transformOrigin = Math.max(0, Math.min(panel.width, anchor.left + anchor.width / 2 - panel.left)) + "px 0px";
      }
      run(element, [closed(kind), { opacity: 1, transform: "none" }], kind === "popover" ? 160 : 180);
    },
    exit(element, finish, kind = "popover", immediate = false) {
      if (immediate) { cancel(element); finish(); return; }
      const style = getComputedStyle(element);
      run(element, [{ opacity: style.opacity, transform: style.transform }, closed(kind)], 120, finish);
    },
    cancel
  };
})();
