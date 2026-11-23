import { SITE, whatsappLink, reducedMotion, finePointer, clamp } from './site.js';
import { initFlow } from './flow.js';

function initLinks() {
  document.querySelectorAll('a[data-wa]').forEach(a => {
    a.href = whatsappLink(a.dataset.wa || undefined);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  document.querySelectorAll('a[data-mail]').forEach(a => { a.href = `mailto:${SITE.email}`; });
  document.querySelectorAll('a[data-ig]').forEach(a => { a.href = SITE.instagram; });
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
}

function initNav() {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('menu');
  let last = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 30);
    const hide = y > last && y > 320 && !document.body.classList.contains('menu-open');
    if (y !== last) {
      nav.classList.toggle('hidden', hide);
      document.documentElement.classList.toggle('nav-hidden', hide);
    }
    last = y;
  }, { passive: true });

  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav-links a').forEach(a => {
    const url = new URL(a.href);
    if (!url.hash && url.pathname === here) a.setAttribute('aria-current', 'page');
  });

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('open'));
    } else {
      menu.classList.remove('open');
      setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, 600);
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });
}

function initReveal() {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    io.unobserve(entry.target);
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  const watch = root => root.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
  watch(document);
  return watch;
}

// A small label that trails the cursor over anything marked with data-cursor.
function initCursorTag() {
  const tag = document.getElementById('cursorTag');
  if (!tag || !finePointer.matches) return;
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
  function loop() {
    x += (tx - x) * .22;
    y += (ty - y) * .22;
    tag.style.transform = `translate(${x + 16}px, ${y + 18}px)`;
    raf = on || Math.abs(tx - x) > .5 || Math.abs(ty - y) > .5 ? requestAnimationFrame(loop) : 0;
  }
  addEventListener('pointermove', e => {
    tx = e.clientX;
    ty = e.clientY;
    const host = e.target.closest?.('[data-cursor]');
    on = Boolean(host);
    if (host && tag.textContent !== host.dataset.cursor) tag.textContent = host.dataset.cursor;
    tag.classList.toggle('on', on);
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerleave', () => tag.classList.remove('on'));
}

// Footer wordmark: every letter lifts and leans away from the pointer on its own spring.
function initFootWord() {
  const word = document.getElementById('footWord');
  if (!word) return;
  const letters = [...word.querySelectorAll('.ch')].map(el => ({ el, y: 140, r: 0, vy: 0, vr: 0, cx: 0, cy: 0 }));
  const pointer = { x: 0, y: 0, on: false, t: 0 };
  let visible = false, entered = false, raf = 0, rect = null;

  function measure() {
    rect = word.getBoundingClientRect();
    letters.forEach(l => {
      l.cx = l.el.offsetLeft + l.el.offsetWidth / 2;
      l.cy = l.el.offsetTop + l.el.offsetHeight / 2;
    });
  }
  function move(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.on = true;
    pointer.t = performance.now();
  }
  const foot = word.closest('.foot');
  foot.addEventListener('pointermove', move, { passive: true });
  foot.addEventListener('pointerdown', move, { passive: true });
  foot.addEventListener('pointerleave', () => { pointer.on = false; });

  function loop(now) {
    raf = 0;
    if (!visible) return;
    rect = word.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(word).fontSize) || 160;
    const radius = size * 1.5 + 120;
    const lift = Math.min(90, size * .26);
    // Touch has no hover: let the last touch fade out after a moment.
    const active = pointer.on && (finePointer.matches || now - pointer.t < 1400);
    const t = now / 1000;
    letters.forEach((l, i) => {
      let ty = entered ? Math.sin(t * 1.1 + i * .8) * size * .012 : 140;
      let tr = entered ? Math.sin(t * .8 + i * 1.3) * 1.2 : 0;
      if (active && entered) {
        const dx = pointer.x - (rect.left + l.cx);
        const dy = pointer.y - (rect.top + l.cy);
        const pull = Math.pow(clamp(1 - Math.hypot(dx, dy) / radius, 0, 1), 1.6);
        ty -= pull * lift;
        tr += pull * clamp(-dx / (size * .5), -1, 1) * 13;
      }
      l.vy += (ty - l.y) * .09;
      l.vr += (tr - l.r) * .09;
      l.vy *= .78;
      l.vr *= .78;
      l.y += l.vy;
      l.r += l.vr;
      l.el.style.transform = `translateY(${l.y.toFixed(2)}px) rotate(${l.r.toFixed(2)}deg)`;
    });
    raf = requestAnimationFrame(loop);
  }

  if (reducedMotion.matches) return;
  letters.forEach(l => { l.el.style.transform = 'translateY(140px)'; });
  measure();
  addEventListener('resize', measure);
  document.fonts.ready.then(measure);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !entered) {
      // Letters spring up one after another the first time the footer shows.
      letters.forEach((l, i) => { l.y = 140 + i * 46; });
      entered = true;
    }
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }, { threshold: .15 }).observe(word);
}

// Dotted grid behind the footer; dots swell and redden near the pointer.
function initFootDots() {
  const canvas = document.getElementById('footDots');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const foot = canvas.parentElement;
  const gap = 26;
  let w = 0, h = 0, px = -999, py = -999, queued = false;
  function draw() {
    queued = false;
    ctx.clearRect(0, 0, w, h);
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        const near = clamp(1 - Math.hypot(x - px, y - py) / 150, 0, 1);
        ctx.fillStyle = near > 0 ? `rgba(${255},${Math.round(255 - near * 215)},${Math.round(255 - near * 190)},${.07 + near * .7})` : 'rgba(255,255,255,.07)';
        const s = 1.6 + near * 2.6;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
  }
  const request = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = foot.clientWidth;
    h = foot.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  resize();
  new ResizeObserver(resize).observe(foot);
  foot.addEventListener('pointermove', e => {
    const r = foot.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    request();
  }, { passive: true });
  foot.addEventListener('pointerleave', () => { px = py = -999; request(); });
}

function initClock() {
  const clock = document.getElementById('istClock');
  if (!clock) return;
  const format = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const tick = () => { clock.textContent = format.format(new Date()); };
  tick();
  setInterval(tick, 20000);
}

export function initCommon() {
  initLinks();
  initNav();
  initCursorTag();
  initFootWord();
  initFootDots();
  initClock();
  const pageFlow = document.querySelector('.page-flow');
  if (pageFlow) initFlow(pageFlow);
  document.getElementById('toTop')?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
  return { watchReveal: initReveal() };
}
