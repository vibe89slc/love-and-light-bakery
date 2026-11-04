/* ===== Home scroll story =====
   Native scrolling only — nothing here calls preventDefault. The page is tall
   (.story-scroll); .story-pin sticks for the ride, and every visual is a pure
   function of scroll position, smoothed with a short lerp:

     track      four chapters slide horizontally, one viewport per chapter
     donut      rolls the opposite way between chapters (donut-3d.js adds
                lean + swell from the velocity this produces)
     backdrop   chapter washes crossfade
     sprinkles  drift at a slower rate (third parallax depth)
     copy       eases in as its chapter arrives

   Each chapter has a dwell (no horizontal motion) so it can be read, then a
   travel. If scrolling stops partway through a travel, the page glides to the
   nearest chapter so the story never rests between two chapters.

   Below 900px the chapters stack natively; the donut stays pinned and spins. */
(function () {
  var donut = document.getElementById("rolling-donut");
  var story = document.getElementById("story-scroll");
  var track = document.getElementById("stage-stack");
  if (!donut || !story || !track) return;

  var body = document.body;
  var pin = story.querySelector(".story-pin");
  var slides = Array.prototype.slice.call(track.querySelectorAll(".slide"));
  var inners = slides.map(function (s) { return s.querySelector(".panel__inner"); });
  var backdrops = Array.prototype.slice.call(document.querySelectorAll("#backdrop-stack .backdrop-slide"));
  var orbs = Array.prototype.slice.call(document.querySelectorAll(".ambient__orb"));
  var sprinkleField = null;

  var count = slides.length;
  var travels = Math.max(1, count - 1);
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- tuning ---- */
  var MOBILE_MAX_PX = 899;
  var SEGMENT_VH = 1.45;        // scroll distance per chapter, in viewport heights
  var DWELL = 0.46;             // share of each segment with no horizontal motion (split both ends)
  var SMOOTH = 0.11;            // lerp toward target each frame
  var REVEAL_NEAR = 0.12;       // chapter-distance where copy is fully in
  var REVEAL_FAR = 0.62;        // chapter-distance where copy is fully out
  var DONUT_VISIBLE_FRAC = 0.44;
  var DOCK_PX = 208;            // box size of the donut once it sits in the flavor card (disc is ~72% of it)
  var FRONT_AT = 0.4;           // chapter-distance into the hero→menu roll where the donut comes in front of the copy
  var ROLL_DEG_PER_CHAPTER = 540;
  var HERO_MAG_MIN = 1.2;       // giant opening donut, as a multiple of --donut-size
  var HERO_MAG_MAX = 1.75;
  var HERO_Y_VH = -0.05;        // opening donut sits a touch above center (shelf runs along the bottom)
  var INTRO_MS = 1700;          // roll-in from off-screen on first paint
  var INTRO_ROLL_DEG = 420;
  var SNAP_IDLE_MS = 140;       // quiet time after the last scroll event before snapping
  var SNAP_DEADBAND = 0.03;     // chapter-distance treated as "already parked"
  var MOBILE_ROT_PER_PX = 0.48;
  var MOBILE_DRIFT_PER_PX = -0.06;

  var mode = null;              // "story" | "stack"
  var pos = 0;                  // displayed chapter position (0 .. travels)
  var posTarget = 0;
  var rafId = null;
  var pinW = 0;
  var segmentPx = 0;
  var mobileRaf = null;
  var observer = null;
  var introDone = false;
  var introStart = null;        // performance.now() when the roll-in began, null when done/skipped
  var snapTimer = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function isStoryWidth() {
    return !prefersReduced && window.innerWidth > MOBILE_MAX_PX;
  }

  /* Donut center-x when parked on the left vs right edge (44% of it stays on-screen). */
  function parkX(side, frac) {
    var half = donut.getBoundingClientRect().width / 2;
    if (half < 6) half = Math.min(window.innerWidth * 0.3, 300);
    var visible = (frac || DONUT_VISIBLE_FRAC) * 2 * half;
    return side === "left" ? visible - half : window.innerWidth - visible + half;
  }
  function chapterSide(k) { return k % 2 === 0 ? "right" : "left"; }
  function chapterPark(k) { return parkX(chapterSide(k), DONUT_VISIBLE_FRAC); }
  /* Roll direction per crossing: hero→card (left), card→chapter 2 re-entry (left), then alternating. */
  function segRoll(i) { return (i === 1 || i % 2 === 0) ? -ROLL_DEG_PER_CHAPTER : ROLL_DEG_PER_CHAPTER; }

  /* Chapter 1: the donut lands in the flavor card's stage and becomes the Homer.
     Dock position is measured live (relative to the pin) and corrected for the
     track offset, so it is where the stage will be once chapter 1 is parked. */
  var dockEl = document.getElementById("machine-pick-stage");
  var flavorIdx = 0;            // flavor shown on the card; 0 is the Homer, which the rolling donut plays
  var frontOn = false;
  var handedOff = false;
  var dockedOn = false;
  function dockTarget() {
    if (!dockEl) return { x: parkX("left", 0.16), y: 0, ok: false };
    var r = dockEl.getBoundingClientRect();
    var s = pin.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - s.left + (pos - 1) * pinW,
      y: r.top + r.height / 2 - (s.top + s.height / 2) - 7, /* the contact shadow hangs below, so sit a touch high */
      ok: r.width > 0
    };
  }
  function setFlag(el, cls, on, cur) {
    if (on !== cur) el.classList.toggle(cls, on);
    return on;
  }
  function easeOutCubic(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }

  /* Opening chapter: the donut is huge and hangs off the right edge beside the copy column. */
  function heroMag() {
    return clamp((window.innerWidth - 560) / 560, HERO_MAG_MIN, HERO_MAG_MAX);
  }
  function heroX(mag) {
    var half = donut.getBoundingClientRect().width / 2;
    if (half < 6) half = Math.min(window.innerWidth * 0.3, 300);
    var diam = 2 * half * mag;
    var visible = 0.58 + 0.14 * clamp((window.innerWidth - 1000) / 600, 0, 1);
    return window.innerWidth - visible * diam + diam / 2;
  }

  /* ---------- layout ---------- */
  function layoutStory() {
    var vh = window.innerHeight;
    pinW = pin.clientWidth || window.innerWidth;
    segmentPx = vh * SEGMENT_VH;
    story.style.setProperty("--story-h", (travels * segmentPx + vh) + "px");
  }

  function clearStory() {
    story.style.removeProperty("--story-h");
    track.style.removeProperty("--track-x");
    donut.style.removeProperty("--donut-mag");
    frontOn = setFlag(body, "is-donut-front", false, frontOn);
    handedOff = setFlag(donut, "is-handed-off", false, handedOff);
    dockedOn = setFlag(body, "is-donut-docked", false, dockedOn);
    introStart = null;
    inners.forEach(function (el) { if (el) { el.style.opacity = ""; el.style.transform = ""; } });
    backdrops.forEach(function (b) { b.style.opacity = ""; });
    orbs.forEach(function (o) { o.style.transform = ""; });
    if (sprinkleField) sprinkleField.style.transform = "";
  }

  /* ---------- story mode ---------- */
  function targetFromScroll() {
    var raw = clamp(window.scrollY / Math.max(1, segmentPx), 0, travels);
    var seg = Math.min(Math.floor(raw), travels - 1);
    var u = raw - seg;
    var half = DWELL / 2;
    var t = smooth((u - half) / (1 - DWELL));
    return seg + t;
  }

  function renderStory() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    track.style.setProperty("--track-x", (-pos * pinW).toFixed(2) + "px");

    slides.forEach(function (slide, k) {
      var d = Math.abs(k - pos);
      var reveal = 1 - clamp((d - REVEAL_NEAR) / (REVEAL_FAR - REVEAL_NEAR), 0, 1);
      var inner = inners[k];
      if (inner) {
        inner.style.opacity = reveal.toFixed(3);
        inner.style.transform = "translate3d(0, " + ((1 - reveal) * 30).toFixed(2) + "px, 0) scale(" + (0.985 + reveal * 0.015).toFixed(4) + ")";
      }
      if (backdrops[k]) backdrops[k].style.opacity = (1 - clamp(d, 0, 1)).toFixed(3);
    });

    /* Donut: between chapters it crosses from one park to the other, rolling as it goes.
       Chapter 0 is the giant: it shrinks to normal size as it rolls into chapter 1. */
    var seg = Math.min(Math.floor(pos), travels - 1);
    var f = clamp(pos - seg, 0, 1);
    var mag0 = heroMag();
    var base = donut.getBoundingClientRect().width || 600;
    var dk = dockTarget();
    var dockMag = dk.ok ? DOCK_PX / base : 1;
    /* Share of the card→chapter-2 segment during which the donut rides out with the card. */
    var exitF = dk.ok ? clamp((dk.x + dockMag * base * 0.62) / Math.max(1, pinW), 0.05, 0.6) : 0;
    var x, y, mag, front = false;
    var rot = 0;
    for (var i = 0; i < seg; i += 1) rot += segRoll(i);
    if (seg === 0) {
      /* Giant hero donut rolls in and shrinks onto the card's stage (the stage itself is still sliding in). */
      x = lerp(heroX(mag0), dk.x + (1 - pos) * pinW, f);
      y = lerp(HERO_Y_VH * vh, dk.ok ? dk.y : 0, f);
      mag = lerp(mag0, dockMag, f);
      rot += segRoll(0) * f;
      front = dk.ok && f >= FRONT_AT;
    } else if (seg === 1 && dk.ok && f < exitF) {
      /* Sitting on the card: carried off the left edge with it. */
      x = dk.x - f * pinW;
      y = dk.y;
      mag = dockMag;
      front = true;
    } else if (seg === 1 && dk.ok) {
      /* ...then rolls back in from the right for chapter 2. */
      var g = (f - exitF) / (1 - exitF);
      x = lerp(vw + base * 0.75, chapterPark(2), g);
      y = 0;
      mag = 1;
      rot += segRoll(1) * g;
    } else {
      x = lerp(chapterPark(seg), chapterPark(seg + 1), f);
      y = 0;
      mag = 1;
      rot += segRoll(seg) * f;
    }
    frontOn = setFlag(body, "is-donut-front", front, frontOn);
    handedOff = setFlag(donut, "is-handed-off", dk.ok && flavorIdx !== 0 && pos > 0.55 && pos < 1 + exitF, handedOff);

    /* First paint: roll in from past the right edge, fading out once the visitor scrolls. */
    if (introStart !== null) {
      var e = easeOutCubic((performance.now() - introStart) / INTRO_MS);
      var w = (1 - e) * (1 - clamp(pos * 3, 0, 1));
      if (e >= 1) introStart = null;
      x += w * (vw + mag0 * base * 0.6 - heroX(mag0));
      rot -= w * INTRO_ROLL_DEG;
    }

    donut.style.setProperty("--donut-x", x.toFixed(2) + "px");
    donut.style.setProperty("--donut-rot", rot.toFixed(2) + "deg");
    donut.style.setProperty("--donut-mag", mag.toFixed(4));
    donut.style.setProperty("--donut-y", y.toFixed(1) + "px");

    /* Slow layers. */
    var p = pos / travels;
    var drift = p * vw * 0.08;
    if (orbs[0]) orbs[0].style.transform = "translate3d(" + (drift * 0.6).toFixed(1) + "px, " + (p * vh * 0.04).toFixed(1) + "px, 0)";
    if (orbs[1]) orbs[1].style.transform = "translate3d(" + (-drift * 0.5).toFixed(1) + "px, " + (p * vh * 0.05).toFixed(1) + "px, 0)";
    if (orbs[2]) orbs[2].style.transform = "translate3d(" + (drift * 0.35).toFixed(1) + "px, " + (-p * vh * 0.02).toFixed(1) + "px, 0)";
    if (!sprinkleField) sprinkleField = document.querySelector(".sprinkle-field");
    if (sprinkleField) sprinkleField.style.transform = "translate3d(" + (-pos * vw * 0.07).toFixed(1) + "px, 0, 0)";
  }

  function frame() {
    rafId = null;
    posTarget = targetFromScroll();
    var diff = posTarget - pos;
    if (Math.abs(diff) < 0.0004 && introStart === null) {
      pos = posTarget;
      renderStory();
      return; // settled; next scroll event wakes us
    }
    if (Math.abs(diff) < 0.0004) pos = posTarget;
    pos += diff * SMOOTH;
    renderStory();
    rafId = window.requestAnimationFrame(frame);
  }

  function wake() {
    if (rafId === null) rafId = window.requestAnimationFrame(frame);
  }

  /* Snap: once scrolling goes quiet mid-travel, glide to the nearest chapter.
     Native smooth scroll keeps firing scroll events, so the timer simply
     re-arms until the glide ends inside a dwell, where there is nothing to do. */
  function nearestChapterScroll() {
    var raw = clamp(window.scrollY / Math.max(1, segmentPx), 0, travels);
    var seg = Math.min(Math.floor(raw), travels - 1);
    var u = raw - seg;
    var half = DWELL / 2;
    var t = (u - half) / (1 - DWELL);
    if (t <= SNAP_DEADBAND || t >= 1 - SNAP_DEADBAND) return null;
    return Math.round((t < 0.5 ? seg : seg + 1) * segmentPx);
  }
  function maybeSnap() {
    snapTimer = null;
    if (mode !== "story" || introStart !== null) return;
    var want = nearestChapterScroll();
    if (want === null || Math.abs(want - window.scrollY) < 1) return;
    window.scrollTo({ top: want, behavior: reduceMotion ? "auto" : "smooth" });
  }
  function armSnap() {
    if (snapTimer !== null) window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(maybeSnap, SNAP_IDLE_MS);
  }

  /* ---------- stacked (phone / tablet) mode ---------- */
  function renderStack() {
    mobileRaf = null;
    var y = window.scrollY;
    donut.style.setProperty("--donut-x", parkX("right").toFixed(2) + "px");
    donut.style.setProperty("--donut-rot", (y * MOBILE_ROT_PER_PX).toFixed(2) + "deg");
    donut.style.setProperty("--donut-y", clamp(y * MOBILE_DRIFT_PER_PX, -140, 0).toFixed(1) + "px");
  }

  function wakeStack() {
    if (mobileRaf === null) mobileRaf = window.requestAnimationFrame(renderStack);
  }

  function observeStack() {
    if (observer || !("IntersectionObserver" in window)) {
      if (!observer) inners.forEach(function (el) { if (el) el.classList.add("is-in"); });
      return;
    }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          observer.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    inners.forEach(function (el) { if (el) observer.observe(el); });
  }

  /* ---------- mode switching ---------- */
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    body.style.setProperty("--slide-count", String(count));
    if (prefersReduced) {
      body.classList.remove("is-push-stage", "is-mobile-stack");
      clearStory();
      return;
    }
    if (mode === "story") {
      body.classList.add("is-push-stage");
      body.classList.remove("is-mobile-stack");
      dockedOn = setFlag(body, "is-donut-docked", flavorIdx === 0, dockedOn);
      donut.style.removeProperty("--donut-y");
      inners.forEach(function (el) { if (el) el.classList.remove("is-in"); });
      layoutStory();
      pos = posTarget = targetFromScroll();
      if (window.scrollY < 8 && introStart === null && !introDone) {
        introStart = performance.now();
        introDone = true;
      }
      renderStory();
      if (introStart !== null) wake();
    } else {
      body.classList.add("is-mobile-stack");
      body.classList.remove("is-push-stage");
      clearStory();
      observeStack();
      renderStack();
    }
  }

  function onResize() {
    var next = prefersReduced ? "reduced" : (isStoryWidth() ? "story" : "stack");
    if (next !== mode) { setMode(next); return; }
    if (mode === "story") { layoutStory(); pos = posTarget = targetFromScroll(); renderStory(); }
    else if (mode === "stack") renderStack();
  }

  function onScroll() {
    if (mode === "story") { wake(); armSnap(); }
    else if (mode === "stack") wakeStack();
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "auto";

  /* Keyboard: tabbing into another chapter scrolls the page to that chapter, so
     focus is never on something off-screen. The browser also tries to reveal the
     focused element by scrolling the (overflow: hidden) pin itself; undo that. */
  function chapterOf(el) {
    for (var k = 0; k < slides.length; k += 1) if (slides[k].contains(el)) return k;
    return -1;
  }
  function resetPinScroll() {
    if (pin.scrollLeft) pin.scrollLeft = 0;
    if (pin.scrollTop) pin.scrollTop = 0;
  }
  pin.addEventListener("scroll", resetPinScroll, { passive: true });
  track.addEventListener("focusin", function (e) {
    if (mode !== "story") return;
    resetPinScroll();
    var k = chapterOf(e.target);
    if (k < 0) return;
    var want = Math.round(k * segmentPx);
    if (Math.abs(targetFromScroll() - k) > 0.02) {
      window.scrollTo(0, want);
      wake();
    }
  });

  /* The flavor card tells us what it shows. The rolling donut plays the Homer (flavor 0);
     any other pick hands the card's stage back to its own illustration. */
  document.addEventListener("llb:flavor", function (e) {
    flavorIdx = e.detail && typeof e.detail.index === "number" ? e.detail.index : 0;
    if (mode === "story") {
      dockedOn = setFlag(body, "is-donut-docked", flavorIdx === 0, dockedOn);
      renderStory();
    }
  });

  setMode(prefersReduced ? "reduced" : (isStoryWidth() ? "story" : "stack"));
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("load", onResize);
})();
