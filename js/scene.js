/* =========================================================
   FROSTFALL — Scene engine
   A self-playing cinematic approach to the obsidian keep.
   - Timed exponential dolly on layered castle silhouettes
   - Floating text that materializes and dissolves in place
   - Fire in the gate → full flash → hard cut to black →
     slow cinematic reveal of the hall
   - Skip during the intro; replay any time from inside.
   - One particle canvas: stars + snow outside, embers inside.
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const approach = document.getElementById('approach');
  const stage = document.getElementById('stage');
  const flash = document.getElementById('flash');
  const blackout = document.getElementById('blackout');
  const bgWarm = document.getElementById('bgWarm');
  const bgCold = document.getElementById('bgCold');
  const canvas = document.getElementById('particles');
  const skipBtn = document.getElementById('skipIntro');
  const replayBtn = document.getElementById('replayBtn');
  if (!stage || !canvas) return;

  const DUR = 16000;            // full approach, ms
  const SKIP_FROM = 0.88;       // skip fast-forwards to here (plays the flash)

  const ctx = canvas.getContext('2d');
  const layers = Array.from(stage.querySelectorAll('.layer'))
    .map((el) => ({ el, k: parseFloat(el.dataset.k) || 2 }));
  const ftexts = Array.from(stage.querySelectorAll('.ftext')).map((el) => {
    el.style.setProperty('--x', el.dataset.x + '%');
    el.style.setProperty('--y', el.dataset.y + '%');
    return { el, p0: parseFloat(el.dataset.p) };
  });

  let W = 0, H = 0, DPR = 1;
  let mode = 'idle';            // 'intro' | 'idle'
  let t0 = 0;
  let p = 0;                    // approach progress 0..1
  let inside = 0;               // 0 outside → 1 inside

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* ---------- apply camera state ---------- */
  function apply() {
    for (const l of layers) {
      l.el.style.transform = 'scale(' + Math.pow(l.k, p).toFixed(4) + ')';
    }

    stage.style.setProperty('--fireop', (0.3 + 0.7 * p * p).toFixed(3));
    stage.style.setProperty('--winop', (p * p).toFixed(3));

    // floating texts: materialize, hold, dissolve — all in place
    for (const t of ftexts) {
      const q = (p - (t.p0 - 0.08)) / 0.17;
      if (q <= 0 || q >= 1) { t.el.style.opacity = 0; continue; }
      let op, blur, scale, dy;
      if (q < 0.3) {                    // materialize
        const u = q / 0.3;
        op = u; blur = (1 - u) * 3; scale = 0.96 + 0.04 * u; dy = 0;
      } else if (q < 0.68) {            // hold
        op = 1; blur = 0; scale = 1 + (q - 0.3) * 0.02; dy = 0;
      } else {                          // dissolve
        const u = (q - 0.68) / 0.32;
        op = 1 - u; blur = u * 4; scale = 1.008 + u * 0.06; dy = -u * 1.6;
      }
      t.el.style.opacity = op.toFixed(3);
      t.el.style.filter = blur > 0.1 ? 'blur(' + blur.toFixed(2) + 'px)' : 'none';
      t.el.style.transform =
        'translate(-50%, -50%) translateY(' + dy.toFixed(2) + 'vh) scale(' + scale.toFixed(3) + ')';
    }

    flash.style.opacity = smooth(0.84, 0.95, p).toFixed(3);

    inside = smooth(0.8, 0.95, p);
    bgWarm.style.opacity = inside.toFixed(3);
    bgCold.style.opacity = (1 - inside).toFixed(3);

    if (skipBtn) skipBtn.style.opacity = p > 0.8 ? 0 : 1;
  }

  /* ---------- intro control ---------- */
  function playIntro() {
    window.scrollTo(0, 0);
    document.body.classList.add('is-intro');
    document.body.classList.remove('is-inside', 'is-entering');
    approach.classList.remove('is-done');
    blackout.classList.remove('is-cut');
    blackout.style.opacity = 0;
    stage.style.opacity = 1;
    mode = 'intro';
    t0 = performance.now();
  }

  function endIntro() {
    mode = 'idle';
    p = 1; inside = 1;
    apply();

    // hard cut to black over the flash…
    blackout.classList.add('is-cut');          // opacity 1, no transition
    approach.classList.add('is-done');
    document.body.classList.remove('is-intro');
    document.body.classList.add('is-inside', 'is-entering');
    bgWarm.style.opacity = 1; bgCold.style.opacity = 0;

    // …then the hall wakes slowly out of it
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        blackout.classList.remove('is-cut');   // transition back on
        blackout.style.opacity = 0;
      });
    });
    setTimeout(() => document.body.classList.remove('is-entering'), 3200);
  }

  if (skipBtn) skipBtn.addEventListener('click', () => {
    if (mode !== 'intro') return;
    const raw = (performance.now() - t0) / DUR;
    if (raw < SKIP_FROM) t0 = performance.now() - SKIP_FROM * DUR;
  });

  if (replayBtn) replayBtn.addEventListener('click', () => {
    if (mode === 'intro') return;
    playIntro();
  });

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
      hue: 18 + Math.random() * 26,
      life: 0.6 + Math.random() * 0.4,
    };
  }

  function drawParticles(dt, t) {
    ctx.clearRect(0, 0, W, H);
    const cold = 1 - inside, warm = inside;

    if (t > gustT) { windTarget = (Math.random() - 0.35) * 0.8; gustT = t + 3000 + Math.random() * 5000; }
    wind += (windTarget - wind) * 0.01;

    if (cold > 0.02) {
      for (const s of stars) {
        s.tw += s.ts * dt;
        ctx.globalAlpha = cold * (0.35 + 0.4 * Math.sin(s.tw)) * 0.9;
        ctx.fillStyle = '#e8eef3';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
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

    if (mode === 'intro') {
      const raw = clamp((t - t0) / DUR, 0, 1);
      p = Math.pow(raw, 1.25);      // slow start, accelerating toward the gate
      apply();
      if (raw >= 1) endIntro();
    }

    drawParticles(dt, t);
    requestAnimationFrame(frame);
  }

  /* ---------- boot ---------- */
  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion) {
    // no cutscene: land inside, draw one calm frame
    p = 1; inside = 1;
    approach.classList.add('is-done');
    document.body.classList.add('is-inside');
    bgWarm.style.opacity = 1; bgCold.style.opacity = 0;
    drawParticles(1, 0);
  } else {
    playIntro();
    requestAnimationFrame(frame);
  }
})();
