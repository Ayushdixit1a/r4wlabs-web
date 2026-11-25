import { initCommon } from './common.js';
import { playLoader } from './loader.js';
import { loadReels, mediaUrl, escapeHtml } from './reels.js';
import { reducedMotion } from './site.js';

const { watchReveal } = initCommon();
playLoader({ quick: true });
watchReveal(document);

const previewObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const video = entry.target;
    if (!entry.isIntersecting || reducedMotion.matches) {
      video.pause();
      return;
    }
    if (!video.src) video.src = video.dataset.src;
    video.play().catch(() => {});
  });
}, { threshold: .35 });

function playHeroVideo(video) {
  video.play().catch(() => video.closest('[data-service-video-frame]')?.classList.add('is-paused'));
}

function mountHeroVideos() {
  const videos = document.querySelectorAll('[data-service-video]');
  if (!videos.length) return;

  const heroVideoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (!entry.isIntersecting || reducedMotion.matches) {
        video.pause();
        return;
      }
      playHeroVideo(video);
    });
  }, { threshold: .25 });

  videos.forEach(video => {
    const frame = video.closest('[data-service-video-frame]');
    const playButton = frame.querySelector('[data-service-video-play]');
    const soundButton = frame.querySelector('[data-service-video-sound]');

    const updatePlaybackState = () => {
      frame.classList.toggle('is-paused', video.paused);
      frame.classList.toggle('is-playing', !video.paused);
      playButton.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    };

    const togglePlayback = () => {
      if (video.paused) playHeroVideo(video);
      else video.pause();
    };

    video.addEventListener('play', updatePlaybackState);
    video.addEventListener('pause', updatePlaybackState);
    video.addEventListener('click', togglePlayback);
    video.addEventListener('keydown', event => {
      if (event.key !== ' ' && event.key !== 'Enter') return;
      event.preventDefault();
      togglePlayback();
    });
    playButton.addEventListener('click', togglePlayback);
    soundButton.addEventListener('click', () => {
      video.muted = !video.muted;
      soundButton.classList.toggle('is-unmuted', !video.muted);
      soundButton.setAttribute('aria-pressed', String(!video.muted));
      soundButton.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
    });

    if (reducedMotion.matches) {
      video.removeAttribute('autoplay');
      frame.classList.add('is-reduced-motion');
      video.pause();
    }

    heroVideoObserver.observe(video);

    const onMotionChange = event => {
      frame.classList.toggle('is-reduced-motion', event.matches);
      if (event.matches) {
        video.removeAttribute('autoplay');
        video.pause();
        return;
      }
      video.setAttribute('autoplay', '');
      const rect = video.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth) {
        playHeroVideo(video);
      }
    };

    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', onMotionChange);
    else reducedMotion.addListener(onMotionChange);
  });
}

async function mountReelFan() {
  const visual = document.querySelector('[data-visual="reels"]');
  const fan = visual?.querySelector('[data-reel-fan]');
  if (!fan) return;

  const reels = await loadReels();
  const items = visual.dataset.reelSource === 'all'
    ? reels.industries.filter(industry => industry.items?.length).map(industry => industry.items[0]).slice(0, 3)
    : reels.top.slice(0, 3);

  fan.innerHTML = items.map((item, index) => {
    const offset = (index - (items.length - 1) / 2) * 34;
    const rotation = (index - (items.length - 1) / 2) * 8;
    return `<a class="svc-reel-card" href="/video-editing/" aria-label="See reels on the Video Editing page" style="--i:${index};--offset:${offset}px;--rotation:${rotation}deg">
      <img src="${escapeHtml(mediaUrl(item.poster))}" alt="" loading="lazy" decoding="async">
      <video muted loop playsinline preload="none" data-src="${escapeHtml(mediaUrl(item.preview))}" tabindex="-1" aria-hidden="true"></video>
      ${item.sample ? '<span class="svc-reel-sample">SAMPLE</span>' : ''}
      <span class="svc-reel-play" aria-hidden="true">▶</span>
    </a>`;
  }).join('');

  fan.querySelectorAll('video[data-src]').forEach(video => {
    const card = video.closest('.svc-reel-card');
    video.addEventListener('playing', () => card.classList.add('is-playing'));
    video.addEventListener('pause', () => card.classList.remove('is-playing'));
    previewObserver.observe(video);
  });
}

mountHeroVideos();
mountReelFan();

const animatedVisuals = document.querySelectorAll('.svc-visual');
if ('IntersectionObserver' in window) {
  const visualObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      visualObserver.unobserve(entry.target);
    });
  }, { threshold: .16 });
  animatedVisuals.forEach(visual => visualObserver.observe(visual));
} else {
  animatedVisuals.forEach(visual => visual.classList.add('in'));
}
