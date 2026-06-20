/**
 * verify-grind-targets.mjs  (read-only — writes nothing)
 *
 * Runs the brew-engine pipeline against the external reference targets in
 * tests/golden/grind-targets.json and reports whether each engine output
 * falls within the documented real-world range.
 *
 * Fixed inputs: identical to snapshot-brews.mjs
 *   processing=washed, amount=18g, altitude=1500, no waterHardness,
 *   no roastDate, cultivar='', origin='', grindOffset=0
 *
 * Status legend
 *   PASS (checkmark) — value inside [min, max]
 *   NEAR (warning)   — outside but within 1 native unit OR 10% of nearest bound
 *   OUT  (cross)     — clearly outside
 *
 * Exit codes
 *   0 — all HIGH/MEDIUM confidence cells are PASS or NEAR
 *   1 — at least one HIGH/MEDIUM confidence cell is OUT (CI-suitable)
 *   LOW-confidence cells produce warnings only, never affect exit code.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GRINDERS, GRINDER_MIGRATION } from '../js/data/grinders.js';
import { METHODS } from '../js/data/methods.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Fixed inputs ─────────────────────────────────────────────────────────────
const FIXED = {
    amount: 18,
    altitude: 1500,
    waterHardness: null,
    roastDate: null,
    cultivar: '',
    origin: '',
    grindOffset: 0,
};

// ═════════════════════════════════════════════════════════════════════════════
// PROCESSING PIPELINE — inlined from js/brew-engine.js (no browser deps).
// Must stay in sync with snapshot-brews.mjs / brew-engine.js.
// ═════════════════════════════════════════════════════════════════════════════

function getProcessingBaseParams(process) {
    const p = (process || 'unknown').toLowerCase();

    if (p.includes('nitro') || p.includes('co2') || p.includes('co-infused')) {
        return { grindBase: { comandante: 18, fellow: 2.8 }, tempBase: { min: 90, max: 91 }, ratio: 15.5, targetTime: '2:45-3:15', category: 'experimental-nitro' };
    }
    if (p.includes('anaerobic') && p.includes('natural')) {
        return { grindBase: { comandante: 20, fellow: 3.2 }, tempBase: { min: 91, max: 92 }, ratio: 16.5, targetTime: '2:30-3:00', category: 'anaerobic-natural' };
    }
    if (p.includes('anaerobic') && p.includes('washed')) {
        return { grindBase: { comandante: 19, fellow: 3.0 }, tempBase: { min: 91, max: 92 }, ratio: 16, targetTime: '2:30-3:00', category: 'anaerobic-washed' };
    }
    if (p.includes('carbonic')) {
        return { grindBase: { comandante: 20, fellow: 3.3 }, tempBase: { min: 90, max: 91 }, ratio: 16, targetTime: '2:45-3:15', category: 'carbonic' };
    }
    if (p.includes('extended') || p.includes('long ferment')) {
        return { grindBase: { comandante: 21, fellow: 3.4 }, tempBase: { min: 91, max: 92 }, ratio: 16.2, targetTime: '2:30-3:00', category: 'extended-fermentation' };
    }
    if (p.includes('yeast')) {
        return { grindBase: { comandante: 23, fellow: 3.8 }, tempBase: { min: 92, max: 93 }, ratio: 16.5, targetTime: '2:30-3:00', category: 'yeast' };
    }
    if (p.includes('honey')) {
        let grindBase, tempBase;
        if (p.includes('yellow')) {
            grindBase = { comandante: 23, fellow: 3.6 }; tempBase = { min: 92, max: 93 };
        } else if (p.includes('black')) {
            grindBase = { comandante: 26, fellow: 4.2 }; tempBase = { min: 93, max: 94 };
        } else {
            grindBase = { comandante: 24, fellow: 3.9 }; tempBase = { min: 93, max: 94 };
        }
        return { grindBase, tempBase, ratio: 16.7, targetTime: '2:45-3:15', category: 'honey' };
    }
    if (p.includes('natural')) {
        return { grindBase: { comandante: 25, fellow: 4.1 }, tempBase: { min: 93, max: 94 }, ratio: 16.7, targetTime: '2:45-3:15', category: 'natural' };
    }
    if (p === 'unknown') {
        return { grindBase: { comandante: 23, fellow: 3.7 }, tempBase: { min: 92, max: 94 }, ratio: 16, targetTime: '2:30-3:15', category: 'unknown' };
    }
    return { grindBase: { comandante: 22, fellow: 3.5 }, tempBase: { min: 92, max: 93 }, ratio: 16, targetTime: '2:30-3:00', category: 'washed' };
}

function adjustForAltitude(params, altitudeStr) {
    const altitude = parseInt(altitudeStr) || 1500;
    let grindAdjust = 0, tempAdjust = 0;
    if (altitude < 1200)       { grindAdjust = +2; tempAdjust = -1; }
    else if (altitude < 1400)  { grindAdjust = +1; }
    else if (altitude >= 1800) { grindAdjust = -2; tempAdjust = +1; }
    else if (altitude >= 1600) { grindAdjust = -1; }
    return {
        ...params,
        grindBase: { comandante: params.grindBase.comandante + grindAdjust, fellow: params.grindBase.fellow + (grindAdjust * 0.25) },
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        altitudeAdjustment: { grindAdjust, tempAdjust, altitude },
    };
}

function adjustForCultivar(params, cultivarStr) {
    const cultivar = (cultivarStr || '').toLowerCase();
    let grindAdjust = 0, tempAdjust = 0, category = 'balanced';
    if (cultivar.includes('gesha') || cultivar.includes('geisha') ||
        cultivar.includes('sl28') || cultivar.includes('sl34') ||
        cultivar.includes('bourbon') || cultivar.includes('typica')) {
        grindAdjust = -1; tempAdjust = -1; category = 'delicate';
    } else if (cultivar.includes('pacamara') || cultivar.includes('maragogype') ||
               cultivar.includes('catimor') || cultivar.includes('sarchimor') ||
               cultivar.includes('robusta')) {
        grindAdjust = +1; tempAdjust = +1; category = 'robust';
    }
    return {
        ...params,
        grindBase: { comandante: params.grindBase.comandante + grindAdjust, fellow: params.grindBase.fellow + (grindAdjust * 0.25) },
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        cultivarAdjustment: { grindAdjust, tempAdjust, category },
    };
}

function adjustForOrigin(params, originStr) {
    const origin = (originStr || '').toLowerCase();
    let grindAdjust = 0, tempAdjust = 0, region = 'latin-america';
    if (origin.includes('ethiopia') || origin.includes('kenya') ||
        origin.includes('rwanda') || origin.includes('burundi') ||
        origin.includes('tanzania')) {
        grindAdjust = -1; region = 'africa';
    } else if (origin.includes('indonesia') || origin.includes('sumatra') ||
               origin.includes('java') || origin.includes('india') ||
               origin.includes('vietnam') || origin.includes('papua')) {
        grindAdjust = +1; tempAdjust = +1; region = 'asia';
    }
    return {
        ...params,
        grindBase: { comandante: params.grindBase.comandante + grindAdjust, fellow: params.grindBase.fellow + (grindAdjust * 0.25) },
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        originAdjustment: { grindAdjust, tempAdjust, region },
    };
}

function adjustForRoastAge(params, roastDate) {
    if (!roastDate) {
        return { ...params, roastAdjustment: { tempAdjust: 0, roastAgeDays: null, stage: 'unknown' } };
    }
    const roastTime = new Date(roastDate).getTime();
    if (Number.isNaN(roastTime)) {
        return { ...params, roastAdjustment: { tempAdjust: 0, roastAgeDays: null, stage: 'invalid' } };
    }
    const roastAgeDays = Math.floor((Date.now() - roastTime) / (1000 * 60 * 60 * 24));
    let tempAdjust = 0, stage = 'sweet-spot';
    if (roastAgeDays < 7)        { tempAdjust = -1; stage = 'resting'; }
    else if (roastAgeDays >= 30) { tempAdjust = +1; stage = 'fading'; }
    return {
        ...params,
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        roastAdjustment: { tempAdjust, roastAgeDays, stage },
    };
}

function adjustForMethod(params, method) {
    const adj = (METHODS[method] || METHODS.v60).adjust;
    let ratio = params.ratio;
    if (adj.ratioClamp.op === 'max') ratio = Math.max(ratio, adj.ratioClamp.value);
    else if (adj.ratioClamp.op === 'min') ratio = Math.min(ratio, adj.ratioClamp.value);
    return {
        ...params,
        grindBase: {
            comandante: params.grindBase.comandante + adj.grindComandante,
            fellow: params.grindBase.fellow + adj.grindFellow,
        },
        ratio,
        tempBase: { min: params.tempBase.min + adj.tempDelta, max: params.tempBase.max + adj.tempDelta },
        targetTime: adj.targetTime,
    };
}

function getGrinderValue(grindBase, grinder, offset) {
    const o = offset || 0;
    const base = grindBase.comandante;
    const canonicalKey = GRINDER_MIGRATION[grinder] || grinder;
    const profile = (GRINDERS[canonicalKey] || GRINDERS.fellow_gen2).profile;

    if (profile.type === 'ode') {
        const baseValue = profile.baseRef === 'fellow1' ? (grindBase.fellow - 1.5) : grindBase.fellow;
        const val = baseValue + o * profile.offsetFactor;
        return Math.max(profile.min, val).toFixed(1);
    }
    if (profile.type === 'rot') {
        const rotations = base * profile.baseFactor + o * profile.offsetFactor;
        return `${Math.max(profile.min, rotations).toFixed(1)} rot`;
    }
    if (profile.type === 'encore') {
        const val = Math.round(base * profile.baseFactor + o * profile.offsetFactor);
        return `${Math.max(profile.min, Math.min(profile.max, val))}`;
    }
    const val = Math.round(base * profile.baseFactor + o * profile.offsetFactor);
    return `${Math.max(profile.min, val)} clicks`;
}

// ── Compute grindSetting for a single grinder/method/processing combination ──
function computeGrindSetting(grinder, method, processing) {
    const { altitude, roastDate, cultivar, origin, grindOffset } = FIXED;

    const base  = getProcessingBaseParams(processing);
    const alt   = adjustForAltitude(base, altitude);
    const cult  = adjustForCultivar(alt, cultivar);
    const orig  = adjustForOrigin(cult, origin);
    const roast = adjustForRoastAge(orig, roastDate);
    const final = adjustForMethod(roast, method);

    return getGrinderValue(final.grindBase, grinder, grindOffset);
}

// ── Parse the numeric value out of a grindSetting string ─────────────────────
// parseFloat handles all output formats: "22 clicks", "2.6 rot", "20", "3.5"
function parseGrindValue(str) {
    return parseFloat(str);
}

// ── Classify the result ───────────────────────────────────────────────────────
function getStatus(value, min, max) {
    if (value >= min && value <= max) return 'PASS';
    const delta = value < min ? min - value : value - max;
    const bound = value < min ? min : max;
    if (delta <= 1 || delta / bound <= 0.10) return 'NEAR';
    return 'OUT';
}

// ── Load targets ──────────────────────────────────────────────────────────────
const targetsPath = path.join(__dirname, '..', 'tests', 'golden', 'grind-targets.json');
const targets = JSON.parse(readFileSync(targetsPath, 'utf8'));

// ── Run verification ──────────────────────────────────────────────────────────
const rows = targets.map(t => {
    const engineStr = computeGrindSetting(t.grinder, t.method, 'washed');
    const engineVal = parseGrindValue(engineStr);
    const status    = getStatus(engineVal, t.min, t.max);
    return { ...t, engineStr, engineVal, status };
});

// ── Print table ───────────────────────────────────────────────────────────────
const ICONS = { PASS: '✓', NEAR: '⚠', OUT: '✗' };

const colWidths = {
    grinder:    Math.max(7,  ...rows.map(r => r.grinder.length)),
    method:     Math.max(6,  ...rows.map(r => r.method.length)),
    engine:     Math.max(6,  ...rows.map(r => r.engineStr.length)),
    target:     12,
    status:     6,
    confidence: 10,
};

function pad(s, n) { return String(s).padEnd(n); }

const header = [
    pad('grinder',    colWidths.grinder),
    pad('method',     colWidths.method),
    pad('engine',     colWidths.engine),
    pad('target',     colWidths.target),
    pad('status',     colWidths.status),
    pad('confidence', colWidths.confidence),
].join(' | ');

const divider = '-'.repeat(header.length);

console.log('\nGrind-Target Verification');
console.log(divider);
console.log(header);
console.log(divider);

for (const r of rows) {
    const targetStr = `[${r.min}, ${r.max}]`;
    const icon = ICONS[r.status];
    const statusLabel = `${icon} ${r.status}`;
    const line = [
        pad(r.grinder,    colWidths.grinder),
        pad(r.method,     colWidths.method),
        pad(r.engineStr,  colWidths.engine),
        pad(targetStr,    colWidths.target),
        pad(statusLabel,  colWidths.status + 2),
        pad(r.confidence, colWidths.confidence),
    ].join(' | ');
    console.log(line);
}

console.log(divider);

// ── Summary ───────────────────────────────────────────────────────────────────
const nPass = rows.filter(r => r.status === 'PASS').length;
const nNear = rows.filter(r => r.status === 'NEAR').length;
const nOut  = rows.filter(r => r.status === 'OUT').length;

console.log(`\nSummary: ${nPass} PASS / ${nNear} NEAR / ${nOut} OUT`);

const lowRows  = rows.filter(r => r.confidence === 'low');
const highRows = rows.filter(r => r.confidence !== 'low');

const failingLow  = lowRows.filter(r => r.status === 'OUT');
const failingHigh = highRows.filter(r => r.status === 'OUT');

if (failingLow.length > 0) {
    console.log('\nWarnings (low confidence, not failing CI):');
    for (const r of failingLow) {
        console.log(`  ${ICONS.OUT} ${r.grinder} / ${r.method}: engine=${r.engineStr} outside [${r.min}, ${r.max}]`);
    }
}

if (failingHigh.length > 0) {
    console.log('\nFailures (high/medium confidence):');
    for (const r of failingHigh) {
        console.log(`  ${ICONS.OUT} ${r.grinder} / ${r.method}: engine=${r.engineStr} outside [${r.min}, ${r.max}]`);
    }
    process.exit(1);
}
