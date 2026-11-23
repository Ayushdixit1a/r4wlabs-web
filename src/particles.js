import { reducedMotion, clamp } from './site.js';

const RED = '#e4022f';
const WHITE = '#f5f5f4';
const FONT = 'Poppins';

/**
 * Interactive "R4W LABS" made of square dots. The pointer (or a finger) pushes the dots
 * out of the way and they spring back; a tap sends a shockwave through the word.
 */
export function initParticleWord(canvas) {
  const ctx = canvas.getContext('2d');
  const host = canvas.parentElement;
  let W = 0, H = 0, step = 5, radius = 80;
  let home = [], pos = [], vel = [], color = [];
  let count = 0, running = false, visible = true, released = false, raf = 0;
  const pointer = { x: -9999, y: -9999, on: false, last: -1e9 };
  const ghost = { x: -9999, y: -9999, on: false, start: 0, next: Infinity };

  function build() {
    const cssW = Math.round(host.clientWidth);
    if (!cssW) return;
    const probe = document.createElement('canvas').getContext('2d');
    const probeSize = 200;
    probe.font = `800 ${probeSize}px ${FONT}`;
    const tracking = -.035;
    const measure = text => probe.measureText(text).width + tracking * probeSize * (text.length - 1);
    const w1 = measure('R4W'), w2 = measure('LABS'), gap = probeSize * .26;
    const target = Math.min(cssW * (cssW < 720 ? .93 : .88), 1320);
    const size = probeSize * target / (w1 + gap + w2);

    step = clamp(Math.round(cssW / 250), 3, 6);
    radius = clamp(size * .42, 34, 104);
    const pad = Math.round(radius * .75);
    W = cssW;
    H = Math.round(size * .74 + pad * 2);

    // Integer raster so sampling strides never drift at fractional widths.
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.height = `${H}px`;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);

    const raster = document.createElement('canvas');
    raster.width = W;
    raster.height = H;
    const r = raster.getContext('2d', { willReadFrequently: true });
    r.font = `800 ${size}px ${FONT}`;
    r.textBaseline = 'alphabetic';
    const baseline = pad + size * .715;
    let x = (W - target) / 2;
    const paint = (text, fill) => {
      r.fillStyle = fill;
      for (const ch of text) {
        r.fillText(ch, x, baseline);
        x += r.measureText(ch).width + tracking * size;
      }
      x -= tracking * size;
    };
    paint('R4W', '#ff0000');
    x += gap * size / probeSize;
    paint('LABS', '#0000ff');

    const data = r.getImageData(0, 0, W, H).data;
    const hx = [], hy = [], col = [];
    const half = Math.floor(step / 2);
    for (let y = half; y < H; y += step) {
      for (let px = half; px < W; px += step) {
        const i = (y * W + px) * 4;
        if (data[i + 3] > 110) {
          hx.push(px);
          hy.push(y);
          col.push(data[i] > data[i + 2] ? 0 : 1);
        }
      }
    }
    count = hx.length;
    home = new Float32Array(count * 2);
    pos = new Float32Array(count * 2);
    vel = new Float32Array(count * 2);
    color = Uint8Array.from(col);
    for (let i = 0; i < count; i++) {
      home[i * 2] = hx[i];
      home[i * 2 + 1] = hy[i];
      if (released || reducedMotion.matches) {
        pos[i * 2] = hx[i];
        pos[i * 2 + 1] = hy[i];
      } else {
        scatter(i);
      }
    }
    draw();
  }

  // Start position for the assemble-in: flung out in a wide burst around the word.
  function scatter(i) {
    const angle = Math.random() * Math.PI * 2;
    const dist = (.35 + Math.random() * .9) * Math.max(W * .5, 320);
    pos[i * 2] = W / 2 + Math.cos(angle) * dist;
    pos[i * 2 + 1] = H / 2 + Math.sin(angle) * dist * .6;
  }

  function push(cx, cy, r, strength) {
    const r2 = r * r;
    for (let i = 0; i < count; i++) {
      const dx = pos[i * 2] - cx, dy = pos[i * 2 + 1] - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r2) continue;
      const d = Math.sqrt(d2) || 1;
      const f = (1 - d / r) * strength;
      vel[i * 2] += dx / d * f;
      vel[i * 2 + 1] += dy / d * f;
    }
  }

  function tick(now) {
    if (pointer.on) push(pointer.x, pointer.y, radius, 7);

    // With no one touching it, a ghost pointer sweeps across now and then to show it's alive.
    if (!pointer.on && now - pointer.last > 3500 && now > ghost.next && !ghost.on) {
      ghost.on = true;
      ghost.start = now;
    }
    if (ghost.on) {
      const p = (now - ghost.start) / 2100;
      if (p >= 1 || pointer.on) {
        ghost.on = false;
        ghost.next = now + 9000;
      } else {
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        ghost.x = W * (.06 + e * .88);
        ghost.y = H / 2 + Math.sin(p * Math.PI * 2) * H * .16;
        push(ghost.x, ghost.y, radius * .72, 6);
      }
    }

    let energy = 0;
    for (let i = 0; i < count * 2; i++) {
      vel[i] += (home[i] - pos[i]) * .034;
      vel[i] *= .83;
      pos[i] += vel[i];
      energy += Math.abs(vel[i]);
    }
    return energy;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const s = step - (step <= 3 ? .6 : 1), o = s / 2;
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = c ? WHITE : RED;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        if (color[i] === c) ctx.rect(pos[i * 2] - o, pos[i * 2 + 1] - o, s, s);
      }
      ctx.fill();
    }
  }

  function loop(now) {
    raf = 0;
    if (!running || !visible) return;
    const energy = tick(now);
    draw();
    // Sleep once everything has settled and nothing is pushing; wake on the next input.
    const idle = energy < .5 && !pointer.on && !ghost.on && now < ghost.next;
    if (idle) setTimeout(wake, Math.max(60, Math.min(ghost.next - now, 4000)));
    else raf = requestAnimationFrame(loop);
  }
  function wake() {
    if (running && visible && !raf) raf = requestAnimationFrame(loop);
  }

  function local(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) * (W / rect.width);
    pointer.y = (e.clientY - rect.top) * (H / rect.height);
  }
  function onMove(e) {
    local(e);
    const inside = pointer.x > -radius && pointer.x < W + radius && pointer.y > -radius && pointer.y < H + radius;
    pointer.on = inside && (e.pointerType !== 'touch' || e.buttons > 0 || e.type === 'pointerdown');
    if (pointer.on) pointer.last = performance.now();
    wake();
  }
  function onDown(e) {
    onMove(e);
    push(pointer.x, pointer.y, radius * 2.6, 46);
    wake();
  }
  function onUp(e) {
    if (e.pointerType === 'touch') pointer.on = false;
  }

  if (!reducedMotion.matches) {
    addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onDown, { passive: true });
    addEventListener('pointerup', onUp, { passive: true });
    addEventListener('pointercancel', onUp, { passive: true });
    document.addEventListener('pointerleave', () => { pointer.on = false; });
  }

  let lastWidth = 0, resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.round(host.clientWidth) === lastWidth) return;
      lastWidth = Math.round(host.clientWidth);
      build();
      wake();
    }, 120);
  });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }).observe(canvas);

  const ready = document.fonts.load(`800 100px ${FONT}`).catch(() => {}).then(() => {
    lastWidth = Math.round(host.clientWidth);
    build();
  });

  return {
    ready,
    /** Let the scattered dots fly into place. */
    release() {
      released = true;
      if (reducedMotion.matches) return;
      running = true;
      ghost.next = performance.now() + 2600;
      wake();
    },
  };
}
