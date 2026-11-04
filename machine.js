/* ===== Flavor machine (home, chapter 2) =====
   A wall of flavor buttons and one big "pick" card, like choosing a flavor
   on a soda machine. Reuses the shared flavor list + donut builder (flavors.js). */
(function () {
  var grid = document.getElementById("machine-grid");
  var pick = document.getElementById("machine-pick");
  if (!grid || !pick || !window.LLB) return;

  var flavors = window.LLB.flavors;
  var stage = document.getElementById("machine-pick-stage");
  var tag = document.getElementById("machine-pick-tag");
  var name = document.getElementById("machine-pick-name");
  var desc = document.getElementById("machine-pick-desc");
  var price = document.getElementById("machine-pick-price");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var active = -1;

  /* Prices mirror menu.html; only the shop should edit them. */
  function priceFor(f) {
    switch (f.tag) {
      case "Filled": return f.name === "Boston Cream" ? "$5 each" : "$4.75 each";
      case "Fridays": return "$5.25 · Fritter Friday only";
      case "Bites": return "Sold by the bag — ask at the counter";
      default: return "$5.25 each · half dozen $31.50 · dozen $59.85";
    }
  }

  var buttons = flavors.map(function (f, i) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "machine__btn";
    b.style.cssText = window.LLB.flavorVars(f);
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = window.LLB.donutSVG(f, i, "mk") + '<span class="machine__btn-name">' + f.name + "</span>";
    b.addEventListener("click", function () { select(i, true); });
    grid.appendChild(b);
    return b;
  });

  function select(i, byUser) {
    if (i === active) return;
    active = i;
    var f = flavors[i];
    buttons.forEach(function (b, k) { b.setAttribute("aria-pressed", k === i ? "true" : "false"); });
    pick.style.cssText = window.LLB.flavorVars(f);
    stage.innerHTML = window.LLB.donutSVG(f, i, "pick");
    if (!reduce) {
      stage.classList.remove("is-swapping");
      void stage.offsetWidth; // restart the pop
      stage.classList.add("is-swapping");
    }
    tag.textContent = f.tag;
    name.textContent = f.name;
    desc.textContent = f.desc;
    price.textContent = priceFor(f);

  }

  /* Title reveal: fires once, when the section header has scrolled into view. */
  var head = document.getElementById("machine-head");
  if (head) {
    if (reduce || !("IntersectionObserver" in window)) {
      head.classList.add("is-in");
    } else {
      var headIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { head.classList.add("is-in"); headIo.disconnect(); }
        });
      }, { rootMargin: "0px 0px -18% 0px", threshold: 0.5 });
      headIo.observe(head);
    }
  }

  /* Phones: the nav bar slides away as the section title arrives and stays away
     while the card is pinned over the wall; the page never scrolls on its own. */
  var stuck = false;
  var stuckRaf = null;
  function checkStuck() {
    stuckRaf = null;
    var next = false;
    if (window.innerWidth < 900) {
      var top = (head || pick).getBoundingClientRect().top;
      var wall = grid.getBoundingClientRect();
      var card = pick.getBoundingClientRect();
      next = top <= window.innerHeight * 0.42 && wall.bottom > card.bottom + 24;
    }
    if (next !== stuck) {
      stuck = next;
      document.body.classList.toggle("is-machine-stuck", stuck);
    }
  }
  function onScroll() { if (stuckRaf === null) stuckRaf = window.requestAnimationFrame(checkStuck); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  checkStuck();

  /* Arrow keys walk the wall. */
  grid.addEventListener("keydown", function (e) {
    var idx = buttons.indexOf(document.activeElement);
    if (idx < 0) return;
    var cols = Math.max(1, Math.round(grid.clientWidth / buttons[0].offsetWidth));
    var next = null;
    if (e.key === "ArrowRight") next = idx + 1;
    else if (e.key === "ArrowLeft") next = idx - 1;
    else if (e.key === "ArrowDown") next = idx + cols;
    else if (e.key === "ArrowUp") next = idx - cols;
    if (next === null) return;
    e.preventDefault();
    next = Math.max(0, Math.min(buttons.length - 1, next));
    buttons[next].focus();
    select(next, true);
  });

  select(0, false);
})();
