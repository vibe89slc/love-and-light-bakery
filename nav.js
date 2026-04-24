(function () {
  var topBar = document.querySelector(".top-bar");
  if (!topBar) return;

  var scrollThreshold = 10;

  function updateHeaderScrolled() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    topBar.classList.toggle("top-bar--scrolled", y > scrollThreshold);
  }

  updateHeaderScrolled();
  window.addEventListener("scroll", updateHeaderScrolled, { passive: true });
  window.addEventListener("resize", updateHeaderScrolled);

  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-menu");
  var scrim = document.querySelector(".site-nav__scrim");

  if (!toggle || !nav) return;

  var mq = window.matchMedia("(min-width: 900px)");
  var open = false;

  function setOpen(v) {
    if (mq.matches) return;
    open = v;
    nav.classList.toggle("site-nav--open", v);
    topBar.classList.toggle("top-bar--open", v);
    toggle.setAttribute("aria-expanded", String(v));
    toggle.setAttribute("aria-label", v ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", v);
    if (v) {
      var first = nav.querySelector(".site-nav__link");
      if (first) first.focus({ preventScroll: true });
    } else {
      toggle.focus({ preventScroll: true });
    }
  }

  function close() {
    if (open) setOpen(false);
  }

  toggle.addEventListener("click", function () {
    setOpen(!open);
  });

  nav.querySelectorAll("a[href]").forEach(function (a) {
    a.addEventListener("click", close);
  });

  if (scrim) {
    scrim.addEventListener("click", close);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close();
  });

  function onMqChange() {
    if (mq.matches) {
      nav.classList.remove("site-nav--open");
      topBar.classList.remove("top-bar--open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.classList.remove("nav-open");
      open = false;
    }
  }

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onMqChange);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onMqChange);
  }
})();
