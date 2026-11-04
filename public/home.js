// Landing-page scroll reveals and number entrance. Progressive enhancement only:
// without this script every element is already visible; the ticker animates in CSS.
(() => {
  const main = document.querySelector(".home-main");
  if (!main || !("IntersectionObserver" in window)) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const observer = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("reveal-in");
      obs.unobserve(entry.target);
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });

  const perParent = new Map();
  for (const el of main.querySelectorAll("[data-reveal]")) {
    // Leave anything already on screen visible; only pre-hide what's below the fold,
    // so there is no above-the-fold flash on load.
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) continue;
    el.classList.add("reveal-init");
    const n = perParent.get(el.parentElement) || 0;
    el.style.transitionDelay = n * 50 + "ms";
    perParent.set(el.parentElement, n + 1);
    observer.observe(el);
  }
})();
