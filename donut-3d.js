/* ===== Desktop donut: depth, lean, swell =====
   script.js still owns position (--donut-x) and roll (--donut-rot). This layer
   reads the x it sets each frame, derives velocity, and drives:
     --donut-ty    lean into the roll (spring, so it wobbles when it parks)
     --donut-tx    pointer tilt + idle float
     --donut-scale swell toward the viewer while moving
     --donut-lift  slow idle bob
   Desktop push-stage only; phones keep the flat scroll-spin. */
(function () {
  var donut = document.getElementById("rolling-donut");
  if (!donut) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var DESKTOP_MIN_PX = 900;
  var LEAN_PER_PX = 0.95;      // deg of rotateY per px/frame of travel
  var LEAN_MAX = 26;           // deg
  var IDLE_DEG_PER_S = 2.4;
  var SWELL_MAX = 0.24;        // +24% size at full speed
  var SWELL_SPEED_PX = 26;     // px/frame that counts as "full speed"
  var POINTER_TILT = 11;       // deg at viewport edges
  var SPRING_K = 0.085;
  var SPRING_DAMP = 0.8;

  var lastX = null;
  var vel = 0;
  var lean = 0;
  var leanVel = 0;
  var scale = 1;
  var tiltX = 0;
  var tiltY = 0;
  var targetTiltX = 0;
  var targetTiltY = 0;
  var active = false;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function readX() {
    var raw = donut.style.getPropertyValue("--donut-x");
    var n = parseFloat(raw);
    return isNaN(n) ? null : n;
  }

  function desktop() {
    return window.innerWidth >= DESKTOP_MIN_PX;
  }

  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }

  function reset() {
    donut.style.setProperty("--donut-ty", "0deg");
    donut.style.setProperty("--donut-tx", "0deg");
    donut.style.setProperty("--donut-scale", "1");
    donut.style.setProperty("--donut-lift", "0px");
    donut.style.setProperty("--donut-idle", "0deg");
    lean = 0; leanVel = 0; scale = 1; tiltX = 0; tiltY = 0; vel = 0; lastX = null;
  }

  if (fine) {
    window.addEventListener("mousemove", function (e) {
      if (!active) return;
      var nx = (e.clientX / window.innerWidth) * 2 - 1;
      var ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetTiltY = nx * POINTER_TILT;
      targetTiltX = -ny * POINTER_TILT;
    }, { passive: true });
    window.addEventListener("mouseleave", function () {
      targetTiltX = 0;
      targetTiltY = 0;
    });
  }

  function frame(now) {
    var isDesktop = desktop();
    if (isDesktop !== active) {
      active = isDesktop;
      if (!active) reset();
    }
    if (active) {
      var x = readX();
      if (x !== null) {
        if (lastX !== null) {
          var v = x - lastX;
          vel += (v - vel) * 0.35;
        }
        lastX = x;
      }

      // Lean into travel with a spring, so it rocks back upright when it parks.
      var leanTarget = clamp(vel * LEAN_PER_PX, -LEAN_MAX, LEAN_MAX);
      leanVel = (leanVel + (leanTarget - lean) * SPRING_K) * SPRING_DAMP;
      lean += leanVel;

      // Swell toward the viewer while moving.
      var speed = clamp(Math.abs(vel) / SWELL_SPEED_PX, 0, 1);
      var scaleTarget = 1 + Math.sin(speed * Math.PI * 0.5) * SWELL_MAX;
      scale += (scaleTarget - scale) * 0.1;

      // Pointer tilt and idle float.
      tiltX += (targetTiltX - tiltX) * 0.06;
      tiltY += (targetTiltY - tiltY) * 0.06;
      var t = now * 0.001;
      var idleX = Math.sin(t * 0.9) * 2.4;
      var idleY = Math.cos(t * 0.7) * 2.4;
      var lift = Math.sin(t * 0.8) * 7;

      donut.style.setProperty("--donut-ty", (lean + tiltY + idleY).toFixed(2) + "deg");
      donut.style.setProperty("--donut-tx", (tiltX + idleX).toFixed(2) + "deg");
      donut.style.setProperty("--donut-scale", scale.toFixed(4));
      donut.style.setProperty("--donut-lift", lift.toFixed(2) + "px");
      // Slow idle turn so the parked donut never reads as a still image.
      donut.style.setProperty("--donut-idle", ((t * IDLE_DEG_PER_S) % 360).toFixed(2) + "deg");
    }
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
})();
