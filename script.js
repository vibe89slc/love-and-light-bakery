(function () {
  const donut = document.getElementById("rolling-donut");
  const track = document.getElementById("stage-track");
  const orbs = document.querySelectorAll(".ambient__orb");
  const body = document.body;

  if (!donut || !track) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slideCount = track.children.length;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function setScrollMetrics() {
    body.style.setProperty("--slide-count", String(slideCount));
    if (!prefersReduced) {
      body.classList.add("is-horizontal-stage");
      body.style.minHeight = `${slideCount * 100}vh`;
    } else {
      body.classList.remove("is-horizontal-stage");
      body.style.minHeight = "";
    }
  }

  function update() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scrollY = window.scrollY;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);

    if (prefersReduced) {
      track.style.transform = "";
      return;
    }

    const progress = clamp(scrollY / maxScroll, 0, 1);
    const trackX = -progress * (slideCount - 1) * vw;
    track.style.transform = `translate3d(${trackX}px, 0, 0)`;

    const transitions = slideCount - 1;
    const segFloat = progress * transitions;
    const segIdx = Math.min(Math.floor(segFloat), transitions - 1);
    let localT;
    if (segFloat >= transitions - 1) {
      localT = segFloat - (transitions - 1);
      localT = clamp(localT, 0, 1);
    } else {
      localT = segFloat - segIdx;
    }

    const ease = localT * localT * (3 - 2 * localT);
    const rollRight = segIdx % 2 === 0;
    const startX = rollRight ? vw * 1.12 : vw * -0.12;
    const endX = rollRight ? vw * -0.12 : vw * 1.12;
    const x = lerp(startX, endX, ease);
    donut.style.setProperty("--donut-x", `${x}px`);

    let rotAccum = 0;
    for (let i = 0; i < segIdx; i += 1) {
      rotAccum += i % 2 === 0 ? -720 : 720;
    }
    const rotDelta = (segIdx % 2 === 0 ? -720 : 720) * ease;
    donut.style.setProperty("--donut-rot", `${rotAccum + rotDelta}deg`);

    if (orbs.length) {
      const drift = progress * vw * 0.08;
      orbs[0].style.transform = `translate3d(${drift * 0.6}px, ${progress * vh * 0.04}px, 0)`;
      orbs[1].style.transform = `translate3d(${-drift * 0.5}px, ${progress * vh * 0.05}px, 0)`;
      orbs[2].style.transform = `translate3d(${drift * 0.35}px, ${-progress * vh * 0.02}px, 0)`;
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
