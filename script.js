(function () {
  const donut = document.getElementById("rolling-donut");
  const panels = document.querySelectorAll("[data-reveal]");
  const orbs = document.querySelectorAll(".ambient__orb");

  if (!donut) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function update() {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - vh);

    const t = clamp(scrollY / maxScroll, 0, 1);

    const yStart = vh * 0.14;
    const yEnd = vh * 0.82;
    const y = yStart + t * (yEnd - yStart);
    const rot = t * 720;

    if (!prefersReduced) {
      donut.style.setProperty("--donut-y", `${y}px`);
      donut.style.setProperty("--donut-rot", `${rot}deg`);
    } else {
      donut.style.setProperty("--donut-y", `${vh * 0.35}px`);
      donut.style.setProperty("--donut-rot", "0deg");
    }

    const dRect = donut.getBoundingClientRect();
    const donutBottom = dRect.bottom;
    const lead = vh * 0.06;

    panels.forEach(function (panel) {
      const pRect = panel.getBoundingClientRect();
      if (donutBottom > pRect.top + lead) {
        panel.classList.add("is-revealed");
      } else {
        panel.classList.remove("is-revealed");
      }
    });

    if (!prefersReduced && orbs.length) {
      orbs[0].style.transform = `translate3d(${scrollY * 0.04}px, ${scrollY * 0.03}px, 0)`;
      orbs[1].style.transform = `translate3d(${scrollY * -0.03}px, ${scrollY * 0.05}px, 0)`;
      orbs[2].style.transform = `translate3d(${scrollY * 0.02}px, ${scrollY * -0.02}px, 0)`;
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

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
