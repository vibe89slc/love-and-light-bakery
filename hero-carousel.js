/* ===== Hero flavor carousel =====
   Coverflow-style auto-advancing showcase that reuses the shared flavor
   list + donut builder (flavors.js). Self-contained: button/dot controls
   don't interfere with the home page's scroll-push stage. */
(function () {
  var root = document.getElementById("hero-carousel");
  var track = document.getElementById("hero-carousel-track");
  var dotsWrap = document.getElementById("hero-carousel-dots");
  var caption = document.getElementById("hero-carousel-caption");
  if (!root || !track || !caption || !window.LLB) return;

  var flavors = window.LLB.flavors;
  if (!flavors.length) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var AUTOPLAY_MS = 3400;
  var active = 0;
  var timer = null;

  var slides = flavors.map(function (f, i) {
    var slide = document.createElement("div");
    slide.className = "hero-flavor";
    slide.style.cssText = window.LLB.flavorVars(f);
    slide.innerHTML =
      '<div class="hero-flavor__stage">' + window.LLB.donutSVG(f, i, "hero") +
      '<span class="hero-flavor__soon">✦ Image coming soon</span></div>';
    track.appendChild(slide);
    return slide;
  });

  var dots = flavors.map(function (f, i) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero-carousel__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", f.name);
    dot.addEventListener("click", function () {
      go(i);
      restart();
    });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function render() {
    var n = slides.length;
    slides.forEach(function (slide, i) {
      var rel = i - active;
      // wrap to nearest direction so neighbors animate the short way
      if (rel > n / 2) rel -= n;
      if (rel < -n / 2) rel += n;

      slide.classList.remove("is-active", "is-prev", "is-next", "is-far-prev", "is-far-next");
      if (rel === 0) slide.classList.add("is-active");
      else if (rel === -1) slide.classList.add("is-prev");
      else if (rel === 1) slide.classList.add("is-next");
      else if (rel < -1) slide.classList.add("is-far-prev");
      else slide.classList.add("is-far-next");
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-active", i === active);
      dot.setAttribute("aria-selected", i === active ? "true" : "false");
    });
    var f = flavors[active];
    caption.innerHTML =
      '<span class="hero-carousel__name">' + f.name + "</span>" +
      '<span class="hero-carousel__caption-tag">' + f.tag + "</span>";
  }

  function go(i) {
    var n = slides.length;
    active = ((i % n) + n) % n;
    render();
  }

  function next() { go(active + 1); }
  function prev() { go(active - 1); }

  function start() {
    if (reduce || timer) return;
    timer = window.setInterval(next, AUTOPLAY_MS);
  }

  function stop() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  function restart() {
    stop();
    start();
  }

  var prevBtn = root.querySelector(".hero-carousel__nav--prev");
  var nextBtn = root.querySelector(".hero-carousel__nav--next");
  if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restart(); });
  if (nextBtn) nextBtn.addEventListener("click", function () { next(); restart(); });

  // Pause while the visitor is interacting / hovering.
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);

  // Pause when the home page tab/section isn't visible.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  render();
  start();
})();
