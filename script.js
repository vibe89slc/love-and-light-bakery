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

  /** Viewport heights of scroll per push→fade chapter (higher = slower, harder to skip). */
  const SCROLL_STRETCH = 2.75;
  /** Wheel delta dampening (lower = more scroll gesture per pixel moved). */
  const WHEEL_MULTIPLIER = 0.38;
  /** Scroll position lerps toward target each frame (lower = silkier, slower catch-up). */
  const SMOOTH_EASE = 0.082;
  /** Ignore tiny differences at rest. */
  const SCROLL_EPS = 0.45;

  let targetY = 0;
  let currentY = 0;
  let scrollSyncLock = false;
  /** After the donut push, incoming copy fades by time — not by scroll position. */
  let fadePhaseKey = null;
  let fadeStartedAt = 0;
  const TEXT_FADE_MS = 960;

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
      const settledX = rollRight ? -vw * 0.15 : vw * 1.15;
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

    if (u < 0.5) {
      const rollRight = seg % 2 === 0;
      const startX = rollRight ? vw * 1.15 : -vw * 0.15;
      const endX = rollRight ? -vw * 0.15 : vw * 1.15;
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
      const endX = rollRight ? -vw * 0.15 : vw * 1.15;
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
      currentY += (targetY - currentY) * SMOOTH_EASE;
      if (Math.abs(targetY - currentY) < SCROLL_EPS) {
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
      const max = getMaxScroll();
      targetY = clamp(targetY + e.deltaY * WHEEL_MULTIPLIER, 0, max);
    },
    { passive: false }
  );

  window.addEventListener(
    "scroll",
    function () {
      if (scrollSyncLock) return;
      syncScrollFromNative();
    },
    { passive: true }
  );

  window.requestAnimationFrame(frame);
})();
