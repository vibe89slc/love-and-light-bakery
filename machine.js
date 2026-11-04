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

    /* Phones: the card sits above the wall; bring it back into view when it has scrolled off. */
    if (byUser && window.innerWidth < 900 && pick.getBoundingClientRect().top < 56) {
      pick.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }

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
