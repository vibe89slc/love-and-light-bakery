/* Reviews carousel: one card per Google review, three up on wide screens.
   Native horizontal scroll with snap points, prev/next buttons, a polite
   counter, gentle autoplay that pauses on hover/focus and is off under
   reduced motion. Long reviews clamp and expand in place. */
(function () {
  var root = document.getElementById("reviews-carousel");
  var data = window.LLB && window.LLB.reviews;
  if (!root || !data || !data.length) return;

  var track = root.querySelector(".rc__track");
  var prev = root.querySelector(".rc__btn--prev");
  var next = root.querySelector(".rc__btn--next");
  var counter = root.querySelector(".rc__counter");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stars(n) {
    var s = '<span class="rc__stars" role="img" aria-label="' + n + ' out of 5 stars">';
    for (var i = 0; i < 5; i++) s += '<span class="rc__star' + (i < n ? " is-on" : "") + '" aria-hidden="true">★</span>';
    return s + "</span>";
  }
  function esc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  track.innerHTML = data.map(function (r, i) {
    return (
      '<figure class="rc__card" role="group" aria-roledescription="slide" aria-label="Review ' + (i + 1) + ' of ' + data.length + '">' +
        stars(r.rating) +
        '<blockquote class="rc__quote"><p>' + esc(r.text) + "</p></blockquote>" +
        '<button type="button" class="rc__more" aria-expanded="false" hidden>Read more</button>' +
        '<figcaption class="rc__cite"><strong>' + esc(r.name) + "</strong><span>" + esc(r.when) + " · Google</span></figcaption>" +
      "</figure>"
    );
  }).join("");

  var cards = Array.prototype.slice.call(track.children);

  // Show "Read more" only where the clamp actually hides text.
  function fitMore() {
    cards.forEach(function (c) {
      var q = c.querySelector(".rc__quote"), b = c.querySelector(".rc__more");
      if (c.classList.contains("is-open")) return;
      b.hidden = q.scrollHeight <= q.clientHeight + 2;
    });
  }
  track.addEventListener("click", function (e) {
    var b = e.target.closest(".rc__more");
    if (!b) return;
    var c = b.closest(".rc__card");
    var open = c.classList.toggle("is-open");
    b.setAttribute("aria-expanded", open ? "true" : "false");
    b.textContent = open ? "Show less" : "Read more";
  });

  function perView() {
    var w = cards[0].getBoundingClientRect().width;
    return Math.max(1, Math.round(track.clientWidth / w));
  }
  function index() {
    var w = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
    return Math.round(track.scrollLeft / w);
  }
  function goTo(i, smooth) {
    var n = cards.length, pv = perView();
    i = Math.max(0, Math.min(n - pv, i));
    track.scrollTo({ left: cards[i].offsetLeft - track.offsetLeft, behavior: smooth && !reduce ? "smooth" : "auto" });
  }
  function update() {
    var i = index(), pv = perView(), n = cards.length;
    var last = Math.min(n, i + pv);
    counter.textContent = (pv > 1 ? (i + 1) + "–" + last : (i + 1)) + " of " + n;
    prev.disabled = i <= 0;
    next.disabled = i >= n - pv;
  }

  prev.addEventListener("click", function () { goTo(index() - perView(), true); nudge(); });
  next.addEventListener("click", function () { goTo(index() + perView(), true); nudge(); });
  root.addEventListener("keydown", function (e) {
    if (e.target.closest(".rc__more")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(index() + 1, true); nudge(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index() - 1, true); nudge(); }
  });

  var tick = null;
  track.addEventListener("scroll", function () { clearTimeout(tick); tick = setTimeout(update, 80); }, { passive: true });
  window.addEventListener("resize", function () { fitMore(); update(); });

  // Autoplay: advance one card every 6s, loop at the end, pause while the
  // visitor is reading (hover, focus, touch) or the chapter is off screen.
  var timer = null, paused = false, inView = false;
  function step() {
    if (paused || !inView) return;
    var i = index(), pv = perView();
    goTo(i >= cards.length - pv ? 0 : i + 1, true);
  }
  function start() { if (reduce || timer) return; timer = setInterval(step, 6000); }
  function nudge() { if (!timer) return; clearInterval(timer); timer = null; start(); }
  ["mouseenter", "focusin", "touchstart", "pointerdown"].forEach(function (ev) {
    root.addEventListener(ev, function () { paused = true; }, { passive: true });
  });
  ["mouseleave", "focusout"].forEach(function (ev) {
    root.addEventListener(ev, function () { paused = false; });
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { inView = es[0].isIntersecting; }, { threshold: 0.3 }).observe(root);
  } else { inView = true; }
  document.addEventListener("visibilitychange", function () { paused = paused || document.hidden; if (!document.hidden) paused = false; });

  fitMore();
  update();
  start();
})();
