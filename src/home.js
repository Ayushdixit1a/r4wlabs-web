import { initCommon } from './common.js';
import { playLoader } from './loader.js';
import { initParticleWord } from './particles.js';
import { loadReels, mountReels, mountCarousel, openLightbox } from './reels.js';
import { whatsappLink, reducedMotion, finePointer } from './site.js';

const { watchReveal } = initCommon();

const canvas = document.getElementById('heroWord');
let word;
try {
  word = initParticleWord(canvas);
} catch {
  document.documentElement.classList.add('no-particles');
}
Promise.all([playLoader(), word?.ready]).then(() => word?.release());

// Count the numbers up the first time the stats come into view.
const stats = document.querySelector('.about-stats');
if (stats && !reducedMotion.matches) {
  new IntersectionObserver(([entry], io) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    stats.querySelectorAll('[data-count]').forEach(el => {
      const target = Number(el.dataset.count), started = performance.now();
      (function frame(now) {
        const p = Math.min(1, (now - started) / 1400);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(frame);
      })(started);
    });
  }, { threshold: .4 }).observe(stats);
}

// The form writes the WhatsApp message for the visitor; nothing is stored on a server.
const form = document.getElementById('briefForm');
const note = document.getElementById('formNote');
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.checkValidity()) {
    note.textContent = 'Please fill in every field so we know who we’re talking to.';
    note.classList.add('err');
    form.querySelector(':invalid')?.focus();
    return;
  }
  note.classList.remove('err');
  const v = Object.fromEntries(new FormData(form));
  const message = `Hi R4W LABS! I’m ${v.name.trim()} from ${v.business.trim()} (${v.type}).\n\n${v.idea.trim()}`;
  window.open(whatsappLink(message), '_blank', 'noopener');
  note.textContent = 'WhatsApp is opening with your message. Press send there and we’ll reply soon.';
});

async function showReels() {
  const reels = await loadReels();
  mountCarousel(document.getElementById('topReels'), reels.top, {
    label: 'Top reels',
    interval: 3000,
    emptyHint: 'Add videos to the videos/Top folder and run “npm run videos”.',
  });
  if (reels.sample) {
    document.getElementById('topReels').insertAdjacentHTML('beforeend',
      '<p class="sample-note">Sample clips for layout only. They are replaced as soon as real videos are added.</p>');
  }
  watchReveal(document);
}
showReels();

const SPARK_COLORS = ['#E4022F', '#FFD43B', '#ffffff', '#3EE6C1', '#8B5CF6'];
document.querySelectorAll('.svc-box').forEach(card => {
  const img = card.querySelector('img');
  function play(event) {
    if (reducedMotion.matches) return;
    card.classList.remove('play');
    void card.offsetWidth;
    card.classList.add('play');
    const rect = card.getBoundingClientRect();
    const x = event?.clientX ? event.clientX - rect.left : rect.width * .7;
    const y = event?.clientY ? event.clientY - rect.top : rect.height * .4;
    for (let n = 0; n < 12; n++) {
      const spark = document.createElement('i');
      spark.className = 'svc-spark';
      const angle = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 80;
      spark.style.setProperty('--c', SPARK_COLORS[n % SPARK_COLORS.length]);
      spark.style.setProperty('--s', `${8 + Math.random() * 12}px`);
      card.append(spark);
      spark.animate([
        { transform: `translate(${x}px, ${y}px) scale(0) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x + Math.cos(angle) * dist}px, ${y + Math.sin(angle) * dist}px) scale(1) rotate(180deg)`, opacity: 1, offset: .6 },
        { transform: `translate(${x + Math.cos(angle) * dist * 1.2}px, ${y + Math.sin(angle) * dist * 1.2 + 20}px) scale(0) rotate(260deg)`, opacity: 0 },
      ], { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => spark.remove();
    }
  }
  img.addEventListener('animationend', event => { if (event.animationName === 'svc-dance') card.classList.remove('play'); });
  card.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && !card.classList.contains('play')) play(event); });
  card.addEventListener('pointerdown', play);
  card.addEventListener('keydown', event => { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); play(); } });
});

document.querySelectorAll('.svc-play').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const key = button.dataset.explainer;
    openLightbox([{ src: `explainers/${key}.mp4`, poster: `explainers/${key}.jpg`, width: 720, height: 1280 }]);
  });
});

if (finePointer.matches) {
  const about = document.querySelector('.about'), cross = document.querySelector('.about-cross');
  about?.addEventListener('pointermove', event => {
    const rect = about.getBoundingClientRect();
    cross.style.setProperty('--cx', `${((event.clientX - rect.left) / rect.width - .5) * 40}px`);
    cross.style.setProperty('--cy', `${((event.clientY - rect.top) / rect.height - .5) * 40}px`);
  }, { passive: true });
}
