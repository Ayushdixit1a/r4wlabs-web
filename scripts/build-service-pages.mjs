import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const services = JSON.parse(fs.readFileSync(path.join(root, 'src/data/services.json'), 'utf8'));

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function checklist(points) {
  return points.map(point => `
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              <span>${escapeHtml(point)}</span>
            </li>`).join('');
}

function whyCards(items) {
  return items.map((item, index) => `
          <article class="svc-why-card reveal" style="--i:${index}">
            <span class="svc-why-number">${String(index + 1).padStart(2, '0')}</span>
            <h3>${escapeHtml(item.t)}</h3>
            <p>${escapeHtml(item.d)}</p>
          </article>`).join('');
}

function timeline(steps) {
  return steps.map((step, index) => `
          <li class="svc-step">
            <span class="svc-step-number">${String(index + 1).padStart(2, '0')}</span>
            <div><h3>${escapeHtml(step.t)}</h3><p>${escapeHtml(step.d)}</p></div>
          </li>`).join('');
}

function funnelVisual() {
  const stages = ['People nearby', 'Saw your ad', 'Clicked', 'Became customers'];
  const widths = [100, 78, 56, 36];
  return `<div class="svc-funnel">${stages.map((stage, index) => `
      <div class="svc-funnel-stage" style="--i:${index};--w:${widths[index]}%"><span>${stage}</span></div>`).join('')}
    </div>`;
}

function calendarVisual() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const posts = [
    ['Reel', 'Story'], ['Post'], ['Reel', 'Post'], ['Story'], ['Reel'], ['Post', 'Story'], ['Reel'],
  ];
  let order = 0;
  const week = days.map((day, index) => `
      <div class="svc-calendar-day">
        <span class="svc-calendar-label">${day}</span>
        ${posts[index].map(post => `<span class="svc-post-chip" style="--i:${order++}">${post}</span>`).join('')}
      </div>`).join('');
  return `<div class="svc-calendar-visual">
      <div class="svc-calendar">${week}</div>
      <div class="svc-phone-feed" aria-hidden="true">
        <div class="svc-phone-top"><i></i><i></i><i></i></div>
        <div class="svc-phone-post"><i></i><b></b><span></span><span></span></div>
        <div class="svc-phone-post"><i></i><b></b><span></span><span></span></div>
      </div>
    </div>`;
}

function browserVisual() {
  return `<div class="svc-browser-visual">
      <div class="svc-browser-window" aria-hidden="true">
        <div class="svc-browser-bar"><i></i><i></i><i></i><span></span></div>
        <div class="svc-browser-content">
          <div class="svc-browser-nav"><b></b><span></span><span></span><span></span></div>
          <div class="svc-browser-hero"><i></i><b></b><b></b><span></span><span></span><em></em></div>
          <div class="svc-browser-blocks"><i></i><i></i><i></i></div>
        </div>
      </div>
      <div class="svc-browser-phone" aria-hidden="true">
        <div class="svc-phone-top"><i></i><i></i><i></i></div>
        <div class="svc-phone-post"><i></i><b></b><span></span><span></span></div>
        <div class="svc-phone-post"><i></i><b></b><span></span><span></span></div>
      </div>
      <div class="svc-load-meter"><span>Load time</span><i><b></b></i><strong>Fast</strong></div>
    </div>`;
}

function networkVisual() {
  const nodes = Array.from({ length: 6 }, (_, index) =>
    `<span class="svc-network-creator" style="--i:${index}" aria-hidden="true"></span>`).join('');
  return `<div class="svc-network" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"><path pathLength="1" d="M50 50 50 8M50 50 86 28M50 50 86 72M50 50 50 92M50 50 14 72M50 50 14 28"/></svg>
      ${nodes}
      <span class="svc-network-brand">✦</span>
      <span class="svc-network-reaction svc-network-heart">♥</span>
      <span class="svc-network-reaction svc-network-play">▶</span>
    </div>`;
}

function chartVisual() {
  const before = [38, 50, 46, 68, 76, 88];
  const after = [48, 70, 86, 112, 132, 156];
  const bars = before.map((height, index) => {
    const x = 58 + index * 82;
    return `<rect class="svc-chart-before" style="--i:${index}" x="${x}" y="${216 - height}" width="20" height="${height}" rx="4"/>
      <rect class="svc-chart-after" style="--i:${index}" x="${x + 25}" y="${216 - after[index]}" width="20" height="${after[index]}" rx="4"/>`;
  }).join('');
  const labels = before.map((_, index) =>
    `<text x="${71 + index * 82}" y="246">Month ${index + 1}</text>`).join('');
  return `<div class="svc-chart-visual">
      <span class="svc-chart-note">Illustrative</span>
      <svg class="svc-chart" viewBox="0 0 600 270" role="img" aria-label="Illustrative Before and After chart across Month 1 to Month 6">
        <g class="svc-chart-grid"><path d="M42 56H560M42 108H560M42 160H560M42 216H560"/></g>
        <g class="svc-chart-bars">${bars}</g>
        <path class="svc-chart-line" pathLength="1" d="M70 168 152 145 234 128 316 104 398 82 480 52"/>
        <g class="svc-chart-months">${labels}</g>
      </svg>
      <div class="svc-chart-legend"><span><i></i>Before</span><span><i></i>After</span></div>
    </div>`;
}

