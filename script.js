/* ===== Home scroll =====
   An ordinary vertical page on every width. Nothing here calls preventDefault,
   snaps, or moves the page: the browser owns the scroll. The donut is the
   parallax layer — a fixed object whose position, size and roll are a smoothed
   function of how far down the page is.

   Desktop ("flow"):
     hero      giant donut beside the copy column
     menu      it rolls down and lands in the flavor card as the Homer, then
               rides with the card as the card scrolls away
     later     parks on alternate sides, hopping across as each section arrives
     backdrop  fixed washes crossfade per section; orbs and sprinkles drift at
               their own, slower rates; copy eases in as each section enters

   Phones ("stack"): the pinned donut spins with the scroll.
   Reduced motion: everything static. */
(function () {
  var donut = document.getElementById("rolling-donut");
  var story = document.getElementById("story-scroll");
  var track = document.getElementById("stage-stack");
  if (!donut || !story || !track) return;

  var body = document.body;
  var slides = Array.prototype.slice.call(track.querySelectorAll(".slide"));
  var inners = slides.map(function (s) { return s.querySelector(".panel__inner"); });
  var backdrops = Array.prototype.slice.call(document.querySelectorAll("#backdrop-stack .backdrop-slide"));
  var orbs = Array.prototype.slice.call(document.querySelectorAll(".ambient__orb"));
  var dockEl = document.getElementById("machine-pick-stage");
  var sprinkleField = null;

  var count = slides.length;
  var travels = Math.max(1, count - 1);
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- tuning ---- */
  var MOBILE_MAX_PX = 899;
  var SMOOTH = 0.14;            // lerp toward the scroll-derived target each frame
  var ANCHOR_VH = 0.22;         // a section has "arrived" when its top reaches this far down the viewport
  var DONUT_VISIBLE_FRAC = 0.44;
  var ROLL_DEG_PER_CHAPTER = 540;
  var HERO_MAG_MIN = 1.2;       // giant opening donut, as a multiple of --donut-size
  var HERO_MAG_MAX = 1.75;
  var HERO_Y_VH = -0.05;        // opening donut sits a touch above center (shelf runs along the bottom)
  var DOCK_PX = 208;            // box size of the donut once it sits in the flavor card (disc is ~72% of it)
  var HOP_VH = 0.09;            // lift at the middle of a side-to-side crossing
  var FRONT_FROM = 0.4;         // where the donut comes in front of the content on its way to the card
  var LEAVE_AT_VH = 0.3;        // the donut rides with the card until the stage's center is this far down...
  var LEAVE_OVER_VH = 0.42;     // ...then swings off to its next park over this much scroll
  var INTRO_MS = 1700;          // roll-in from off-screen on first paint
  var INTRO_ROLL_DEG = 420;
  var MOBILE_ROT_PER_PX = 0.48;
  var MOBILE_DRIFT_PER_PX = -0.06;

  var mode = null;              // "flow" | "stack" | "reduced"
  var pos = 0;                  // displayed section position (0 .. travels)
  var rafId = null;
  var mobileRaf = null;
  var observer = null;
  var introDone = false;
  var introStart = null;
  var flavorIdx = 0;            // flavor on the card; 0 is the Homer, which the rolling donut plays
  var frontOn = false;
  var handedOff = false;
  var dockedOn = false;

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOutCubic(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function setFlag(el, cls, on, cur) {
    if (on !== cur) el.classList.toggle(cls, on);
    return on;
  }

  function isFlowWidth() { return !prefersReduced && window.innerWidth > MOBILE_MAX_PX; }

  /* ---------- geometry ---------- */
  function donutBase() { return donut.getBoundingClientRect().width || 600; }

  /* Donut center-x when parked at the left or right edge (44% of it stays on-screen). */
  function parkX(side) {
    var half = donutBase() / 2;
    var visible = DONUT_VISIBLE_FRAC * 2 * half;
    return side === "left" ? visible - half : window.innerWidth - visible + half;
  }
  function heroMag() { return clamp((window.innerWidth - 560) / 560, HERO_MAG_MIN, HERO_MAG_MAX); }
  function heroX(mag) {
    var diam = donutBase() * mag;
    var visible = 0.58 + 0.14 * clamp((window.innerWidth - 1000) / 600, 0, 1);
    return window.innerWidth - visible * diam + diam / 2;
  }
  /* The flavor card's stage, live, in viewport coordinates (the donut layer is fixed). */
  function dockTarget() {
    if (!dockEl) return { ok: false, x: parkX("left"), y: 0 };
    var r = dockEl.getBoundingClientRect();
    return {
      ok: r.width > 0,
      x: r.left + r.width / 2,
      y: r.top + r.height / 2 - window.innerHeight / 2 + 3 /* measured: lands a few px high, which suits the shadow below */
    };
  }
  /* Where the donut sits for each section. */
  function spot(k, mag0, dk) {
    if (k === 0) return { x: heroX(mag0), y: HERO_Y_VH * window.innerHeight, mag: mag0 };
    if (k === 1 && dk.ok) return { x: dk.x, y: dk.y, mag: DOCK_PX / donutBase() };
    return { x: parkX(k % 2 === 0 ? "right" : "left"), y: 0, mag: 1 };
  }
  /* Roll direction follows the horizontal travel: right→left is negative. */
  function segRoll(i) { return (i % 2 === 0 ? -1 : 1) * ROLL_DEG_PER_CHAPTER; }

  /* Section k has arrived once its top reaches ANCHOR_VH down the viewport; pos is
     the continuous index between those anchors. */
  function targetFromScroll() {
    var y = window.scrollY;
    var off = window.innerHeight * ANCHOR_VH;
    var prev = 0;
    for (var k = 1; k < count; k += 1) {
      var a = slides[k].getBoundingClientRect().top + y - off;
      if (y < a) return (k - 1) + clamp((y - prev) / Math.max(1, a - prev), 0, 1);
      prev = a;
    }
    return travels;
  }

  /* ---------- desktop flow ---------- */
  function renderFlow() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var sy = window.scrollY;
    var seg = Math.min(Math.floor(pos), travels - 1);
    var f = clamp(pos - seg, 0, 1);
    var mag0 = heroMag();
    var dk = dockTarget();
    /* Leaving the card follows the card itself, not the section anchor: the donut
       stays in the stage while the stage is on screen and lifts off as it nears the top. */
    if (seg === 1 && dk.ok) f = clamp((LEAVE_AT_VH * vh - (dk.y + vh / 2)) / (LEAVE_OVER_VH * vh), 0, 1);
    var s = smooth(f);
    var A = spot(seg, mag0, dk);
    var B = spot(seg + 1, mag0, dk);

    var x = lerp(A.x, B.x, s);
    var y = lerp(A.y, B.y, s) - (seg >= 1 ? Math.sin(Math.PI * f) * HOP_VH * vh : 0);
    var mag = lerp(A.mag, B.mag, s);
    var rot = 0;
    for (var i = 0; i < seg; i += 1) rot += segRoll(i);
    rot += segRoll(seg) * f;

    /* First paint: roll in from past the right edge, fading out once the visitor scrolls. */
    if (introStart !== null) {
      var e = easeOutCubic((performance.now() - introStart) / INTRO_MS);
      var w = (1 - e) * (1 - clamp(pos * 3, 0, 1));
      if (e >= 1) introStart = null;
      x += w * (vw + mag0 * donutBase() * 0.6 - heroX(mag0));
      rot -= w * INTRO_ROLL_DEG;
    }

    donut.style.setProperty("--donut-x", x.toFixed(2) + "px");
    donut.style.setProperty("--donut-y", y.toFixed(1) + "px");
    donut.style.setProperty("--donut-rot", rot.toFixed(2) + "deg");
    donut.style.setProperty("--donut-mag", mag.toFixed(4));

    var nearCard = dk.ok && pos > FRONT_FROM && (seg === 0 || (seg === 1 && f < 0.85));
    frontOn = setFlag(body, "is-donut-front", nearCard, frontOn);
    handedOff = setFlag(donut, "is-handed-off", dk.ok && flavorIdx !== 0 && pos > 0.55 && (seg === 0 || (seg === 1 && f < 0.5)), handedOff);

    /* Fixed washes crossfade with the section in view. */
    backdrops.forEach(function (b, k) { b.style.opacity = (1 - clamp(Math.abs(k - pos), 0, 1)).toFixed(3); });

    /* Slow layers: orbs and sprinkles drift up at a fraction of the scroll. */
    if (orbs[0]) orbs[0].style.transform = "translate3d(0, " + (-sy * 0.06).toFixed(1) + "px, 0)";
    if (orbs[1]) orbs[1].style.transform = "translate3d(0, " + (-sy * 0.11).toFixed(1) + "px, 0)";
    if (orbs[2]) orbs[2].style.transform = "translate3d(0, " + (-sy * 0.04).toFixed(1) + "px, 0)";
    if (!sprinkleField) sprinkleField = document.querySelector(".sprinkle-field");
    if (sprinkleField) sprinkleField.style.transform = "translate3d(0, " + (-sy * 0.08).toFixed(1) + "px, 0)";
  }

  function frame() {
    rafId = null;
    var target = targetFromScroll();
    var diff = target - pos;
    if (Math.abs(diff) < 0.0005) pos = target; else pos += diff * SMOOTH;
    renderFlow();
    if (Math.abs(target - pos) > 0.0005 || introStart !== null) rafId = window.requestAnimationFrame(frame);
  }
  function wake() { if (rafId === null) rafId = window.requestAnimationFrame(frame); }

  function clearFlow() {
    if (rafId !== null) { window.cancelAnimationFrame(rafId); rafId = null; }
    introStart = null;
    donut.style.removeProperty("--donut-mag");
    frontOn = setFlag(body, "is-donut-front", false, frontOn);
    handedOff = setFlag(donut, "is-handed-off", false, handedOff);
    dockedOn = setFlag(body, "is-donut-docked", false, dockedOn);
    backdrops.forEach(function (b) { b.style.opacity = ""; });
    orbs.forEach(function (o) { o.style.transform = ""; });
    if (sprinkleField) sprinkleField.style.transform = "";
  }

  /* ---------- stacked (phone / tablet) ---------- */
  function renderStack() {
    mobileRaf = null;
    var y = window.scrollY;
    donut.style.setProperty("--donut-x", parkX("right").toFixed(2) + "px");
    donut.style.setProperty("--donut-rot", (y * MOBILE_ROT_PER_PX).toFixed(2) + "deg");
    donut.style.setProperty("--donut-y", clamp(y * MOBILE_DRIFT_PER_PX, -140, 0).toFixed(1) + "px");
  }
  function wakeStack() { if (mobileRaf === null) mobileRaf = window.requestAnimationFrame(renderStack); }

  /* Copy eases in as each section enters (both modes). */
  function observeReveal() {
    if (observer || !("IntersectionObserver" in window)) {
      if (!observer) inners.forEach(function (el) { if (el) el.classList.add("is-in"); });
      return;
    }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); observer.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    inners.forEach(function (el) { if (el) observer.observe(el); });
  }

  /* ---------- mode switching ---------- */
  function setMode(next) {
    if (next === mode) return;
    mode = next;
    if (mode === "reduced") {
      body.classList.remove("is-flow", "is-mobile-stack");
      clearFlow();
      return;
    }
    if (mode === "flow") {
      body.classList.add("is-flow");
      body.classList.remove("is-mobile-stack");
      dockedOn = setFlag(body, "is-donut-docked", flavorIdx === 0, dockedOn);
      observeReveal();
      pos = targetFromScroll();
      if (window.scrollY < 8 && !introDone) { introStart = performance.now(); introDone = true; }
      renderFlow();
      wake();
    } else {
      body.classList.add("is-mobile-stack");
      body.classList.remove("is-flow");
      clearFlow();
      observeReveal();
      renderStack();
    }
  }

  function onResize() {
    var next = prefersReduced ? "reduced" : (isFlowWidth() ? "flow" : "stack");
    if (next !== mode) { setMode(next); return; }
    if (mode === "flow") { pos = targetFromScroll(); renderFlow(); }
    else if (mode === "stack") renderStack();
  }
  function onScroll() {
    if (mode === "flow") wake();
    else if (mode === "stack") wakeStack();
  }

  /* The flavor card tells us what it shows. The rolling donut plays the Homer (flavor 0);
     any other pick hands the card's stage back to its own illustration. */
  document.addEventListener("llb:flavor", function (e) {
    flavorIdx = e.detail && typeof e.detail.index === "number" ? e.detail.index : 0;
    if (mode === "flow") {
      dockedOn = setFlag(body, "is-donut-docked", flavorIdx === 0, dockedOn);
      renderFlow();
    }
  });

  if ("scrollRestoration" in history) history.scrollRestoration = "auto";
  setMode(prefersReduced ? "reduced" : (isFlowWidth() ? "flow" : "stack"));
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("load", onResize);
})();
