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

// Scroll tells the rule -> bug -> evidence story; it never changes lab settings.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let hero, story, chapters = [], frame = null, active = -1, chromeEls = [], chromeTop = -1, visual = null, snapWatcher = null;
  const clamp = value => Math.max(0, Math.min(1, value));
  const words = ["RULE.", "BUG.", "PROOF."];
  const captions = ["Reading the rule", "Understanding the bug", "Inspecting the evidence"];
  function paint() {
    frame = null;
    if (!story?.isConnected || document.hidden) return;
    const height = innerHeight;
    const chrome = Math.round(chromeEls.reduce((low, el) => Math.max(low, el.getBoundingClientRect().bottom), 0));
    if (chrome !== chromeTop) {
      chromeTop = chrome;
      document.documentElement.style.setProperty("--field-chrome", chrome + "px");
    }
    const heroBox = hero.getBoundingClientRect();
    // Depth: the photograph, the headline and the veil each move at their own rate,
    // so scrolling past the hero reads as parallax rather than a flat slide.
    const heroProgress = clamp(-heroBox.top / Math.max(1, heroBox.height));
    if (!reduced.matches) {
      hero.style.setProperty("--hero-drift", (heroProgress * 64).toFixed(2) + "px");
      hero.style.setProperty("--hero-copy-drift", (heroProgress * 24).toFixed(2) + "px");
      hero.style.setProperty("--hero-veil", heroProgress.toFixed(3));
    }
    const centers = chapters.map(chapter => {
      const box = chapter.getBoundingClientRect();
      const drift = chapter.matches(":focus-within") ? 0 : parseFloat(chapter.style.getPropertyValue("--chapter-drift")) || 0;
      return box.top + box.height / 2 - drift;
    });
    const focus = height * .52;
    // Progress and the active scene both come from one continuous traversal of the
    // chapter column, so every scene owns an equal share of the scroll distance and
    // none can be skipped when chapters sit close together.
    const first = chapters[0].getBoundingClientRect();
    const last = chapters.at(-1).getBoundingClientRect();
    const span = Math.max(1, last.top + last.height - first.top);
    const progress = clamp((focus - first.top) / span);
    story.style.setProperty("--trail-progress", progress.toFixed(3));
    // When the container releases the pinned panel it slides under the sticky header
    // and would be visibly sliced. Fade on the measured overlap, not on progress, so
    // the fade tracks the real cut at any window height.
    if (visual && !reduced.matches) {
      const overlap = chrome - visual.getBoundingClientRect().top;
      story.style.setProperty("--visual-exit", clamp(overlap / 70).toFixed(3));
    }
    const next = Math.min(chapters.length - 1, Math.max(0, Math.floor(progress * chapters.length)));
    if (!reduced.matches) chapters.forEach((chapter, index) => {
      const proximity = clamp(1 - Math.abs(centers[index] - focus) / (height * .65));
      chapter.style.setProperty("--chapter-presence", (.8 + proximity * .2).toFixed(3));
      chapter.style.setProperty("--chapter-drift", (Math.sign(centers[index] - focus) * (1 - proximity) * 22).toFixed(2) + "px");
    });
    if (next !== active) {
      active = next;
      story.dataset.scene = String(next);
      document.documentElement.dataset.fieldScene = String(next);
      story.querySelector(".field-scene-word").textContent = words[next];
      story.querySelector(".field-scene-caption strong").textContent = captions[next];
    }
  }
  function schedule() {
    if (frame === null && story) frame = requestAnimationFrame(paint);
  }
  function scan() {
    hero = document.querySelector(".field-hero");
    story = document.querySelector(".field-scroll-story");
    // The pinned panel must clear whatever sticky chrome sits above it; the
    // header stack differs between the storefront and lab layouts, so measure
    // it instead of assuming a height.
    chromeEls = [...document.querySelectorAll(".app-shell>.sidebar,.workspace>.topbar,.topbar,.shop-lab")]
      .filter(el => getComputedStyle(el).position === "sticky");
    visual = document.querySelector(".field-scroll-visual");
    // .main keeps a transform from its page-in animation (fill mode "both"), which
    // makes it the containing block for position:fixed. Hosting the backdrop on the
    // body instead is what lets it behave as a real fixed stage.
    const backdrop = document.querySelector(".field-backdrop");
    if (backdrop && backdrop.parentElement !== document.body) document.body.append(backdrop);
    // Snapping is armed only while the story is in view. Toggling the mode on the
    // document (rather than leaving it on permanently) keeps the hero and the
    // sections below it free of snap points, so the reader cannot get stuck.
    snapWatcher?.disconnect();
    if (story && "IntersectionObserver" in window) {
      snapWatcher = new IntersectionObserver(entries => {
        for (const entry of entries) {
          document.documentElement.classList.toggle("is-snapping", entry.isIntersecting && !reduced.matches);
        }
      }, { threshold: 0, rootMargin: "-25% 0px -25% 0px" });
      snapWatcher.observe(story);
    } else {
      document.documentElement.classList.remove("is-snapping");
    }
    chapters = [...document.querySelectorAll("[data-field-chapter]")];
    active = -1;
    document.documentElement.classList.toggle("has-field-story", Boolean(hero && story));
    document.documentElement.classList.toggle("has-field-motion", Boolean(hero && story && !reduced.matches));
    if (reduced.matches && story) {
      story.removeAttribute("data-scene");
      story.style.removeProperty("--trail-progress");
      story.style.removeProperty("--visual-exit");
      story.querySelector(".field-scene-word").textContent = words[0];
      story.querySelector(".field-scene-caption strong").textContent = captions[0];
    }
    schedule();
  }
  // One wheel gesture, one scene. CSS scroll-snap alone is unreliable here: the
  // proximity threshold rarely engages across these distances, and mandatory
  // snapping traps the reader at the final scene because nothing below the story
  // is a snap point. So advance deliberately, and hand control straight back to
  // the page at either end, which is what makes escaping impossible to get wrong.
  const SNAP_GAP = 24;
  let snapLock = 0;
  function snapLine() {
    // Measured at gesture time: the header stack reports a different height before
    // it pins, and using a stale value lands the scene a few pixels out.
    const chrome = chromeEls.reduce((low, el) => Math.max(low, el.getBoundingClientRect().bottom), 0);
    return (chrome || (chromeTop >= 0 ? chromeTop : 120)) + SNAP_GAP;
  }
  // A scene at rest sits a little off the snap line, so anything within NEAR_SCENE
  // counts as "the one you are already on". With a tight tolerance the scene just
  // below the line resolved as the next target, the page moved a few pixels, and the
  // gesture looked ignored - which is why a second scroll was sometimes needed.
  // A scene counts as the one you are on once it occupies most of the screen, not
  // merely when its edge is near the line. With a small flat tolerance a scene sitting
  // (say) 80px low was treated as "not reached yet", so the first gesture only nudged
  // it into place and a second was needed to actually advance - the double scroll.
  const nearScene = () => Math.max(64, innerHeight * 0.4);
  function nextChapter(direction) {
    const line = snapLine();
    const NEAR_SCENE = nearScene();
    const tops = chapters.map(chapter => chapter.getBoundingClientRect().top);
    if (direction > 0) {
      const index = tops.findIndex(top => top > line + NEAR_SCENE);
      return index === -1 ? null : chapters[index];
    }
    let index = -1;
    tops.forEach((top, position) => { if (top < line - NEAR_SCENE) index = position; });
    return index === -1 ? null : chapters[index];
  }
  addEventListener("wheel", event => {
    if (reduced.matches || event.ctrlKey || !chapters.length) return;
    if (!document.documentElement.classList.contains("is-snapping")) return;
    if (Math.abs(event.deltaY) < 8) return;
    const now = Date.now();
    if (now < snapLock) { event.preventDefault(); return; }
    const target = nextChapter(Math.sign(event.deltaY));
    if (!target) return; // past the first or last scene: let the page scroll normally
    event.preventDefault();
    snapLock = now + 480;
    scrollTo({ top: scrollY + target.getBoundingClientRect().top - snapLine(), behavior: "smooth" });
  }, { passive: false });

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("fieldwork:content", scan);
  reduced.addEventListener("change", scan);
  scan();
})();
