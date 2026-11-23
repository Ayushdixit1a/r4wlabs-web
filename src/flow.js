import { reducedMotion } from './site.js';

// Thin drifting contour lines, echoing the background of the R4W LABS logo.
export function initFlow(canvas, { lines = 26, alpha = .075 } = {}) {
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, raf = 0, running = false;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  function draw(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    const span = height * 1.9;
    const slope = -height * .62 / Math.max(width, 1);
    for (let i = 0; i < lines; i++) {
      const base = (i / lines) * span - height * .1;
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 18) {
        const u = x / Math.max(width, 1);
        const y = base + slope * x
          + Math.sin(u * 5.2 + t * .22 + i * .21) * height * .055
          + Math.sin(u * 2.1 - t * .15 + i * .09) * height * .085;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function loop(now) {
    draw(now);
    raf = running ? requestAnimationFrame(loop) : 0;
  }
  function start() {
    if (running || reducedMotion.matches) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  resize();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
  return { start, stop, resize };
}
