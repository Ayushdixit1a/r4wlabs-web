import { reducedMotion } from './site.js';

const base = import.meta.env.BASE_URL;
export const mediaUrl = path => base + path.replace(/^\//, '');
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

/** Reads the manifest written by `npm run videos`. */
export async function loadReels() {
  try {
    const response = await fetch(mediaUrl('media/manifest.json'), { cache: 'no-cache' });
    if (!response.ok) throw new Error(response.status);
    return await response.json();
  } catch {
    return { top: [], bts: [], industries: [], wild: [], sample: false };
  }
}

let lightbox;
function getLightbox() {
  if (lightbox) return lightbox;
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `
    <div class="lb-in">
      <div class="lb-stage"><video playsinline controls preload="metadata"></video></div>
    </div>
    <div class="lb-top"><span class="lb-count"></span><button class="lb-close" type="button" aria-label="Close">${ICON.close}</button></div>
    <button class="lb-nav lb-prev" type="button" aria-label="Previous reel">${ICON.prev}</button>
    <button class="lb-nav lb-next" type="button" aria-label="Next reel">${ICON.next}</button>
    <p class="lb-title"></p>`;
  document.body.appendChild(dialog);
  const video = dialog.querySelector('video');
  const stage = dialog.querySelector('.lb-stage');
  let items = [], index = 0;

  // Fit the player to the screen whatever the reel's shape (portrait or landscape).
  function fit() {
    const item = items[index];
    if (!item) return;
    const box = dialog.querySelector('.lb-in');
    const style = getComputedStyle(box);
    const availW = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availH = box.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const w = item.width || 9, h = item.height || 16;
    const scale = Math.min(availW / w, availH / h);
    stage.style.width = `${Math.floor(w * scale)}px`;
    stage.style.height = `${Math.floor(h * scale)}px`;
  }
  addEventListener('resize', fit);

  function show(i) {
    index = (i + items.length) % items.length;
    const item = items[index];
    fit();
    video.poster = mediaUrl(item.poster);
    video.src = mediaUrl(item.src);
    video.play().catch(() => {});
    dialog.querySelector('.lb-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    dialog.querySelector('.lb-title').textContent = '';
    dialog.querySelectorAll('.lb-nav').forEach(b => { b.hidden = items.length < 2; });
  }
  dialog.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  dialog.querySelector('.lb-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog || e.target.classList.contains('lb-in')) dialog.close(); });
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    document.dispatchEvent(new Event('reels:resume'));
  });

  lightbox = {
    open(list, i) {
      items = list;
      document.dispatchEvent(new Event('reels:pause'));
      dialog.showModal();
      show(i);
    },
  };
  return lightbox;
}

/**
 * Horizontal reel slider. Each card loops a short muted preview while it is on screen;
 * clicking opens the full reel with sound.
 */
export function mountReels(mount, items, { label = 'Reels', emptyHint = '', autoplay = 0 } = {}) {
  if (!items.length) {
    mount.innerHTML = `<div class="reels-empty"><b>Reels coming soon.</b><br>${escapeHtml(emptyHint)}</div>`;
    return;
  }
  const landscape = item => item.width > item.height;
  mount.innerHTML = `
    <div class="reels${items.every(landscape) ? ' all-land' : ''}">
      <div class="reels-track" tabindex="0" role="group" aria-label="${escapeHtml(label)}">
        ${items.map((item, i) => `
          <button class="reel${landscape(item) ? ' land' : ''}" type="button" data-i="${i}" data-cursor="play ▶" aria-label="Play reel ${i + 1}">
            <img src="${escapeHtml(mediaUrl(item.poster))}" alt="" loading="lazy" decoding="async" draggable="false">
            <video muted loop playsinline preload="none" data-src="${escapeHtml(mediaUrl(item.preview))}" tabindex="-1" aria-hidden="true"></video>
            <span class="reel-num">${String(i + 1).padStart(2, '0')}</span>
            ${item.sample ? '<span class="reel-tag">SAMPLE</span>' : ''}
            <span class="reel-cap">
              <span class="reel-play">${ICON.play}</span>
            </span>
          </button>`).join('')}
      </div>
      <div class="reels-ui">
        ${autoplay ? `<span class="reels-timer" aria-hidden="true"><b>${Math.round(autoplay / 1000)}</b></span>` : ''}
        <span class="reels-count">${String(items.length).padStart(2, '0')} reels</span>
        <div class="reels-progress" aria-hidden="true"><i></i></div>
        <div class="reels-arrows">
          <button type="button" class="reels-prev" aria-label="Previous reels">${ICON.prev}</button>
          <button type="button" class="reels-next" aria-label="Next reels">${ICON.next}</button>
        </div>
      </div>
    </div>`;

  const track = mount.querySelector('.reels-track');
  const cards = [...track.querySelectorAll('.reel')];
  const bar = mount.querySelector('.reels-progress i');
  const prev = mount.querySelector('.reels-prev');
  const next = mount.querySelector('.reels-next');

  function update() {
    const max = track.scrollWidth - track.clientWidth;
    const shown = track.clientWidth / track.scrollWidth;
    const p = max > 0 ? track.scrollLeft / max : 0;
    bar.style.transform = `translateX(${p * (1 - shown) * 100}%) scaleX(${Math.min(1, shown)})`;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  }
  const page = dir => {
    const stepSize = cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 16);
    const perPage = Math.max(1, Math.floor(track.clientWidth / stepSize) - 1);
    track.scrollBy({ left: dir * stepSize * perPage, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => page(-1));
  next.addEventListener('click', () => page(1));
  track.addEventListener('scroll', update, { passive: true });
  track.addEventListener('keydown', e => {
    if (e.target !== track) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
  });
  new ResizeObserver(update).observe(track);
  update();

  // Mouse drag to scroll; a drag never counts as a click on a reel.
  let drag = null, dragged = false;
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft };
    dragged = false;
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) > 6) {
      dragged = true;
      track.classList.add('dragging');
    }
    if (dragged) track.scrollLeft = drag.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null;
    track.classList.remove('dragging');
    if (dragged) setTimeout(() => { dragged = false; }, 0);
  });
  track.addEventListener('click', e => {
    const card = e.target.closest('.reel');
    if (!card || dragged) return;
    getLightbox().open(items, Number(card.dataset.i));
  });

  // Only play previews that are actually on screen.
  let paused = false;
  const onScreen = new Set();
  const sync = card => {
    const video = card.querySelector('video');
    if (onScreen.has(card) && !paused && !reducedMotion.matches) {
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => card.classList.add('playing')).catch(() => {});
    } else {
      video.pause();
    }
  };
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) onScreen.add(entry.target); else onScreen.delete(entry.target);
    sync(entry.target);
  }), { threshold: .55 });
  cards.forEach(card => io.observe(card));
  document.addEventListener('reels:pause', () => { paused = true; cards.forEach(sync); });
  document.addEventListener('reels:resume', () => { paused = false; cards.forEach(sync); });

  // Auto-advance one reel every `autoplay` ms; the ring and number count down to the next slide.
  if (!autoplay || cards.length < 2) return;
  const timer = mount.querySelector('.reels-timer'), count = timer.querySelector('b');
  let elapsed = 0, last = performance.now(), hold = false, visible = false;
  const advance = () => {
    const max = track.scrollWidth - track.clientWidth;
    const stepSize = cards[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 16);
    const behavior = reducedMotion.matches ? 'auto' : 'smooth';
    if (track.scrollLeft >= max - 2) track.scrollTo({ left: 0, behavior });
    else track.scrollBy({ left: stepSize, behavior });
  };
  const tick = now => {
    const dt = Math.min(now - last, 100);
    last = now;
    if (visible && !hold && !paused && !drag && !document.hidden) {
      elapsed += dt;
      if (elapsed >= autoplay) { elapsed = 0; advance(); }
      timer.style.setProperty('--t', (elapsed / autoplay).toFixed(4));
      count.textContent = Math.max(1, Math.ceil((autoplay - elapsed) / 1000));
    }
    requestAnimationFrame(tick);
  };
  mount.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hold = true; });
  mount.addEventListener('pointerleave', () => { hold = false; });
  track.addEventListener('pointerdown', () => { elapsed = 0; });
  [prev, next].forEach(button => button.addEventListener('click', () => { elapsed = 0; }));
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .3 }).observe(track);
  requestAnimationFrame(tick);
}

