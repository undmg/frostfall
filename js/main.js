/* =========================================================
   FROSTFALL — Interior interactions
   Preloader, custom cursor, scroll reveals, nav state,
   animated counters, relic auras, form, and ambient wind.
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Preloader ---------- */
  window.addEventListener('load', () => {
    const pl = $('#preloader');
    if (!pl) return;
    setTimeout(() => pl.classList.add('is-done'), reduceMotion ? 200 : 1100);
    setTimeout(() => pl.remove(), 2100);
  });

  /* ---------- Year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Custom cursor ---------- */
  const cursor = $('#cursor');
  if (cursor && !matchMedia('(pointer: coarse)').matches) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));

    const hot = 'a, button, .rune, .relic, input, textarea, [tabindex]';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(hot)) cursor.classList.add('is-hot');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(hot)) cursor.classList.remove('is-hot');
    });

    (function follow() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(follow);
    })();
  }

  /* ---------- Scroll progress ---------- */
  const bar = $('#scrollBar');
  function onScroll() {
    const st = window.scrollY || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.width = (h > 0 ? (st / h) * 100 : 0) + '%';
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  const runeEls = $$('.rune');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));

    const rio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); rio.unobserve(en.target); } });
    }, { threshold: 0.4 });
    runeEls.forEach((el) => rio.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
    runeEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        const el = en.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        if (reduceMotion) { el.textContent = target + suffix; return; }
        const dur = 1600; const start = performance.now();
        (function tick(now) {
          const pr = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - pr, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (pr < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.6 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------- Active nav link ---------- */
  const sections = ['hall', 'forge', 'vault', 'ravenry']
    .map((id) => document.getElementById(id)).filter(Boolean);
  const linkFor = {};
  $$('.nav__links a').forEach((a) => { linkFor[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          Object.values(linkFor).forEach((l) => l.classList.remove('is-active'));
          const l = linkFor[en.target.id];
          if (l) l.classList.add('is-active');
        }
      });
    }, { threshold: 0.4, rootMargin: '-25% 0px -45% 0px' });
    sections.forEach((s) => sio.observe(s));
  }

  /* ---------- Mobile nav ---------- */
  const toggle = $('#navToggle');
  const links = $('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Relic aura follows cursor ---------- */
  if (!reduceMotion) {
    $$('.relic').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left - r.width / 2) * 0.4 + 'px');
        card.style.setProperty('--my', (e.clientY - r.top - r.height / 2) * 0.4 + 'px');
      });
    });
  }

  /* ---------- Ravenry form ---------- */
  const form = $('#ravenForm');
  const status = $('#ravenStatus');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#name').value.trim();
      const email = $('#email').value.trim();
      const msg = $('#message').value.trim();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!name || !validEmail || !msg) {
        status.textContent = 'The raven refuses — fill each field with care.';
        status.style.color = 'var(--ember)';
        return;
      }
      status.style.color = 'var(--gold)';
      status.textContent = 'Releasing the raven…';
      setTimeout(() => {
        status.textContent = `It takes wing, ${name.split(' ')[0]}. Watch the smoke above the towers for a reply.`;
        form.reset();
      }, 1100);
    });
  }

  /* ---------- Ambient winter wind (WebAudio, opt-in) ---------- */
  const soundBtn = $('#soundToggle');
  let audioCtx = null, windNode = null, gain = null, lfo = null, on = false;
  function buildWind() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const len = audioCtx.sampleRate * 2;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.029;
      b1 = 0.96 * b1 + white * 0.043;
      b2 = 0.57 * b2 + white * 0.15;
      data[i] = (b0 + b1 + b2) * 0.4;
    }
    windNode = audioCtx.createBufferSource();
    windNode.buffer = buf; windNode.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 480; filter.Q.value = 0.6;

    lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.08;
    const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 320;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);

    gain = audioCtx.createGain(); gain.gain.value = 0;
    windNode.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
    windNode.start(); lfo.start();
  }
  if (soundBtn) {
    soundBtn.addEventListener('click', async () => {
      if (!audioCtx) buildWind();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      on = !on;
      soundBtn.classList.toggle('is-on', on);
      soundBtn.setAttribute('aria-pressed', String(on));
      const now = audioCtx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(on ? 0.12 : 0, now + (on ? 1.4 : 0.6));
    });
  }

  /* ---------- Easter egg: press "b" for a blizzard flash ---------- */
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'b' && !/input|textarea/i.test(document.activeElement.tagName)) {
      document.body.animate(
        [{ filter: 'brightness(1)' }, { filter: 'brightness(1.35) contrast(1.1)' }, { filter: 'brightness(1)' }],
        { duration: 900, easing: 'ease-in-out' }
      );
    }
  });
})();
