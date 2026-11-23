import { reducedMotion } from './site.js';
import { initFlow } from './flow.js';

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const EASE_IO = 'cubic-bezier(.76,0,.24,1)';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Logo reveal: the letters rise into the stacked R4W / LABS lockup, slide together
 * into the single-line wordmark, then the curtain lifts off the page.
 * Resolves as the page starts to show, so the hero can assemble behind the curtain.
 */
export async function playLoader({ quick = false } = {}) {
  const loader = document.getElementById('loader');
  const curtain = document.getElementById('loaderCurtain');
  const finish = () => {
    loader?.classList.add('done');
    curtain?.classList.add('done');
    document.body.classList.remove('is-loading');
    document.documentElement.classList.add('revealed');
  };
  if (!loader || reducedMotion.matches || !loader.animate) {
    finish();
    return;
  }

  const flow = initFlow(loader.querySelector('canvas'), { alpha: .09 });
  const mark = loader.querySelector('.loader-mark');
  const r4w = loader.querySelector('.lm-r4w');
  const labs = loader.querySelector('.lm-labs');
  const line = loader.querySelector('.lm-line');
  const pct = document.getElementById('loaderPct');
  const bar = document.getElementById('loaderBar');
  const fill = { fill: 'forwards' };

  await Promise.race([document.fonts.load('800 80px Poppins'), wait(1200)]);

  const total = quick ? 900 : 2500;
  const started = performance.now();
  (function count(now) {
    const p = Math.min(1, (now - started) / total);
    const eased = 1 - Math.pow(1 - p, 2.2);
    pct.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    bar.style.transform = `scaleX(${eased})`;
    if (p < 1) requestAnimationFrame(count);
  })(started);

  const rise = (word, delay) => [...word.children].forEach((ch, i) =>
    ch.animate([{ transform: 'translateY(115%)' }, { transform: 'none' }],
      { duration: 800, delay: delay + i * 70, easing: EASE, ...fill }));

  if (quick) {
    rise(r4w, 0);
    rise(labs, 120);
    await wait(total);
  } else {
    // Stack the two words like the original logo: left edges aligned, LABS under R4W.
    const w1 = r4w.offsetWidth, w2 = labs.offsetWidth;
    const gap = labs.offsetLeft - r4w.offsetLeft - w1;
    const rowWidth = w1 + gap + w2;
    const left = (rowWidth - Math.max(w1, w2)) / 2;
    const drop = parseFloat(getComputedStyle(mark).fontSize) * .43;
    const stackedR = `translate(${left}px, ${-drop}px)`;
    const stackedL = `translate(${left - (w1 + gap)}px, ${drop}px)`;
    r4w.style.transform = stackedR;
    labs.style.transform = stackedL;

    rise(r4w, 100);
    rise(labs, 380);
    await wait(1380);

    const join = { duration: 820, easing: EASE_IO, ...fill };
    r4w.animate([{ transform: stackedR }, { transform: 'none' }], join);
    labs.animate([{ transform: stackedL }, { transform: 'none' }], join);
    mark.animate([{ transform: 'scale(1)' }, { transform: 'scale(.94)', offset: .5 }, { transform: 'scale(1)' }], join);
    await wait(700);
    line.animate([
      { transform: 'scaleX(0)', transformOrigin: 'left' },
      { transform: 'scaleX(1)', transformOrigin: 'left', offset: .55 },
      { transform: 'scaleX(1)', transformOrigin: 'right', offset: .56 },
      { transform: 'scaleX(0)', transformOrigin: 'right' },
    ], { duration: 760, easing: EASE_IO, ...fill });
    await wait(Math.max(0, total - (performance.now() - started)));
  }

  // Lift the black panel, with a red curtain trailing just behind it.
  const exit = { duration: 950, easing: EASE_IO, ...fill };
  mark.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-70px)', opacity: 0 }], { ...exit, duration: 600 });
  loader.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], exit);
  curtain.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { ...exit, delay: 130 });
  document.body.classList.remove('is-loading');
  document.documentElement.classList.add('revealed');
  setTimeout(() => {
    flow.stop();
    finish();
  }, 1150);
  await wait(260);
}
