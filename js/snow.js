/* =========================================================
   FROSTFALL — Snow & Aurora engine
   Two canvases: a slow aurora wash behind, and a layered,
   wind-driven, mouse-reactive snowfall in front.
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const snowCanvas = document.getElementById('snow');
  const auroraCanvas = document.getElementById('aurora');
  if (!snowCanvas || !auroraCanvas) return;

  const sctx = snowCanvas.getContext('2d');
  const actx = auroraCanvas.getContext('2d');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  const pointer = { x: -9999, y: -9999, active: false };

  /* ---------- sizing ---------- */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    [snowCanvas, auroraCanvas].forEach((c) => {
      c.width = W * DPR;
      c.height = H * DPR;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    actx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildFlakes();
  }

  /* ---------- snowflakes ---------- */
  // Three depth layers: far (tiny, slow, faint), mid, near (big, fast, bright).
  const LAYERS = [
    { count: 0.00007, rMin: 0.4, rMax: 1.1, vy: 0.18, alpha: 0.35, sway: 0.4, blur: 0 },
    { count: 0.00006, rMin: 1.0, rMax: 2.0, vy: 0.42, alpha: 0.6,  sway: 0.8, blur: 0 },
    { count: 0.00003, rMin: 1.8, rMax: 3.6, vy: 0.85, alpha: 0.9,  sway: 1.3, blur: 1 },
  ];
  let flakes = [];

  function buildFlakes() {
    flakes = [];
    const area = W * H;
    LAYERS.forEach((layer, li) => {
      const n = Math.max(8, Math.floor(area * layer.count));
      for (let i = 0; i < n; i++) {
        flakes.push(newFlake(layer, li, true));
      }
    });
  }

  function newFlake(layer, li, seeded) {
    return {
      layer: li,
      x: Math.random() * W,
      y: seeded ? Math.random() * H : -10,
      r: layer.rMin + Math.random() * (layer.rMax - layer.rMin),
      vy: layer.vy * (0.7 + Math.random() * 0.6),
      alpha: layer.alpha * (0.6 + Math.random() * 0.4),
      phase: Math.random() * Math.PI * 2,
      swayAmp: layer.sway * (0.5 + Math.random()),
      spin: (Math.random() - 0.5) * 0.02,
    };
  }

  /* ---------- wind ---------- */
  let windTarget = 0.25, wind = 0.25, gustT = 0;
  function updateWind(t) {
    // slow drift plus occasional gusts
    if (t > gustT) {
      windTarget = (Math.random() - 0.35) * 0.9;
      gustT = t + 3000 + Math.random() * 5000;
    }
    wind += (windTarget - wind) * 0.01;
  }

  /* ---------- aurora ---------- */
  const bands = [
    { hue: 168, y: 0.16, amp: 40, speed: 0.00013, phase: 0, a: 0.10 },
    { hue: 200, y: 0.10, amp: 60, speed: 0.00009, phase: 2, a: 0.08 },
    { hue: 150, y: 0.22, amp: 30, speed: 0.00017, phase: 4, a: 0.07 },
  ];
  function drawAurora(t) {
    actx.clearRect(0, 0, W, H);
    actx.globalCompositeOperation = 'lighter';
    bands.forEach((b) => {
      const baseY = H * b.y;
      const grad = actx.createLinearGradient(0, baseY - 120, 0, baseY + 160);
      grad.addColorStop(0, `hsla(${b.hue}, 80%, 62%, 0)`);
      grad.addColorStop(0.5, `hsla(${b.hue}, 80%, 62%, ${b.a})`);
      grad.addColorStop(1, `hsla(${b.hue}, 80%, 62%, 0)`);
      actx.fillStyle = grad;
      actx.beginPath();
      actx.moveTo(0, baseY);
      const step = 40;
      for (let x = 0; x <= W + step; x += step) {
        const y = baseY
          + Math.sin(x * 0.004 + t * b.speed + b.phase) * b.amp
          + Math.sin(x * 0.011 + t * b.speed * 1.7) * (b.amp * 0.4);
        actx.lineTo(x, y);
      }
      actx.lineTo(W, baseY + 220);
      actx.lineTo(0, baseY + 220);
      actx.closePath();
      actx.fill();
    });
    actx.globalCompositeOperation = 'source-over';
  }

  /* ---------- main loop ---------- */
  let last = 0, auroraAccum = 0;
  function frame(t) {
    if (!last) last = t;
    const dt = Math.min(48, t - last) / 16.67; // normalized to ~60fps
    last = t;

    updateWind(t);

    // Aurora is expensive-ish; refresh at ~20fps
    auroraAccum += dt;
    if (auroraAccum > 3) { drawAurora(t); auroraAccum = 0; }

    sctx.clearRect(0, 0, W, H);

    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      const layer = LAYERS[f.layer];
      f.phase += f.spin * dt;

      // horizontal: wind (scaled by depth) + gentle sway
      const depth = 0.4 + f.layer * 0.4;
      f.x += (wind * depth * 1.4 + Math.sin(f.phase) * f.swayAmp * 0.3) * dt;
      f.y += f.vy * depth * dt * 1.6;

      // pointer repulsion — only the nearer layers feel it
      if (pointer.active && f.layer > 0) {
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        const R = 120;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const force = (1 - d / R) * 2.2 * depth;
          f.x += (dx / d) * force;
          f.y += (dy / d) * force * 0.6;
        }
      }

      // recycle
      if (f.y - f.r > H) { Object.assign(f, newFlake(layer, f.layer, false)); f.x = Math.random() * W; }
      if (f.x > W + 20) f.x = -20;
      else if (f.x < -20) f.x = W + 20;

      // draw
      sctx.globalAlpha = f.alpha;
      sctx.fillStyle = f.layer === 2 ? '#eaf6ff' : '#cfe6ff';
      sctx.beginPath();
      sctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      sctx.fill();
      // soft halo on the nearest, brightest flakes
      if (f.layer === 2) {
        sctx.globalAlpha = f.alpha * 0.25;
        sctx.beginPath();
        sctx.arc(f.x, f.y, f.r * 2.4, 0, Math.PI * 2);
        sctx.fill();
      }
    }
    sctx.globalAlpha = 1;

    requestAnimationFrame(frame);
  }

  /* ---------- reduced motion: paint a calm static scene ---------- */
  function staticScene() {
    resize();
    drawAurora(0);
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      sctx.globalAlpha = f.alpha;
      sctx.fillStyle = '#cfe6ff';
      sctx.beginPath();
      sctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      sctx.fill();
    }
    sctx.globalAlpha = 1;
  }

  /* ---------- events ---------- */
  window.addEventListener('resize', debounce(resize, 200));
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; });

  function debounce(fn, ms) {
    let id; return function () { clearTimeout(id); id = setTimeout(fn, ms); };
  }

  /* ---------- boot ---------- */
  resize();
  if (reduceMotion) {
    staticScene();
  } else {
    requestAnimationFrame(frame);
  }
})();
