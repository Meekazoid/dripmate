/**
 * snapshot-brews.mjs
 * Golden-Master snapshot: iterates ALL grinder × method × processing combinations
 * with fixed neutral inputs and writes grindSetting/temperature/ratio/targetTime/steps
 * to tests/golden/brews.baseline.json (or brews.after.json if --after flag is set).
 *
 * Fixed inputs: amount=18g, altitude=1500, no waterHardness, no roastDate,
 *               cultivar='', origin='', grindOffset=0
 *
 * Logic is inlined from js/brew-engine.js — NO browser dependencies.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

// ── Grinders to iterate (all profile keys from brew-engine.js profiles{}) ────
const GRINDERS = [
    'comandante_mk4',
    'comandante_mk3',
    'comandante',      // legacy alias
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
const METHODS = ['v60', 'chemex', 'aeropress'];

// ── Processings ───────────────────────────────────────────────────────────────
// These strings are chosen to trigger each branch in getProcessingBaseParams().
const PROCESSINGS = [
    'washed',            // → default fallback
    'natural',           // → natural branch
    'honey',             // → honey (general)
    'anaerobic-natural', // → anaerobic+natural branch (includes both substrings)
    'unknown',           // → unknown branch
];

// ═════════════════════════════════════════════════════════════════════════════
// INLINE ENGINE LOGIC (copied from js/brew-engine.js, no DOM/state imports)
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
            grindBase = { comandante: 23, fellow: 3.6 };
            tempBase = { min: 92, max: 93 };
        } else if (p.includes('black')) {
            grindBase = { comandante: 26, fellow: 4.2 };
            tempBase = { min: 93, max: 94 };
        } else {
            grindBase = { comandante: 24, fellow: 3.9 };
            tempBase = { min: 93, max: 94 };
        }
        return { grindBase, tempBase, ratio: 16.7, brewStyle: 'fruity', targetTime: '2:45-3:15', category: 'honey' };
    }
    if (p.includes('natural')) {
        return { grindBase: { comandante: 25, fellow: 4.1 }, tempBase: { min: 93, max: 94 }, ratio: 16.7, brewStyle: 'fruity', targetTime: '2:45-3:15', category: 'natural' };
    }
    if (p === 'unknown') {
        return { grindBase: { comandante: 23, fellow: 3.7 }, tempBase: { min: 92, max: 94 }, ratio: 16, brewStyle: 'standard', targetTime: '2:30-3:15', category: 'unknown' };
    }
    // Default fallback (washed)
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
        altitudeAdjustment: { grindAdjust, tempAdjust, altitude }
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
        cultivarAdjustment: { grindAdjust, tempAdjust, category }
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
        originAdjustment: { grindAdjust, tempAdjust, region }
    };
}

function adjustForRoastAge(params, roastDate) {
    // roastDate = null → no adjustment
    if (!roastDate) {
        return { ...params, roastAdjustment: { tempAdjust: 0, roastAgeDays: null, stage: 'unknown' } };
    }
    const roastTime = new Date(roastDate).getTime();
    if (Number.isNaN(roastTime)) {
        return { ...params, roastAdjustment: { tempAdjust: 0, roastAgeDays: null, stage: 'invalid' } };
    }
    const roastAgeDays = Math.floor((Date.now() - roastTime) / (1000 * 60 * 60 * 24));
    let tempAdjust = 0, stage = 'sweet-spot';
    if (roastAgeDays < 7)    { tempAdjust = -1; stage = 'resting'; }
    else if (roastAgeDays >= 30) { tempAdjust = +1; stage = 'fading'; }
    return {
        ...params,
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        roastAdjustment: { tempAdjust, roastAgeDays, stage }
    };
}

function adjustForMethod(params, method) {
    if (method === 'chemex') {
        return {
            ...params,
            grindBase: {
                comandante: params.grindBase.comandante + 3,
                fellow: params.grindBase.fellow + 0.75
            },
            ratio: Math.max(params.ratio, 16.5),
            tempBase: { min: params.tempBase.min + 1, max: params.tempBase.max + 1 },
            targetTime: '3:30-4:30',
            brewStyle: params.brewStyle
        };
    }
    if (method === 'aeropress') {
        return {
            ...params,
            grindBase: {
                comandante: params.grindBase.comandante - 3,
                fellow: params.grindBase.fellow - 0.75
            },
            ratio: Math.min(params.ratio, 15),
            tempBase: { min: params.tempBase.min - 1, max: params.tempBase.max - 1 },
            targetTime: '1:30-2:30',
            brewStyle: params.brewStyle
        };
    }
    return params;
}

function getGrinderValue(grindBase, grinder, offset) {
    const o = offset || 0;
    const base = grindBase.comandante;

    const profiles = {
        comandante_mk4: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        comandante_mk3: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        comandante:     { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        fellow_gen2:    { type: 'ode', baseRef: 'fellow2', offsetFactor: 0.1, min: 0.1 },
        fellow_gen1:    { type: 'ode', baseRef: 'fellow1', offsetFactor: 0.1, min: 0.1 },
        fellow:         { type: 'ode', baseRef: 'fellow2', offsetFactor: 0.1, min: 0.1 },
        timemore_s3:    { type: 'clicks', baseFactor: 2.5, offsetFactor: 2.5, min: 1 },
        timemore_c2:    { type: 'clicks', baseFactor: 0.82, offsetFactor: 0.82, min: 1 },
        timemore:       { type: 'clicks', baseFactor: 2.5, offsetFactor: 2.5, min: 1 },
        '1zpresso':     { type: 'rot', baseFactor: 3.5 / 30, offsetFactor: 3.5 / 30, min: 0.1 },
        baratza:        { type: 'encore', baseFactor: 0.9, offsetFactor: 0.9, min: 1, max: 40 }
    };

    const profile = profiles[grinder] || profiles.fellow_gen2;

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

    // clicks
    const val = Math.round(base * profile.baseFactor + o * profile.offsetFactor);
    return `${Math.max(profile.min, val)} clicks`;
}

function generateBrewSteps(amount, ratio, brewStyle, method) {
    const waterAmount = Math.round(amount * ratio);

    if (method === 'aeropress') {
        const bloom = Math.round(amount * 2);
        return [
            { time: '0:00', action: `Invert AeroPress. Add ${amount}g coffee, pour ${bloom}g water. Stir 3×` },
            { time: '0:15', action: `Pour to ${waterAmount}g total. Place cap + filter` },
            { time: '0:30', action: `Let steep. Don't disturb` },
            { time: '1:15', action: `Flip onto cup. Press slowly (30 sec). Stop before hiss` }
        ];
    }

    if (method === 'chemex') {
        const bloom = Math.round(amount * 3);
        return [
            { time: '0:00', action: `Bloom: ${bloom}g water, gentle stir, wait 45 sec` },
            { time: '0:45', action: `Pour slowly to ${Math.round(waterAmount * 0.4)}g. Center pour` },
            { time: '1:30', action: `Pour to ${Math.round(waterAmount * 0.7)}g. Wide circles` },
            { time: '2:30', action: `Pour to ${waterAmount}g. Let drain completely` }
        ];
    }

    // V60 (default — style-dependent)
    const bloom = Math.round(amount * (brewStyle === 'slow' ? 3.5 : 3));

    if (brewStyle === 'slow') {
        return [
            { time: '0:00', action: `Bloom: ${bloom}g water, wait 45 sec` },
            { time: '0:45', action: `To ${Math.round(waterAmount * 0.45)}g: Very slow circular pour` },
            { time: '1:30', action: `To ${Math.round(waterAmount * 0.75)}g: Continue slowly` },
            { time: '2:15', action: `To ${waterAmount}g: Final pour` }
        ];
    }
    if (brewStyle === 'fruity') {
        return [
            { time: '0:00', action: `Bloom: ${bloom}g, create crater, 45 sec` },
            { time: '0:45', action: `To ${Math.round(waterAmount * 0.52)}g: Pour slowly` },
            { time: '1:20', action: `To ${Math.round(waterAmount * 0.84)}g: Concentric circles` },
            { time: '1:50', action: `To ${waterAmount}g: Final pour` }
        ];
    }
    return [
        { time: '0:00', action: `Bloom: ${bloom}g water, 30-40 sec` },
        { time: '0:40', action: `To ${Math.round(waterAmount * 0.5)}g: Pour evenly` },
        { time: '1:15', action: `To ${Math.round(waterAmount * 0.83)}g: Concentric circles` },
        { time: '1:45', action: `To ${waterAmount}g: Final pour` }
    ];
}

function formatTemp(tempBase) {
    return `${tempBase.min}-${tempBase.max}°C`;
}

// ── Compute a single brew result ──────────────────────────────────────────────
function computeBrew(grinder, method, processing) {
    const { amount, altitude, waterHardness, roastDate, cultivar, origin, grindOffset } = FIXED;

    const base     = getProcessingBaseParams(processing);
    const alt      = adjustForAltitude(base, altitude);
    const cult     = adjustForCultivar(alt, cultivar);
    const orig     = adjustForOrigin(cult, origin);
    // water hardness: null → no adjustment (skip adjustForWaterHardness)
    const roast    = adjustForRoastAge(orig, roastDate);
    const final    = adjustForMethod(roast, method);

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

for (const grinder of GRINDERS) {
    results[grinder] = {};
    for (const method of METHODS) {
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
        grinders: GRINDERS,
        methods: METHODS,
        processings: PROCESSINGS,
    },
    results,
};

writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log(`✓ Snapshot written to ${OUT_FILE}`);
console.log(`  ${GRINDERS.length} grinders × ${METHODS.length} methods × ${PROCESSINGS.length} processings = ${GRINDERS.length * METHODS.length * PROCESSINGS.length} combinations`);
