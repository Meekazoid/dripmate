// brew-wave.js
// Organic water fill for the pour-over step bars.
// The surface is a sum of non-harmonic sines (different wavelengths + speeds),
// so the crests drift and never repeat. The bar element keeps its width-% role
// as the reveal clip; the canvas is always FULL TRACK WIDTH so the surface
// never gets squished as the bar fills.

const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SPEED = 0.6;       // global tempo multiplier (lower = calmer)
const CALM_DONE = 0.5;   // residual motion factor on completed steps
const EASE_TAU = 0.75;   // seconds; higher = softer active->complete transition

let waves = [];
let rafId = null;
let lastTs = null;
let resizeObs = null;

// CSS-driven palette — read once on init, re-read on theme swap
const palette = {};
function readPalette() {
  const s = getComputedStyle(document.body);
  palette.frontTop = s.getPropertyValue('--dm-wave-front-top').trim();
  palette.frontBot = s.getPropertyValue('--dm-wave-front-bot').trim();
  palette.backTop  = s.getPropertyValue('--dm-wave-back-top').trim();
  palette.backBot  = s.getPropertyValue('--dm-wave-back-bot').trim();
}

let themeObs = null;
function ensureThemeObserver() {
  if (themeObs) return;
  themeObs = new MutationObserver(function () {
    readPalette();
    if (PREFERS_REDUCED) waves.forEach(function (o) { drawWave(o); });
  });
  themeObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

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

// tAcc replaces the old wall-clock t; calm is pre-computed per frame in stepWave
function fillLayer(ctx, w, h, baseline, comps, tAcc, calm, grad, alpha) {
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  let first = true;
  for (let x = 0; x <= w; x += 2) {
    let y = baseline;
    for (let i = 0; i < comps.length; i++) {
      const c = comps[i];
      y += c.amp * calm * Math.sin((6.2832 / c.len) * x + c.speed * tAcc + c.phase);
    }
    if (first) { ctx.moveTo(x, y); first = false; } else { ctx.lineTo(x, y); }
  }
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.globalAlpha = 1;
}

function drawWave(o) {
  const ctx = o.ctx;
  if (!o.w) sizeWave(o);
  const w = o.w, h = o.h;
  if (!w) return;
  ctx.clearRect(0, 0, w, h);
  const pct = parseFloat(o.bar.style.width) || 0;
  if (pct <= 0) return;

  const gBack = ctx.createLinearGradient(0, 0, 0, h);
  gBack.addColorStop(0, palette.backTop);
  gBack.addColorStop(1, palette.backBot);
  fillLayer(ctx, w, h, h * 0.56, o.comps.back, o.tAcc, o.calm, gBack, 0.55);

  const gFront = ctx.createLinearGradient(0, 0, 0, h);
  gFront.addColorStop(0, palette.frontTop);
  gFront.addColorStop(1, palette.frontBot);
  fillLayer(ctx, w, h, h * 0.5, o.comps.front, o.tAcc, o.calm, gFront, 0.95);
}

// Advance the per-wave calm factor and accumulated phase each frame
function stepWave(o, dt) {
  const done = o.bar.classList.contains('is-complete');
  const target = done ? CALM_DONE : 1;
  o.calm += (target - o.calm) * (1 - Math.exp(-dt / EASE_TAU));
  o.tAcc += o.calm * dt * SPEED;
}

function loop(ts) {
  if (lastTs === null) lastTs = ts;
  let dt = (ts - lastTs) / 1000;
  if (dt > 0.05) dt = 0.05;   // clamp after tab refocus
  lastTs = ts;
  for (let i = 0; i < waves.length; i++) {
    stepWave(waves[i], dt);
    drawWave(waves[i]);
  }
  rafId = requestAnimationFrame(loop);
}

// Idempotent: scans bars, attaches body + canvas if missing, (re)starts the loop.
// Selector targets .step-progress-bar — the % -width clip element whose
// parentElement is .step-progress (the full-width track).
export function initBrewWaves(root) {
  root = root || document;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  lastTs = null;
  waves = [];

  if (resizeObs) {
    resizeObs.disconnect();
  } else {
    resizeObs = new ResizeObserver(function (entries) {
      for (const e of entries) {
        const o = waves.find(function (w) { return w.bar.parentElement === e.target; });
        if (o) {
          sizeWave(o);
          if (PREFERS_REDUCED) drawWave(o);
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
    const o = {
      bar: bar, canvas: canvas, ctx: canvas.getContext('2d'),
      comps: makeComps(), w: 0, h: 0,
      calm: 1, tAcc: 0
    };
    sizeWave(o);
    waves.push(o);
    resizeObs.observe(bar.parentElement);
  });

  readPalette();
  ensureThemeObserver();

  if (PREFERS_REDUCED) { waves.forEach(function (o) { drawWave(o); }); }
  else if (waves.length > 0) { rafId = requestAnimationFrame(loop); }
}