/** Scatters reels at random positions, sizes and angles; a new arrangement on every load and on Shuffle. */
export function mountWild(mount, items, shuffleButton) {
  const section = mount?.closest('section');
  if (!mount || !items?.length) { section?.remove(); return; }
  mount.innerHTML = `<div class="wild-field">${items.map((item, i) => `
    <button class="wild-card${item.width > item.height ? ' land' : ''}" type="button" data-i="${i}" style="--i:${i}" data-cursor="play ▶" aria-label="Play reel ${i + 1}">
      <img src="${escapeHtml(mediaUrl(item.poster))}" alt="" loading="lazy" decoding="async" draggable="false">
      <video muted loop playsinline preload="none" data-src="${escapeHtml(mediaUrl(item.preview))}" tabindex="-1" aria-hidden="true"></video>
    </button>`).join('')}</div>`;
  const field = mount.firstElementChild;
  const cards = [...field.children];
  const order = items.map((_, i) => i);

  function scatter(animate) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const before = new Map(cards.map(card => [card, card.getBoundingClientRect()]));
    order.forEach(index => field.append(cards[index]));
    if (!animate || reducedMotion.matches) return;
    cards.forEach(card => {
      const was = before.get(card), now = card.getBoundingClientRect();
      card.animate([{ transform: `translate(${was.left - now.left}px, ${was.top - now.top}px)` }, { transform: 'none' }],
        { duration: 700, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    });
  }
  scatter(false);
  shuffleButton?.addEventListener('click', () => scatter(true));
  new IntersectionObserver((entries, io) => entries.forEach(entry => {
    if (entry.isIntersecting) { field.classList.add('in'); io.disconnect(); }
  }), { threshold: .12 }).observe(field);

  // A few visible cards play at a time, plus whichever one is hovered.
  const visible = new Set(), live = new Set();
  let paused = false, hovered = null;
  const sync = () => cards.forEach(card => {
    const video = card.querySelector('video');
    if (!paused && (live.has(card) || card === hovered)) {
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => card.classList.add('playing')).catch(() => {});
    } else { video.pause(); card.classList.remove('playing'); }
  });
  const pick = () => {
    live.clear();
    const pool = [...visible].sort(() => Math.random() - .5);
    pool.slice(0, reducedMotion.matches ? 0 : 3).forEach(card => live.add(card));
    sync();
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => visible[entry.isIntersecting ? 'add' : 'delete'](entry.target));
    if (!live.size || [...live].some(card => !visible.has(card))) pick();
  }, { threshold: .6 });
  cards.forEach(card => {
    io.observe(card);
    card.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = card; sync(); } });
    card.addEventListener('pointerleave', () => { if (hovered === card) { hovered = null; sync(); } });
    card.addEventListener('click', () => getLightbox().open(items, Number(card.dataset.i)));
  });
  setInterval(() => { if (visible.size && !paused && !document.hidden) pick(); }, 4200);
  document.addEventListener('reels:pause', () => { paused = true; sync(); });
  document.addEventListener('reels:resume', () => { paused = false; sync(); });
}

