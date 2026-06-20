/* ===== Shared flavor data + donut illustration builder =====
   Used by the Menu "Hall of Fame" grid and the home hero carousel.
   Edit this list to add/remove flavors or tweak copy & colors.
   Each entry: name, tag (small label), desc (one fun line),
   shape ("ring" | "twist" | "holes" | "bun"),
   topping ("none" | "sprinkles" | "crumb" | "drizzle" | "berries" | "smores"),
   and colors: dough, glaze, plus optional drizzle/crumb accents. */
(function () {
  var DOUGH = "#cb9d61"; // standard fried-dough tone

  var FLAVORS = [
    { name: "Maple Cinnamon Crumb", tag: "Yeast", shape: "ring", topping: "crumb",
      glaze: "#e3a55c", crumb: "#794a23",
      desc: "Glossy maple glaze under a blanket of buttery cinnamon streusel. Cozy pancake mornings meet crunchy crumb." },
    { name: "Strawberry Cinnamon Crumb", tag: "Yeast", shape: "ring", topping: "crumb",
      glaze: "#f2a0bd", crumb: "#b06a30",
      desc: "Strawberry glaze meets cinnamon streusel. Sweet-and-spiced in every bite." },
    { name: "Strawberry Glazed", tag: "Yeast", shape: "ring", topping: "none",
      glaze: "#f08bb0",
      desc: "Bright strawberry glaze, no artificial dyes — just real berry blush." },
    { name: "Classic Glazed", tag: "Yeast", shape: "ring", topping: "none",
      glaze: "#f4e3cf",
      desc: "The one that started it all. Light, airy, melt-on-your-tongue glaze." },
    { name: "Old-Fashioned", tag: "Cake", shape: "ring", topping: "none",
      dough: "#d2a05a", glaze: "#e0ad68",
      desc: "Craggy, golden, and big as your hopes. Crisp edges, tender crumb." },
    { name: "Vanilla Glazed", tag: "Yeast", shape: "ring", topping: "none",
      glaze: "#f6efe1",
      desc: "Vanilla-bean glaze with a soft snow-white finish. A quiet showstopper." },
    { name: "Classic Twist", tag: "Yeast", shape: "twist", topping: "none",
      glaze: "#ecc187",
      desc: "Hand-twisted and golden — fluffy spirals with a classic glaze hug." },
    { name: "Vanilla Twist", tag: "Yeast", shape: "twist", topping: "none",
      glaze: "#f3ead8",
      desc: "The twist, dialed up with dreamy vanilla glaze. Dangerously good." },
    { name: "S’mores", tag: "Yeast", shape: "ring", topping: "smores",
      glaze: "#6b4327",
      desc: "Toasted marshmallow, graham crunch, and chocolate — campfire, no firewood needed." },
    { name: "Cookie Butter", tag: "Yeast", shape: "ring", topping: "drizzle",
      glaze: "#c98a52", drizzle: "#8c5526",
      desc: "Spiced speculoos drizzle over a fluffy ring. A cookie's cooler cousin." },
    { name: "Blueberry Buttercream", tag: "Yeast", shape: "ring", topping: "berries",
      glaze: "#9aa9e6", crumb: "#3f4f99",
      desc: "Swirls of blueberry buttercream on a tender base. Berry heaven, frosted." },
    { name: "Classic Donut Holes", tag: "Bites", shape: "holes", topping: "none",
      glaze: "#f4e3cf",
      desc: "Two-bite glazed gems. Pop one… okay, pop six." },
    { name: "Old-Fashioned Donut Holes", tag: "Bites", shape: "holes", topping: "none",
      dough: "#d2a05a", glaze: "#e0ad68",
      desc: "Mini old-fashioneds with crispy edges. The whole donut, bite-sized." },
    { name: "Boston Cream", tag: "Filled", shape: "bun", topping: "none",
      dough: "#e9c896", glaze: "#5a3620",
      desc: "Pastry cream tucked inside, glossy chocolate on top. The weekend hero." },
    { name: "Homer", tag: "Yeast", shape: "ring", topping: "sprinkles",
      glaze: "#f6a6cf",
      desc: "Pink glaze and rainbow sprinkles. The pink's from beet — cartoon icon, real ingredients." }
  ];

  function topping(f) {
    switch (f.topping) {
      case "sprinkles": {
        var cols = ["#e8607f", "#f2b134", "#5bbf86", "#5b8def", "#b06fe0", "#ef8f4c"];
        var pts = [[44, 44, 15], [70, 40, -20], [80, 60, 70], [40, 70, -35], [74, 74, 20], [46, 54, -10], [66, 30, 40], [54, 78, 55]];
        return pts.map(function (p, k) {
          return '<rect x="' + p[0] + '" y="' + p[1] + '" width="9" height="3" rx="1.5" fill="' + cols[k % cols.length] + '" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')"/>';
        }).join("");
      }
      case "crumb": {
        var c = [[46, 44], [58, 36], [70, 46], [50, 52], [74, 60], [42, 60], [78, 50], [50, 70], [70, 72]];
        return c.map(function (p) {
          return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.3" fill="var(--crumb)"/>';
        }).join("");
      }
      case "berries": {
        var b = [[48, 44], [72, 44], [42, 64], [78, 64], [60, 78]];
        return b.map(function (p) {
          return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.2" fill="var(--crumb)"/><circle cx="' + (p[0] - 1.3) + '" cy="' + (p[1] - 1.3) + '" r="1.3" fill="#fff" opacity=".5"/>';
        }).join("");
      }
      case "drizzle":
        return '<path d="M34 50 q10 -8 20 0 q10 8 20 0 q8 -6 14 0" stroke="var(--drizzle)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<path d="M34 70 q10 -8 20 0 q10 8 20 0 q8 -6 14 0" stroke="var(--drizzle)" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>';
      case "smores": {
        var marsh = [[44, 42], [64, 40], [54, 70]];
        var s = marsh.map(function (p) {
          return '<rect x="' + p[0] + '" y="' + p[1] + '" width="13" height="11" rx="3.5" fill="#fff7ec"/>' +
            '<rect x="' + p[0] + '" y="' + p[1] + '" width="13" height="11" rx="3.5" fill="#caa06a" opacity=".18"/>';
        }).join("");
        return s + '<path d="M34 60 q10 -6 20 0 q10 6 20 0" stroke="#3a2414" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
      }
      default:
        return "";
    }
  }

  /* Build a self-contained themed donut SVG.
     prefix keeps SVG mask ids unique within a single document. */
  function donutSVG(f, i, prefix) {
    prefix = prefix || "llb";
    var dough = f.dough || DOUGH;
    var shadow = '<ellipse class="llb-donut__shadow" cx="60" cy="108" rx="' + (f.shape === "holes" ? 40 : 32) + '" ry="6"/>';
    var body;

    if (f.shape === "holes") {
      var hole = function (cx, cy) {
        return '<circle cx="' + cx + '" cy="' + (cy + 3) + '" r="20" fill="var(--dough)"/>' +
          '<circle cx="' + cx + '" cy="' + cy + '" r="18" fill="var(--glaze-a)"/>' +
          '<ellipse cx="' + (cx - 6) + '" cy="' + (cy - 7) + '" rx="6" ry="3.4" fill="#fff" opacity=".4"/>';
      };
      body = "<g>" + hole(40, 70) + hole(82, 70) + hole(61, 46) + "</g>";
    } else if (f.shape === "twist") {
      var grooves = "";
      for (var y = 28; y <= 92; y += 12) {
        grooves += '<path d="M45 ' + (y + 6) + ' L75 ' + (y - 2) + '" stroke="var(--dough)" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>';
      }
      body = '<g><rect x="42" y="16" width="36" height="88" rx="18" fill="var(--dough)"/>' +
        '<rect x="44.5" y="19" width="31" height="82" rx="15.5" fill="var(--glaze-a)"/>' +
        grooves + '<ellipse cx="55" cy="34" rx="6" ry="11" fill="#fff" opacity=".26"/></g>';
    } else if (f.shape === "bun") {
      body = '<g><circle cx="60" cy="63" r="42" fill="var(--dough)"/>' +
        '<path d="M20 60 a40 40 0 0 1 80 0 Z" fill="var(--glaze-a)"/>' +
        '<ellipse cx="46" cy="40" rx="14" ry="7" fill="#fff" opacity=".22"/>' +
        '<path d="M28 60 q7 8 15 1 q7 8 15 1 q7 8 15 1 q7 8 15 0" stroke="#f7e4c4" stroke-width="3" fill="none" opacity=".75"/></g>';
    } else {
      var id = prefix + "-hole-" + i;
      var drips = [36, 52, 68, 84].map(function (cx) {
        return '<circle cx="' + cx + '" cy="95" r="6.5" fill="var(--glaze-a)"/>';
      }).join("");
      body = '<defs><mask id="' + id + '"><rect width="120" height="120" fill="#fff"/><circle cx="60" cy="60" r="15" fill="#000"/></mask></defs>' +
        '<g mask="url(#' + id + ')">' +
        '<circle cx="60" cy="64" r="42" fill="var(--dough)"/>' +
        '<circle cx="60" cy="58" r="40" fill="var(--glaze-a)"/>' +
        drips +
        '<ellipse cx="44" cy="42" rx="15" ry="8" fill="#fff" opacity=".3"/>' +
        '<ellipse cx="70" cy="80" rx="22" ry="12" fill="#000" opacity=".06"/>' +
        topping(f) +
        "</g>";
    }

    return '<svg class="llb-donut" viewBox="0 0 120 120" role="img" aria-label="' +
      f.name + ' donut — image coming soon">' + shadow + body + "</svg>";
  }

  /* Inline CSS custom properties that theme one donut/card. */
  function flavorVars(f) {
    return "--dough:" + (f.dough || DOUGH) +
      ";--glaze-a:" + f.glaze +
      ";--drizzle:" + (f.drizzle || f.glaze) +
      ";--crumb:" + (f.crumb || f.drizzle || "#9c5f2c");
  }

  window.LLB = { flavors: FLAVORS, donutSVG: donutSVG, flavorVars: flavorVars, DOUGH: DOUGH };
})();
