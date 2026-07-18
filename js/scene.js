/* =========================================================
   FROSTFALL — Scene engine
   A scroll-driven dolly toward the obsidian keep.
   - Exponential zoom on layered castle silhouettes
   - Floating text that lurks in depth and flies past camera
   - Fire in the gate that grows into the pass-through flash
   - One particle canvas: stars + snow outside, embers inside,
     crossfaded by how far through the gate you are.
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const approach = document.getElementById('approach');
  const stage = document.getElementById('stage');
  const flash = document.getElementById('flash');
  const hint = document.getElementById('hint');
  const bgWarm = document.getElementById('bgWarm');
  const bgCold = document.getElementById('bgCold');
  const canvas = document.getElementById('particles');
  if (!stage || !canvas) return;

  const ctx = canvas.getContext('2d');
  const layers = Array.from(stage.querySelectorAll('.layer'))
    .map((el) => ({ el, k: parseFloat(el.dataset.k) || 2 }));
  const ftexts = Array.from(stage.querySelectorAll('.ftext')).map((el) => {
    const p0 = parseFloat(el.dataset.p);
    el.style.setProperty('--x', el.dataset.x + '%');
    el.style.setProperty('--y', el.dataset.y + '%');
    return {
      el, p0,
      x: parseFloat(el.dataset.x),
      y: parseFloat(el.dataset.y),
      side: parseFloat(el.dataset.x) < 50 ? -1 : 1,
    };
  });

  let W = 0, H = 0, DPR = 1;
  let targetP = 0, p = 0;       // approach progress 0..1
  let inside = 0;               // 0 outside → 1 inside
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- scroll → progress ---------- */
  function readScroll() {
    const rect = approach.getBoundingClientRect();
    const span = approach.offsetHeight - window.innerHeight;
    targetP = span > 0 ? clamp(-rect.top / span, 0, 1) : 1;
  }
  window.addEventListener('scroll', readScroll, { passive: true });

  /* ---------- apply camera state ---------- */
  function apply() {
    // dolly: exponential scale per layer, origin at the gate
    for (const l of layers) {
      l.el.style.transform = 'scale(' + Math.pow(l.k, p).toFixed(4) + ')';
    }

    // fire + windows brighten on approach
    stage.style.setProperty('--fireop', (0.3 + 0.7 * p * p).toFixed(3));
    stage.style.setProperty('--winop', (p * p).toFixed(3));

    // floating texts: local window around p0 — grow, pass, blur out
    for (const t of ftexts) {
      const q = (p - (t.p0 - 0.085)) / 0.175;
      if (q <= 0 || q >= 1) { t.el.style.opacity = 0; continue; }
      const s = 0.72 * Math.pow(6.5, q);                    // fly toward camera
      const dx = (t.x - 50) * q * q * 1.7;                  // drift outward from gate
      const dy = (t.y - 55) * q * q * 1.1;
      const op = Math.pow(Math.sin(Math.PI * q), 0.9) * (s > 3.4 ? clamp(1 - (s - 3.4) / 1.6, 0, 1) : 1);
      const blur = clamp((s - 2.4) * 1.4, 0, 5);
      const rot = t.side * (1 - q) * 14;
      t.el.style.opacity = op.toFixed(3);
      t.el.style.filter = blur > 0.1 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
      t.el.style.transform =
        'translate(-50%, -50%) translate(' + dx.toFixed(1) + 'vw,' + dy.toFixed(1) + 'vh)' +
        ' perspective(900px) rotateY(' + rot.toFixed(1) + 'deg) scale(' + s.toFixed(3) + ')';
    }

    // pass-through flash + fade the stage away
    flash.style.opacity = smooth(0.8, 0.94, p).toFixed(3);
    stage.style.opacity = (1 - smooth(0.955, 1, p)).toFixed(3);

    // world state
    inside = smooth(0.86, 0.985, p);
    bgWarm.style.opacity = inside.toFixed(3);
    bgCold.style.opacity = (1 - inside).toFixed(3);
    document.body.classList.toggle('is-inside', p > 0.93);

    // hint fades as soon as the journey starts
    if (hint) hint.style.opacity = p < 0.02 ? 1 : 0;
  }

  /* =========================================================
     PARTICLES — stars & snow (cold) / embers (warm)
     ========================================================= */
  let stars = [], flakes = [], embers = [];
  let wind = 0.2, windTarget = 0.2, gustT = 0;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    const area = W * H;
    stars = [];
    for (let i = 0; i < Math.floor(area * 0.00008); i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.72,
        r: 0.4 + Math.random() * 1.1, tw: Math.random() * Math.PI * 2, ts: 0.008 + Math.random() * 0.02 });
    }
    flakes = [];
    const layersDef = [
      { n: area * 0.00006, rMin: 0.4, rMax: 1.1, vy: 0.2, a: 0.35, d: 0.5 },
      { n: area * 0.00005, rMin: 1.0, rMax: 2.0, vy: 0.45, a: 0.6, d: 0.8 },
      { n: area * 0.000025, rMin: 1.8, rMax: 3.4, vy: 0.9, a: 0.9, d: 1.2 },
    ];
    layersDef.forEach((L) => {
      for (let i = 0; i < L.n; i++) {
        flakes.push({ x: Math.random() * W, y: Math.random() * H,
          r: L.rMin + Math.random() * (L.rMax - L.rMin),
          vy: L.vy * (0.7 + Math.random() * 0.6), a: L.a * (0.6 + Math.random() * 0.4),
          d: L.d, ph: Math.random() * Math.PI * 2, sp: (Math.random() - 0.5) * 0.02 });
      }
    });
    embers = [];
    for (let i = 0; i < Math.floor(area * 0.00004); i++) embers.push(newEmber(true));
  }

  function newEmber(seed) {
    return {
      x: Math.random() * W,
      y: seed ? Math.random() * H : H + 6,
      r: 0.5 + Math.random() * 1.8,
      vy: 0.25 + Math.random() * 0.8,
      vx: (Math.random() - 0.5) * 0.3,
      a: 0.25 + Math.random() * 0.6,
      ph: Math.random() * Math.PI * 2,
      hue: 18 + Math.random() * 26,       // ember orange → gold
      life: 0.6 + Math.random() * 0.4,
    };
  }

  function drawParticles(dt, t) {
    ctx.clearRect(0, 0, W, H);
    const cold = 1 - inside, warm = inside;

    // wind
    if (t > gustT) { windTarget = (Math.random() - 0.35) * 0.8; gustT = t + 3000 + Math.random() * 5000; }
    wind += (windTarget - wind) * 0.01;

    if (cold > 0.02) {
      // stars
      for (const s of stars) {
        s.tw += s.ts * dt;
        ctx.globalAlpha = cold * (0.35 + 0.4 * Math.sin(s.tw)) * 0.9;
        ctx.fillStyle = '#e8eef3';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      // snow — white with the faintest ice-blue cast
      for (const f of flakes) {
        f.ph += f.sp * dt;
        f.x += (wind * f.d * 1.3 + Math.sin(f.ph) * 0.35) * dt;
        f.y += f.vy * f.d * dt * 1.6;
        if (f.y - f.r > H) { f.y = -8; f.x = Math.random() * W; }
        if (f.x > W + 16) f.x = -16; else if (f.x < -16) f.x = W + 16;
        ctx.globalAlpha = cold * f.a;
        ctx.fillStyle = f.d > 1 ? '#f2f5f8' : '#d9e2ea';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        if (f.d > 1) {
          ctx.globalAlpha = cold * f.a * 0.22;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 2.3, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    if (warm > 0.02) {
      // embers — rise, flicker, die
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.ph += 0.04 * dt;
        e.x += (e.vx + Math.sin(e.ph) * 0.25) * dt;
        e.y -= e.vy * dt * 1.4;
        e.life -= 0.0012 * dt;
        if (e.y < -8 || e.life <= 0) { embers[i] = newEmber(false); continue; }
        const flick = 0.7 + 0.3 * Math.sin(e.ph * 3);
        ctx.globalAlpha = warm * e.a * e.life * flick;
        ctx.fillStyle = 'hsl(' + e.hue + ', 88%, ' + (52 + e.life * 14) + '%)';
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = warm * e.a * e.life * 0.25 * flick;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- main loop ---------- */
  let last = 0;
  function frame(t) {
    if (!last) last = t;
    const dt = Math.min(48, t - last) / 16.67;
    last = t;

    p += (targetP - p) * Math.min(1, 0.14 * dt);   // eased camera
    if (Math.abs(targetP - p) < 0.0004) p = targetP;
    apply();
    drawParticles(dt, t);
    requestAnimationFrame(frame);
  }

  /* ---------- reduced motion: skip the dolly ---------- */
  function staticBoot() {
    resize();
    targetP = 1; p = 1;
    apply();
    document.body.classList.add('is-inside');
    drawParticles(1, 0);
  }

  window.addEventListener('resize', () => { resize(); readScroll(); });

  resize();
  readScroll();
  if (reduceMotion) {
    staticBoot();
  } else {
    p = targetP;   // land where we are on reload mid-page
    requestAnimationFrame(frame);
  }
})();
