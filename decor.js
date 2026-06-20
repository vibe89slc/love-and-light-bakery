/* ===== Background decor: drifting sprinkles =====
   Scatters lightweight, gently floating sprinkles into the fixed .ambient
   layer so they sit behind all content. Pure CSS animation drives the drift;
   this only places them. Respects prefers-reduced-motion (places them static). */
(function () {
  var ambient = document.querySelector(".ambient");
  if (!ambient) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var COLORS = [
    "#fff59a", "#a8e6cf", "#c4b5fd", "#fdba74",
    "#93c5fd", "#f9a8d4", "#86efac", "#fca5a5"
  ];
  // Fewer on small screens to keep things light.
  var COUNT = window.innerWidth < 700 ? 16 : 28;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  var field = document.createElement("div");
  field.className = "sprinkle-field";
  field.setAttribute("aria-hidden", "true");

  for (var i = 0; i < COUNT; i += 1) {
    var s = document.createElement("span");
    s.className = "sprinkle";
    var len = rand(7, 13);
    var color = COLORS[(Math.random() * COLORS.length) | 0];
    var dur = rand(7, 15);
    var css =
      "left:" + rand(1, 99).toFixed(2) + "%;" +
      "top:" + rand(2, 96).toFixed(2) + "%;" +
      "width:" + len.toFixed(1) + "px;" +
      "background:" + color + ";" +
      "--rot:" + rand(-60, 60).toFixed(0) + "deg;" +
      "--dx:" + rand(-16, 16).toFixed(0) + "px;" +
      "--dy:" + rand(-22, 22).toFixed(0) + "px;" +
      "--spin:" + rand(-50, 50).toFixed(0) + "deg;" +
      "opacity:" + rand(0.4, 0.75).toFixed(2) + ";";
    if (!reduce) {
      css += "animation-duration:" + dur.toFixed(2) + "s;" +
        "animation-delay:" + (-rand(0, dur)).toFixed(2) + "s;";
    }
    s.style.cssText = css;
    field.appendChild(s);
  }

  ambient.appendChild(field);
})();