/** Behind-the-scenes clips from videos/BTS/; labelled empty slots until that folder has videos. */
export function mountBts(mount, items = [], slots = 4) {
  if (!mount) return;
  const count = Math.max(items.length, slots);
  mount.innerHTML = Array.from({ length: count }, (_, i) => {
    const item = items[i];
    const n = String(i + 1).padStart(2, '0');
    return item ? `
      <button class="bts-card" type="button" data-i="${i}" data-cursor="play ▶" aria-label="Play behind-the-scenes clip ${n}" style="--i:${i}">
        <img src="${escapeHtml(mediaUrl(item.poster))}" alt="" loading="lazy" decoding="async" draggable="false">
        <video muted loop playsinline preload="none" data-src="${escapeHtml(mediaUrl(item.preview))}" tabindex="-1" aria-hidden="true"></video>
        <span class="bts-rec"><i></i>BTS ${n}</span>
      </button>` : `
      <div class="bts-card empty" style="--i:${i}">
        <span class="bts-rec"><i></i>BTS ${n}</span>
        <span class="bts-soon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h12v10H3zM15 10l6-3v10l-6-3z"/></svg>Clip coming soon</span>
      </div>`;
  }).join('');
  const cards = [...mount.querySelectorAll('button.bts-card')];
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    const video = entry.target.querySelector('video');
    if (entry.isIntersecting && !reducedMotion.matches) {
      if (!video.src) video.src = video.dataset.src;
      video.play().then(() => entry.target.classList.add('playing')).catch(() => {});
    } else { video.pause(); entry.target.classList.remove('playing'); }
  }), { threshold: .5 });
  cards.forEach(card => {
    io.observe(card);
    card.addEventListener('click', () => getLightbox().open(items, Number(card.dataset.i)));
  });
}