function visualMarkup(service) {
  if (service.visual === 'reels') {
    return `<div class="svc-reel-fan" data-reel-fan></div>
      <a class="svc-visual-link" href="/video-editing/">See all reels <span aria-hidden="true">→</span></a>`;
  }
  const visuals = {
    funnel: funnelVisual,
    calendar: calendarVisual,
    browser: browserVisual,
    network: networkVisual,
    chart: chartVisual,
  };
  return visuals[service.visual]?.() ?? '';
}

function heroMedia(service) {
  if (!service.video) {
    return `<div class="svc-hero-icon-wrap">
        <img class="svc-hero-icon" src="${escapeHtml(service.icon)}" alt="" fetchpriority="high">
      </div>`;
  }

  return `<div class="svc-hero-video-wrap">
      <div class="svc-hero-video-frame is-paused" data-service-video-frame>
        <video class="svc-hero-video" data-service-video src="${escapeHtml(service.video)}" autoplay muted loop playsinline preload="metadata" poster="${escapeHtml(service.poster ?? '')}" tabindex="0" aria-label="${escapeHtml(service.name)} explainer video"></video>
        <button class="svc-hero-video-play" type="button" data-service-video-play aria-label="Play video">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="svc-hero-video-sound" type="button" data-service-video-sound aria-label="Turn sound on" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true" data-muted-icon><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>
          <svg viewBox="0 0 24 24" aria-hidden="true" data-sound-icon><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6m3-10a10 10 0 0 1 0 14"/></svg>
        </button>
      </div>
      <img class="svc-hero-video-icon" src="${escapeHtml(service.icon)}" alt="" fetchpriority="high">
    </div>`;
}

function page(service) {
  const isReels = service.visual === 'reels';
  const moreServices = services.filter(other => other.slug !== service.slug).map(other => `
        <a class="svc-more-card" href="/services/${escapeHtml(other.slug)}/">
          <img src="${escapeHtml(other.icon)}" alt="" loading="lazy" decoding="async">
          <span>${escapeHtml(other.name)}</span><b aria-hidden="true">↗</b>
        </a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#050506">
  <title>${escapeHtml(service.name)} | R4W LABS</title>
  <meta name="description" content="${escapeHtml(service.intro)}">
  <meta property="og:title" content="${escapeHtml(service.name)} | R4W LABS">
  <meta property="og:description" content="${escapeHtml(service.intro)}">
  <meta property="og:image" content="/brand/r4w-labs-og.png">
  <link rel="icon" type="image/png" href="/brand/favicon.png">
  <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png">
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body class="page-service is-loading">
<!-- @include loader -->
<!-- @include header -->

<main id="main">
  <section class="svc-hero">
    <div class="wrap svc-hero-inner">
      <div class="svc-hero-copy">
        <a class="back" href="/#services">← All services</a>
        <p class="eyebrow">${escapeHtml(service.name)}</p>
        <h1>${escapeHtml(service.headline[0])}<br><em>${escapeHtml(service.headline[1])}</em></h1>
        <p class="vhero-sub">${escapeHtml(service.intro)}</p>
        <div class="svc-hero-actions">
          <a class="btn btn-red" data-wa href="/#contact">Talk to us <span aria-hidden="true">→</span></a>
          <a class="btn btn-ghost" href="#how">How we do it ↓</a>
        </div>
      </div>
      ${heroMedia(service)}
    </div>
  </section>

  <section class="sec svc-overview" id="what">
    <div class="wrap svc-overview-grid">
      <div class="svc-what-panel svc-frosted reveal">
        <p class="eyebrow">01 · What it is</p>
        <h2>${escapeHtml(service.what.lead)}</h2>
        <ul class="svc-checklist" role="list">${checklist(service.what.points)}
        </ul>
      </div>
      <div class="svc-visual svc-frosted" data-visual="${escapeHtml(service.visual)}"${isReels ? ` data-reel-source="${escapeHtml(service.reelSource ?? 'top')}"` : ''}>
        ${visualMarkup(service)}
      </div>
    </div>
  </section>

  <section class="sec svc-why">
    <div class="wrap">
      <div class="svc-section-head reveal">
        <p class="eyebrow">02 · Why you need it</p>
        <h2>Why your business needs it</h2>
      </div>
      <div class="svc-why-grid">${whyCards(service.why)}
      </div>
    </div>
  </section>

  <section class="sec svc-how reveal" id="how">
    <div class="wrap">
      <div class="svc-section-head">
        <p class="eyebrow">03 · How we do it</p>
        <h2>How we do it</h2>
      </div>
      <ol class="svc-timeline" role="list">${timeline(service.how)}
      </ol>
    </div>
  </section>

  <section class="sec svc-proof-band">
    <div class="wrap">
      <div class="svc-proof-panel svc-frosted reveal">
        <strong>${escapeHtml(service.proof.value)}</strong>
        <p>${escapeHtml(service.proof.label)}</p>
      </div>
    </div>
  </section>

  <section class="sec svc-more">
    <div class="wrap">
      <div class="svc-section-head reveal">
        <h2>More services</h2>
      </div>
      <nav class="svc-more-track" aria-label="More services">${moreServices}
      </nav>
    </div>
  </section>

  <section class="sec svc-cta">
    <div class="wrap svc-cta-panel svc-frosted reveal">
      <div><h2>Ready to grow?</h2><p>Tell us about your business and we'll reply on WhatsApp.</p></div>
      <a class="btn btn-red" data-wa href="/#contact">Start a project <span aria-hidden="true">→</span></a>
    </div>
  </section>
</main>

<!-- @include footer -->
<script type="module" src="/src/service.js"></script>
</body>
</html>
`;
}

for (const service of services) {
  const directory = path.join(root, 'services', service.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), page(service));
}
