(function () {
  const donut = document.getElementById("rolling-donut");
  const stack = document.getElementById("stage-stack");
  const orbs = document.querySelectorAll(".ambient__orb");
  const body = document.body;

  if (!donut || !stack) return;

  const slides = stack.querySelectorAll(".slide");
  const slideCount = slides.length;
  const numTrans = Math.max(1, slideCount - 1);

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Viewport heights of scroll per push→fade chapter (higher = more wheel travel per chapter). */
  const SCROLL_STRETCH = 1.82;
  /** Wheel delta dampening (higher = less physical scrolling to move). */
  const WHEEL_MULTIPLIER = 0.52;
  /** Base lerp toward targetY each frame (snap uses adaptive ease below). */
  const SMOOTH_EASE = 0.084;
  /** Stronger lerp when far from target (smooth snap glide). */
  const SMOOTH_EASE_MID = 0.11;
  const SMOOTH_EASE_FAR = 0.135;
  /** Ignore tiny differences at rest. */
  const SCROLL_EPS = 0.45;

  let targetY = 0;
  let currentY = 0;
  let scrollSyncLock = false;
  /** After the donut push, incoming copy fades by time — not by scroll position. */
  let fadePhaseKey = null;
  let fadeStartedAt = 0;
  const TEXT_FADE_MS = 960;
  /** Snap to chapter starts after wheel / touch — debounce so glide finishes before we pull to a stop. */
  const WHEEL_SNAP_DEBOUNCE_MS = 260;
  const SCROLL_SNAP_DEBOUNCE_MS = 340;
  const AFTER_WHEEL_TOUCH_GUARD_MS = 400;

  let wheelSnapTimer = null;
  let scrollSnapTimer = null;
  let lastWheelTime = 0;
  /** Sum of raw wheel deltaY during the current gesture (sign = direction). */
  let wheelIntentSum = 0;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothStep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function getMaxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function chapterStepPx() {
    return window.innerHeight * SCROLL_STRETCH;
  }

  function nearestChapterSnap(y) {
    const step = chapterStepPx();
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i <= numTrans; i += 1) {
      const p = i * step;
      const d = Math.abs(y - p);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  /**
   * Pick lower or upper chapter boundary between y lives.
   * Avoids "nearest" snapping backward when the user nudged downward but not far enough.
   */
  function intentAwareChapterSnap(y, wheelIntent) {
    const step = chapterStepPx();
    const max = getMaxScroll();
    if (y < 14) {
      return 0;
    }
    if (y > max - 14) {
      return max;
    }

    const lower = clamp(Math.floor(y / step) * step, 0, max);
    const upper = clamp(Math.min(lower + step, numTrans * step), 0, max);
    const span = upper - lower;
    if (span < 2) {
      return lower;
    }

    const t = (y - lower) / span;
    const INTENT_GATE = 10;

    if (Math.abs(wheelIntent) < INTENT_GATE) {
      if (t >= 0.52) {
        return upper;
      }
      if (t <= 0.48) {
        return lower;
      }
      return t > 0.22 ? upper : lower;
    }

    if (wheelIntent > 0) {
      return t > 0.07 ? upper : lower;
    }

    return t < 0.93 ? lower : upper;
  }

  /** Fraction of donut width (diameter) kept visible when parked on an edge. */
  const DONUT_VISIBLE_FRAC = 0.44;

  /**
   * Center-x when donut is parked on the left vs right edge.
   * ~44% of the donut width stays on-screen; the rest sits past the edge.
   */
  function getDonutPeekBounds(vw) {
    const rect = donut.getBoundingClientRect();
    let half = rect.width / 2;
    if (half < 6) {
      half = Math.min(vw * 0.27, 202);
    }
    const visibleW = DONUT_VISIBLE_FRAC * (2 * half);
    return {
      leftPark: visibleW - half,
      rightPark: vw - visibleW + half,
    };
  }

  /**
   * Move scroll target to a chapter stop. Pass wheelIntent from the wheel gesture, or omit for resize.
   * rAF lerps currentY — no instant jump.
   */
  function requestChapterSnap(fromY, wheelIntent) {
    const max = getMaxScroll();
    const snap = clamp(
      wheelIntent === undefined ? nearestChapterSnap(fromY) : intentAwareChapterSnap(fromY, wheelIntent),
      0,
      max
    );
    if (Math.abs(snap - fromY) < 1.25 && Math.abs(snap - targetY) < 1.25) {
      return;
    }
    targetY = snap;
  }

  function setScrollMetrics() {
    body.style.setProperty("--slide-count", String(slideCount));
    if (!prefersReduced) {
      body.classList.add("is-push-stage");
      const vh = window.innerHeight;
      const segmentPx = vh * SCROLL_STRETCH;
      const totalPx = numTrans * segmentPx + vh;
      body.style.minHeight = `${totalPx}px`;
    } else {
      body.classList.remove("is-push-stage");
      body.style.minHeight = "";
    }
  }

  function update() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scrollY = window.scrollY;
    const maxScroll = Math.max(1, getMaxScroll());
    const segmentHeight = vh * SCROLL_STRETCH;

    if (prefersReduced) {
      return;
    }

    const raw = scrollY / Math.max(1e-6, segmentHeight);
    const dir = function (seg) {
      return seg % 2 === 0 ? -1 : 1;
    };

    if (raw >= numTrans) {
      fadePhaseKey = null;
      slides.forEach(function (slide, k) {
        const inner = slide.querySelector(".panel__inner");
        slide.style.zIndex = k === slideCount - 1 ? "8" : "2";
        slide.style.opacity = k === slideCount - 1 ? "1" : "0";
        slide.style.pointerEvents = k === slideCount - 1 ? "auto" : "none";
        if (inner) {
          inner.style.transform = "";
          inner.style.opacity = "1";
        }
      });

      const lastSeg = numTrans - 1;
      const rollRight = lastSeg % 2 === 0;
      const park = getDonutPeekBounds(vw);
      const settledX = rollRight ? park.leftPark : park.rightPark;
      donut.style.setProperty("--donut-x", `${settledX}px`);
      let rotSettled = 0;
      for (let i = 0; i < numTrans; i += 1) {
        rotSettled += i % 2 === 0 ? -720 : 720;
      }
      donut.style.setProperty("--donut-rot", `${rotSettled}deg`);

      if (orbs.length) {
        const p = clamp(scrollY / maxScroll, 0, 1);
        const drift = p * vw * 0.08;
        orbs[0].style.transform = `translate3d(${drift * 0.6}px, ${p * vh * 0.04}px, 0)`;
        orbs[1].style.transform = `translate3d(${-drift * 0.5}px, ${p * vh * 0.05}px, 0)`;
        orbs[2].style.transform = `translate3d(${drift * 0.35}px, ${-p * vh * 0.02}px, 0)`;
      }
      return;
    }

    const seg = Math.floor(raw);
    const u = raw - seg;
    const pushT = clamp(u / 0.5, 0, 1);
    const pushE = smoothStep(pushT);
    const pushPx = vw * 0.78 + 140;
    const d = dir(seg);

    let fadeIn = 0;
    if (u < 0.5) {
      fadePhaseKey = null;
    } else {
      const key = String(seg);
      if (fadePhaseKey !== key) {
        fadePhaseKey = key;
        fadeStartedAt = performance.now();
      }
      const fadeT = clamp((performance.now() - fadeStartedAt) / TEXT_FADE_MS, 0, 1);
      fadeIn = smoothStep(fadeT);
    }

    slides.forEach(function (slide, k) {
      const inner = slide.querySelector(".panel__inner");
      if (!inner) return;

      if (k < seg) {
        slide.style.zIndex = "2";
        slide.style.opacity = "0";
        slide.style.pointerEvents = "none";
        inner.style.transform = "translate3d(0, 0, 0)";
        inner.style.opacity = "1";
      } else if (k === seg) {
        if (u < 0.5) {
          const dist = pushPx * pushE;
          slide.style.zIndex = "8";
          slide.style.opacity = "1";
          slide.style.pointerEvents = "auto";
          inner.style.transform = `translate3d(${d * dist}px, 0, 0)`;
          inner.style.opacity = "1";
        } else {
          slide.style.zIndex = "3";
          slide.style.opacity = "0";
          slide.style.pointerEvents = "none";
          inner.style.transform = `translate3d(${d * pushPx}px, 0, 0)`;
          inner.style.opacity = "0";
        }
      } else if (k === seg + 1) {
        if (u < 0.5) {
          slide.style.zIndex = "4";
          slide.style.opacity = "0";
          slide.style.pointerEvents = "none";
          inner.style.transform = "translate3d(0, 0, 0)";
          inner.style.opacity = "0";
        } else {
          slide.style.zIndex = "9";
          slide.style.opacity = "1";
          slide.style.pointerEvents = fadeIn > 0.12 ? "auto" : "none";
          const lift = (1 - fadeIn) * 14;
          inner.style.transform = `translate3d(0, ${lift}px, 0)`;
          inner.style.opacity = String(fadeIn);
        }
      } else {
        slide.style.zIndex = "2";
        slide.style.opacity = "0";
        slide.style.pointerEvents = "none";
        inner.style.transform = "translate3d(0, 0, 0)";
        inner.style.opacity = "1";
      }
    });

    const park = getDonutPeekBounds(vw);
    if (u < 0.5) {
      const rollRight = seg % 2 === 0;
      const startX = rollRight ? park.rightPark : park.leftPark;
      const endX = rollRight ? park.leftPark : park.rightPark;
      const x = lerp(startX, endX, pushE);
      donut.style.setProperty("--donut-x", `${x}px`);

      let rotAccum = 0;
      for (let i = 0; i < seg; i += 1) {
        rotAccum += i % 2 === 0 ? -720 : 720;
      }
      rotAccum += (seg % 2 === 0 ? -720 : 720) * pushE;
      donut.style.setProperty("--donut-rot", `${rotAccum}deg`);
    } else {
      const rollRight = seg % 2 === 0;
      const endX = rollRight ? park.leftPark : park.rightPark;
      donut.style.setProperty("--donut-x", `${endX}px`);
      let rotAccum = 0;
      for (let i = 0; i <= seg; i += 1) {
        rotAccum += i % 2 === 0 ? -720 : 720;
      }
      donut.style.setProperty("--donut-rot", `${rotAccum}deg`);
    }

    if (orbs.length) {
      const p = clamp(scrollY / maxScroll, 0, 1);
      const drift = p * vw * 0.08;
      orbs[0].style.transform = `translate3d(${drift * 0.6}px, ${p * vh * 0.04}px, 0)`;
      orbs[1].style.transform = `translate3d(${-drift * 0.5}px, ${p * vh * 0.05}px, 0)`;
      orbs[2].style.transform = `translate3d(${drift * 0.35}px, ${-p * vh * 0.02}px, 0)`;
    }
  }

  function syncScrollFromNative() {
    if (prefersReduced) return;
    const y = window.scrollY;
    if (Math.abs(y - currentY) > 14) {
      currentY = y;
      targetY = y;
    }
  }

  function frame() {
    if (!prefersReduced) {
      const max = getMaxScroll();
      targetY = clamp(targetY, 0, max);
      const dist = Math.abs(targetY - currentY);
      const ease = dist > 110 ? SMOOTH_EASE_FAR : dist > 48 ? SMOOTH_EASE_MID : SMOOTH_EASE;
      currentY += (targetY - currentY) * ease;
      if (dist < SCROLL_EPS) {
        currentY = targetY;
      }
      if (Math.abs(window.scrollY - currentY) > 0.35) {
        scrollSyncLock = true;
        window.scrollTo(0, currentY);
        scrollSyncLock = false;
      }
    }
    update();
    window.requestAnimationFrame(frame);
  }

  setScrollMetrics();
  targetY = currentY = window.scrollY;

  window.addEventListener("resize", function () {
    setScrollMetrics();
    if (!prefersReduced) {
      const max = getMaxScroll();
      targetY = clamp(targetY, 0, max);
      currentY = clamp(currentY, 0, max);
      window.scrollTo(0, currentY);
      requestChapterSnap(window.scrollY);
    }
    update();
  });

  if (prefersReduced) {
    return;
  }

  window.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      lastWheelTime = performance.now();
      wheelIntentSum += e.deltaY;
      const max = getMaxScroll();
      targetY = clamp(targetY + e.deltaY * WHEEL_MULTIPLIER, 0, max);
      clearTimeout(wheelSnapTimer);
      wheelSnapTimer = setTimeout(function () {
        wheelSnapTimer = null;
        const intent = wheelIntentSum;
        wheelIntentSum = 0;
        requestChapterSnap(targetY, intent);
      }, WHEEL_SNAP_DEBOUNCE_MS);
    },
    { passive: false }
  );

  window.addEventListener(
    "scroll",
    function () {
      if (scrollSyncLock) return;
      syncScrollFromNative();
      clearTimeout(scrollSnapTimer);
      scrollSnapTimer = setTimeout(function () {
        scrollSnapTimer = null;
        if (performance.now() - lastWheelTime < AFTER_WHEEL_TOUCH_GUARD_MS) {
          return;
        }
        requestChapterSnap(window.scrollY, 0);
      }, SCROLL_SNAP_DEBOUNCE_MS);
    },
    { passive: true }
  );

  window.requestAnimationFrame(frame);
})();
