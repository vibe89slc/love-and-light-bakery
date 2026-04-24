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

  function setScrollMetrics() {
    body.style.setProperty("--slide-count", String(slideCount));
    if (!prefersReduced) {
      body.classList.add("is-push-stage");
      body.style.minHeight = `${slideCount * 100}vh`;
    } else {
      body.classList.remove("is-push-stage");
      body.style.minHeight = "";
    }
  }

  function update() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scrollY = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

    if (prefersReduced) {
      slides.forEach(function (slide) {
        slide.style.cssText = "";
        const inner = slide.querySelector(".panel__inner");
        if (inner) inner.style.cssText = "";
      });
      donut.style.removeProperty("--donut-x");
      donut.style.removeProperty("--donut-rot");
      return;
    }

    const raw = scrollY / vh;
    const dir = function (seg) {
      return seg % 2 === 0 ? -1 : 1;
    };

    if (raw >= numTrans) {
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
    const fadeT = clamp((u - 0.5) / 0.5, 0, 1);
    const pushE = smoothStep(pushT);
    const fadeE = smoothStep(fadeT);
    const pushPx = vw * 0.78 + 140;
    const d = dir(seg);

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
          slide.style.pointerEvents = fadeE > 0.08 ? "auto" : "none";
          inner.style.transform = "translate3d(0, 0, 0)";
          inner.style.opacity = String(fadeE);
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

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
      ticking = true;
    }
  }

  setScrollMetrics();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () {
    setScrollMetrics();
    update();
  });
  update();
})();
