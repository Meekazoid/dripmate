// brew-wave.js
// Organic water fill for the pour-over step bars.
// The surface is a sum of non-harmonic sines (different wavelengths + speeds),
// so the crests drift and never repeat. The bar element keeps its width-% role
// as the reveal clip; the canvas is always FULL TRACK WIDTH so the surface
// never gets squished as the bar fills.

const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let waves = [];
let rafId = null;
let resizeObs = null;

function rand(a, b) { return a + Math.random() * (b - a); }

function makeComps() {
  return {
    front: [
      { len: rand(120, 150), amp: 4.6, speed: rand(1.3, 1.8),   phase: rand(0, 6.28) },
      { len: rand(64, 80),   amp: 2.7, speed: rand(-2.6, -2.0), phase: rand(0, 6.28) },
      { len: rand(33, 44),   amp: 1.5, speed: rand(2.7, 3.4),   phase: rand(0, 6.28) }
    ],
    back: [
      { len: rand(150, 185), amp: 3.3, speed: rand(0.8, 1.2),   phase: rand(0, 6.28) },
      { len: rand(48, 60),   amp: 1.9, speed: rand(-1.6, -1.1), phase: rand(0, 6.28) }
    ]
  };
}

function sizeWave(o) {
  const track = o.bar.parentElement;
  const w = track.clientWidth, h = track.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  o.canvas.width = Math.round(w * dpr);
  o.canvas.height = Math.round(h * dpr);
  o.canvas.style.width = w + 'px';
  o.canvas.style.height = h + 'px';
  o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  o.w = w; o.h = h;
}

function fillLayer(ctx, w, h, baseline, comps, t, calm, grad, alpha) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  let first = true;
  for (let x = 0; x <= w; x += 2) {
    let y = baseline;
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      y += c.amp * calm * Math.sin((6.2832 / c.len) * x + c.speed * calm * t + c.phase);
    }
    if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.globalAlpha = 1;
}

function drawWave(o, t) {
  const ctx = o.ctx, w = o.w, h = o.h;
  if (!w) return;
  ctx.clearRect(0, 0, w, h);

  const pct = parseFloat(o.bar.style.width) || 0;
  if (pct <= 0) return;
  const calm = pct >= 99.5 ? 0.4 : 1;

  const gBack = ctx.createLinearGradient(0, 0, 0, h);
  gBack.addColorStop(0, '#1492c4');
  gBack.addColorStop(1, '#0a6f9e');
  fillLayer(ctx, w, h, h * 0.56, o.comps.back, t, calm, gBack, 0.55);

  const gFront = ctx.createLinearGradient(0, 0, 0, h);
  gFront.addColorStop(0, '#22cabf');
  gFront.addColorStop(1, '#0a86b5');
  fillLayer(ctx, w, h, h * 0.5, o.comps.front, t, calm, gFront, 0.95);
}

function loop(ts) {
  const t = ts / 1000;
  for (let i = 0; i < waves.length; i++) drawWave(waves[i], t);
  rafId = requestAnimationFrame(loop);
}

function drawStatic() {
  for (let i = 0; i < waves.length; i++) drawWave(waves[i], 0);
}

// Idempotent: scans bars, attaches body + canvas if missing, (re)starts the loop.
// Selector targets .step-progress-bar — the % -width clip element whose
// parentElement is .step-progress (the full-width track).
export function initBrewWaves(root) {
  root = root || document;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  waves = [];

  if (resizeObs) {
    resizeObs.disconnect();
  } else {
    resizeObs = new ResizeObserver(function (entries) {
      for (const e of entries) {
        const o = waves.find(function (w) { return w.bar.parentElement === e.target; });
        if (o) {
          sizeWave(o);
          if (PREFERS_REDUCED) drawWave(o, 0);
        }
      }
    });
  }

  const bars = root.querySelectorAll('.step-progress-bar');
  bars.forEach(function (bar) {
    let body = bar.querySelector('.dm-wave-body');
    let canvas = bar.querySelector('.dm-wave-canvas');
    if (!body) {
      body = document.createElement('div');
      body.className = 'dm-wave-body';
      bar.appendChild(body);
    }
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'dm-wave-canvas';
      bar.appendChild(canvas);
    }
    const o = { bar: bar, canvas: canvas, ctx: canvas.getContext('2d'), comps: makeComps(), w: 0, h: 0 };
    sizeWave(o);
    waves.push(o);
    resizeObs.observe(bar.parentElement);
  });

  if (PREFERS_REDUCED) { drawStatic(); }
  else if (waves.length > 0) { rafId = requestAnimationFrame(loop); }
}
