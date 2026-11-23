import { initCommon } from './common.js';
import { playLoader } from './loader.js';
import { loadReels, mountReels, mountCarousel, mountWild, escapeHtml } from './reels.js';

initCommon();
playLoader({ quick: true });

async function showReels() {
  const reels = await loadReels();
  mountWild(document.getElementById('wildReels'), reels.wild, document.getElementById('wildShuffle'));
  const total = new Set([...reels.top, ...reels.industries.flatMap(i => i.items)].map(item => item.src)).size;
  document.getElementById('reelCount').textContent = total;
  document.getElementById('industryCount').textContent = reels.industries.length;

  mountCarousel(document.getElementById('topReels'), reels.top, {
    label: 'Top reels',
    interval: 3000,
    emptyHint: 'Add videos to the videos/Top folder and run “npm run videos”.',
  });
  if (reels.sample) {
    document.getElementById('topReels').insertAdjacentHTML('beforeend',
      '<p class="sample-note">Sample clips for layout only. They are replaced as soon as real videos are added.</p>');
  }

  const chips = document.getElementById('industryChips');
  const rows = document.getElementById('industryRows');
  chips.innerHTML = `<a href="#top">Top<small>${reels.top.length}</small></a>` + reels.industries.map(industry =>
    `<a href="#${escapeHtml(industry.slug)}">${escapeHtml(industry.name)}<small>${industry.items.length}</small></a>`).join('');
  rows.innerHTML = reels.industries.map(industry => `
    <section class="ind-row" id="${escapeHtml(industry.slug)}">
      <div class="wrap sec-head"><h2>${escapeHtml(industry.name)}<sup>${String(industry.items.length).padStart(2, '0')}</sup></h2></div>
      <div class="reels-mount"></div>
    </section>`).join('');
  reels.industries.forEach(industry => {
    mountReels(document.querySelector(`#${CSS.escape(industry.slug)} .reels-mount`), industry.items, {
      label: `${industry.name} reels`,
      emptyHint: `Add videos to the videos/${industry.folder} folder and run “npm run videos”.`,
    });
  });

  // Highlight the chip for the row currently on screen.
  const links = [...chips.querySelectorAll('a')];
  const spy = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    links.forEach(a => a.classList.toggle('active', a.hash === `#${entry.target.id}`));
  }), { rootMargin: '-35% 0px -55% 0px' });
  document.querySelectorAll('.vtop, .ind-row').forEach(section => spy.observe(section));

  // The rows are rendered after load, so honour a #industry link from the home page here.
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}
showReels();
