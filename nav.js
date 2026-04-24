(function () {
  var topBar = document.querySelector(".top-bar");
  if (!topBar) return;

  var scrollThreshold = 10;
  var mqMobileNav = window.matchMedia("(max-width: 899px)");
  var NAV_HINT_KEY = "loveandlight-nav-hint-dismissed-v2";
  var navHint = document.getElementById("nav-hint");

  function dismissNavHint() {
    if (!navHint) return;
    navHint.classList.remove("nav-hint--visible");
    try {
      localStorage.setItem(NAV_HINT_KEY, "1");
    } catch (e) {}
  }

  /* No timers: hint tracks the solid nav bar only (scroll or flyout open). */
  function updateNavHintVisibility() {
    if (!navHint) return;
    if (!mqMobileNav.matches) {
      navHint.classList.remove("nav-hint--visible");
      return;
    }
    try {
      if (localStorage.getItem(NAV_HINT_KEY)) {
        navHint.classList.remove("nav-hint--visible");
        return;
      }
    } catch (e) {
      return;
    }
    var barSolid =
      topBar.classList.contains("top-bar--scrolled") ||
      topBar.classList.contains("top-bar--open");
    if (barSolid) {
      navHint.classList.add("nav-hint--visible");
    } else {
      navHint.classList.remove("nav-hint--visible");
    }
  }

  function updateHeaderScrolled() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var innerPage = document.body.classList.contains("page--inner");
    var homePage = document.body.classList.contains("page--home");
    var scrolledPast = y > scrollThreshold;
    var solidBar =
      (innerPage && scrolledPast) ||
      (homePage && mqMobileNav.matches && scrolledPast);
    topBar.classList.toggle("top-bar--scrolled", solidBar);
    updateNavHintVisibility();
  }

  updateHeaderScrolled();
  window.addEventListener("scroll", updateHeaderScrolled, { passive: true });
  window.addEventListener("resize", updateHeaderScrolled);
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) {
      updateHeaderScrolled();
    }
  });
  if (typeof mqMobileNav.addEventListener === "function") {
    mqMobileNav.addEventListener("change", updateHeaderScrolled);
  } else if (typeof mqMobileNav.addListener === "function") {
    mqMobileNav.addListener(updateHeaderScrolled);
  }

  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-menu");
  var scrim = document.querySelector(".site-nav__scrim");

  if (!toggle || !nav) return;

  var mq = window.matchMedia("(min-width: 900px)");
  var open = false;

  function setOpen(v) {
    if (mq.matches) return;
    open = v;
    if (v) {
      dismissNavHint();
    }
    nav.classList.toggle("site-nav--open", v);
    topBar.classList.toggle("top-bar--open", v);
    toggle.setAttribute("aria-expanded", String(v));
    toggle.setAttribute("aria-label", v ? "Close menu" : "Open menu");
    document.body.classList.toggle("nav-open", v);
    updateNavHintVisibility();
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
