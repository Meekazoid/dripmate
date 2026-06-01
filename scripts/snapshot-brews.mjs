/**
 * snapshot-brews.mjs
 * Golden-Master snapshot: iterates ALL grinder × method × processing combinations
 * with fixed neutral inputs and writes grindSetting/temperature/ratio/targetTime/steps
 * to tests/golden/brews.baseline.json (or brews.after.json if --after flag is set).
 *
 * Fixed inputs: amount=18g, altitude=1500, no waterHardness, no roastDate,
 *               cultivar='', origin='', grindOffset=0
 *
 * Processing pipeline (getProcessingBaseParams, adjustForAltitude, …) is inlined —
 * those functions live solely in js/brew-engine.js and have no browser deps here.
 *
 * Profile lookup  → js/data/grinders.js  (GRINDERS registry, real source)
 * Method adjust   → js/data/methods.js   (METHODS registry, real source)
 * This makes the --after snapshot a genuine test of the refactored registry data.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GRINDERS, GRINDER_MIGRATION } from '../js/data/grinders.js';
import { METHODS }  from '../js/data/methods.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'tests', 'golden');

const isAfter = process.argv.includes('--after');
const OUT_FILE = path.join(OUT_DIR, isAfter ? 'brews.after.json' : 'brews.baseline.json');

// ── Fixed inputs ──────────────────────────────────────────────────────────────
const FIXED = {
    amount: 18,
    altitude: 1500,
    waterHardness: null,
    roastDate: null,
    cultivar: '',
    origin: '',
    grindOffset: 0,
};

// ── Grinders to iterate (all profile keys, including legacy aliases) ───────────
const GRINDER_KEYS = [
    'comandante_mk4',
    'comandante_mk3',
    'comandante',      // legacy alias → falls back to fellow_gen2 profile (same as old profiles.fellow)
    'fellow_gen2',
    'fellow_gen1',
    'fellow',          // legacy alias
    'timemore_s3',
    'timemore_c2',
    'timemore',        // legacy alias
    '1zpresso',
    'baratza',
];

// ── Methods ───────────────────────────────────────────────────────────────────
const METHOD_KEYS = ['v60', 'chemex', 'aeropress'];

// ── Processings ───────────────────────────────────────────────────────────────
const PROCESSINGS = [
    'washed',            // → default fallback
    'natural',           // → natural branch
    'honey',             // → honey (general)
    'anaerobic-natural', // → anaerobic+natural branch
    'unknown',           // → unknown branch
];

// ═════════════════════════════════════════════════════════════════════════════
// PROCESSING PIPELINE — inlined from js/brew-engine.js (no browser deps)
// ═════════════════════════════════════════════════════════════════════════════

function getProcessingBaseParams(process) {
    const p = (process || 'unknown').toLowerCase();

    if (p.includes('nitro') || p.includes('co2') || p.includes('co-infused')) {
        return { grindBase: { comandante: 18, fellow: 2.8 }, tempBase: { min: 90, max: 91 }, ratio: 15.5, brewStyle: 'slow', targetTime: '2:45-3:15', category: 'experimental-nitro' };
    }
    if (p.includes('anaerobic') && p.includes('natural')) {
        return { grindBase: { comandante: 20, fellow: 3.2 }, tempBase: { min: 91, max: 92 }, ratio: 16.5, brewStyle: 'controlled', targetTime: '2:30-3:00', category: 'anaerobic-natural' };
    }
    if (p.includes('anaerobic') && p.includes('washed')) {
        return { grindBase: { comandante: 19, fellow: 3.0 }, tempBase: { min: 91, max: 92 }, ratio: 16, brewStyle: 'controlled', targetTime: '2:30-3:00', category: 'anaerobic-washed' };
    }
    if (p.includes('carbonic')) {
        return { grindBase: { comandante: 20, fellow: 3.3 }, tempBase: { min: 90, max: 91 }, ratio: 16, brewStyle: 'slow', targetTime: '2:45-3:15', category: 'carbonic' };
    }
    if (p.includes('extended') || p.includes('long ferment')) {
        return { grindBase: { comandante: 21, fellow: 3.4 }, tempBase: { min: 91, max: 92 }, ratio: 16.2, brewStyle: 'controlled', targetTime: '2:30-3:00', category: 'extended-fermentation' };
    }
    if (p.includes('yeast')) {
        return { grindBase: { comandante: 23, fellow: 3.8 }, tempBase: { min: 92, max: 93 }, ratio: 16.5, brewStyle: 'standard', targetTime: '2:30-3:00', category: 'yeast' };
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
        return { grindBase, tempBase, ratio: 16.7, brewStyle: 'fruity', targetTime: '2:45-3:15', category: 'honey' };
    }
    if (p.includes('natural')) {
        return { grindBase: { comandante: 25, fellow: 4.1 }, tempBase: { min: 93, max: 94 }, ratio: 16.7, brewStyle: 'fruity', targetTime: '2:45-3:15', category: 'natural' };
    }
    if (p === 'unknown') {
        return { grindBase: { comandante: 23, fellow: 3.7 }, tempBase: { min: 92, max: 94 }, ratio: 16, brewStyle: 'standard', targetTime: '2:30-3:15', category: 'unknown' };
    }
    return { grindBase: { comandante: 22, fellow: 3.5 }, tempBase: { min: 92, max: 93 }, ratio: 16, brewStyle: 'standard', targetTime: '2:30-3:00', category: 'washed' };
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

// ── Registry-driven functions (use real GRINDERS / METHODS data) ───────────────

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
        targetTime: adj.targetTime || params.targetTime,
        brewStyle: params.brewStyle,
    };
}

function getGrinderValue(grindBase, grinder, offset) {
    const o = offset || 0;
    const base = grindBase.comandante;
    // Apply the same migration the real app runs via migrateGrinderPreference(),
    // so legacy keys resolve to their canonical profiles instead of the fellow_gen2 fallback.
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

function generateBrewSteps(amount, ratio, brewStyle, method) {
    const waterAmount = Math.round(amount * ratio);
    return (METHODS[method] || METHODS.v60).buildSteps(amount, ratio, brewStyle, waterAmount);
}

function formatTemp(tempBase) {
    return `${tempBase.min}-${tempBase.max}°C`;
}

// ── Compute a single brew result ──────────────────────────────────────────────
function computeBrew(grinder, method, processing) {
    const { amount, altitude, roastDate, cultivar, origin, grindOffset } = FIXED;

    const base  = getProcessingBaseParams(processing);
    const alt   = adjustForAltitude(base, altitude);
    const cult  = adjustForCultivar(alt, cultivar);
    const orig  = adjustForOrigin(cult, origin);
    const roast = adjustForRoastAge(orig, roastDate);
    const final = adjustForMethod(roast, method);

    const grindSetting = getGrinderValue(final.grindBase, grinder, grindOffset);
    const temperature  = formatTemp(final.tempBase);
    const waterAmount  = Math.round(amount * final.ratio);
    const steps        = generateBrewSteps(amount, final.ratio, final.brewStyle, method);

    return {
        grindSetting,
        temperature,
        ratio: `1:${final.ratio} (${amount}g)`,
        targetTime: final.targetTime,
        waterAmountMl: waterAmount,
        steps,
    };
}

// ── Main ──────────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

const results = {};
for (const grinder of GRINDER_KEYS) {
    results[grinder] = {};
    for (const method of METHOD_KEYS) {
        results[grinder][method] = {};
        for (const processing of PROCESSINGS) {
            results[grinder][method][processing] = computeBrew(grinder, method, processing);
        }
    }
}

const output = {
    meta: {
        generatedAt: new Date().toISOString(),
        inputs: FIXED,
        grinders: GRINDER_KEYS,
        methods: METHOD_KEYS,
        processings: PROCESSINGS,
    },
    results,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log(`✓ Snapshot written to ${OUT_FILE}`);
console.log(`  ${GRINDER_KEYS.length} grinders × ${METHOD_KEYS.length} methods × ${PROCESSINGS.length} processings = ${GRINDER_KEYS.length * METHOD_KEYS.length * PROCESSINGS.length} combinations`);