/** Centre reel with one reel behind on each side, all three playing; advances every `interval` ms. */
export function mountCarousel(mount, items, { label = 'Reels', emptyHint = '', interval = 3000 } = {}) {
  if (!items.length) {
    mount.innerHTML = `<div class="reels-empty"><b>Reels coming soon.</b><br>${escapeHtml(emptyHint)}</div>`;
    return;
  }
  const total = items.length;
  mount.innerHTML = `
    <div class="cf">
      <div class="cf-stage" tabindex="0" role="group" aria-roledescription="carousel" aria-label="${escapeHtml(label)}">
        ${items.map((item, i) => `
          <button class="cf-card${item.width > item.height ? ' land' : ''}" type="button" data-i="${i}" aria-label="Play reel ${i + 1}">
            ${item.width > item.height ? `<img class="cf-bg" src="${escapeHtml(mediaUrl(item.poster))}" alt="" loading="lazy" decoding="async" draggable="false" aria-hidden="true">` : ''}
            <img src="${escapeHtml(mediaUrl(item.poster))}" alt="" loading="lazy" decoding="async" draggable="false">
            <video muted loop playsinline preload="none" data-src="${escapeHtml(mediaUrl(item.preview))}" tabindex="-1" aria-hidden="true"></video>
            <span class="reel-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="cf-play">${ICON.play}</span>
          </button>`).join('')}
      </div>
      <div class="cf-ui">
        <button type="button" class="cf-btn cf-prev" aria-label="Previous reel">${ICON.prev}</button>
        <span class="cf-count" aria-live="polite"><b>01</b> / ${String(total).padStart(2, '0')}</span>
        <button type="button" class="cf-btn cf-next" aria-label="Next reel">${ICON.next}</button>
      </div>
    </div>`;

  const stage = mount.querySelector('.cf-stage');
  const cards = [...stage.querySelectorAll('.cf-card')];
  const countNum = mount.querySelector('.cf-count b');
  let active = 0, elapsed = 0, last = performance.now(), visible = false, paused = false;

  const offset = i => {
    let d = (i - active) % total;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };
  const POSE = {
    0: 'translateX(0) translateZ(0) scale(1)',
    1: 'translateX(74%) translateZ(-180px) rotateY(-16deg) scale(.84)',
    '-1': 'translateX(-74%) translateZ(-180px) rotateY(16deg) scale(.84)',
    2: 'translateX(130%) translateZ(-320px) rotateY(-22deg) scale(.66)',
    '-2': 'translateX(-130%) translateZ(-320px) rotateY(22deg) scale(.66)',
  };
  function layout() {
    cards.forEach((card, i) => {
      const d = offset(i), near = Math.abs(d) <= 1;
      card.style.transform = POSE[d] ?? 'translateZ(-400px) scale(.5)';
      card.style.opacity = near ? 1 : 0;
      card.style.zIndex = 3 - Math.min(Math.abs(d), 3);
      card.classList.toggle('center', d === 0);
      card.classList.toggle('side', Math.abs(d) === 1);
      card.tabIndex = near ? 0 : -1;
      card.setAttribute('aria-hidden', near ? 'false' : 'true');
      const video = card.querySelector('video');
      if (near && visible && !paused) {
        if (!video.src) video.src = video.dataset.src;
        video.play().then(() => card.classList.add('playing')).catch(() => {});
      } else video.pause();
    });
    countNum.textContent = String(active + 1).padStart(2, '0');
  }
  const go = step => { active = (active + step + total) % total; elapsed = 0; layout(); };

  mount.querySelector('.cf-prev').addEventListener('click', () => go(-1));
  mount.querySelector('.cf-next').addEventListener('click', () => go(1));
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  let swipe = null, swiped = false;
  stage.addEventListener('pointerdown', e => { swipe = { x: e.clientX, y: e.clientY }; swiped = false; });
  stage.addEventListener('pointerup', e => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - swipe.y)) { swiped = true; go(dx < 0 ? 1 : -1); }
    swipe = null;
  });
  stage.addEventListener('click', e => {
    const card = e.target.closest('.cf-card');
    if (!card || swiped) return;
    const d = offset(Number(card.dataset.i));
    if (d === 0) getLightbox().open(items, active);
    else go(d);
  });
  document.addEventListener('reels:pause', () => { paused = true; layout(); });
  document.addEventListener('reels:resume', () => { paused = false; layout(); });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; layout(); }, { threshold: .25 }).observe(stage);

  const tick = now => {
    const dt = Math.min(now - last, 100);
    last = now;
    if (visible && !paused && !document.hidden && !reducedMotion.matches) {
      elapsed += dt;
      if (elapsed >= interval) go(1);
    }
    requestAnimationFrame(tick);
  };
  layout();
  requestAnimationFrame(tick);
}
