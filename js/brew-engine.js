// ==========================================
// BREW PARAMETERS ENGINE V5.2
// Method-aware: V60 / Chemex / AeroPress
// 8 Grinder variants (verified specs)
// ==========================================

import { coffeeAmount, preferredGrinder, preferredMethod, manualWaterHardness } from './state.js';
import { getGrinderLabel } from './grinder.js';
import { GRINDERS } from './data/grinders.js';
import { METHODS } from './data/methods.js';

// Qualitative grind bands anchored to Comandante-equivalent clicks (baseFactor 1.0)
// Boundary rule: when equiv is exactly on a boundary, the coarser band applies.
const GRIND_BANDS = [
    { max: 14, label: 'Fine',          haptik: 'like fine table salt' },
    { max: 18, label: 'Medium-fine',   haptik: 'like fine sand' },
    { max: 24, label: 'Medium',        haptik: 'like sand / granulated sugar' },
    { max: 28, label: 'Medium-coarse', haptik: 'like coarse sand' },
    { max: Infinity, label: 'Coarse',  haptik: 'like sea salt' },
];

export function getQualitativeGrind(equiv) {
    const band = GRIND_BANDS.find(b => equiv <= b.max) || GRIND_BANDS[GRIND_BANDS.length - 1];
    return { label: band.label, haptik: band.haptik, equiv };
}

export function getBrewRecommendations(coffee) {
    const amount = coffee.customAmount || coffeeAmount;
    const grinder = preferredGrinder;
    const method = preferredMethod || 'v60';

    const baseParams = getProcessingBaseParams(coffee.process);
    const altitudeAdjusted = adjustForAltitude(baseParams, coffee.altitude);
    const cultivarAdjusted = adjustForCultivar(altitudeAdjusted, coffee.cultivar);
    const originAdjusted = adjustForOrigin(cultivarAdjusted, coffee.origin);
    const waterAdjusted = adjustForWaterHardness(originAdjusted);
    const roastAdjusted = adjustForRoastAge(waterAdjusted, coffee.roastDate);
    const finalParams = adjustForMethod(roastAdjusted, method);

    const grindSetting = getGrinderValue(finalParams.grindBase, grinder, coffee.grindOffset);
    const grindEquiv = Math.round(finalParams.grindBase.comandante + (coffee.grindOffset || 0));
    const temperature = coffee.customTemp || formatTemp(finalParams.tempBase);
    const steps = generateBrewSteps(amount, finalParams.ratio, method);
    const waterAmountMl = Math.round(amount * finalParams.ratio);

    return {
        grindSetting,
        grindEquiv,
        grinderLabel: getGrinderLabel(grinder),
        temperature,
        ratio: `1:${finalParams.ratio} (${amount}g)`,
        ratioNumber: finalParams.ratio,
        waterAmountMl,
        steps,
        targetTime: finalParams.targetTime,
        method,
        notes: generateBrewNotes(coffee, finalParams, method)
    };
}

function adjustForRoastAge(params, roastDate) {
    if (!roastDate) {
        return {
            ...params,
            roastAdjustment: { tempAdjust: 0, roastAgeDays: null, stage: 'unknown' }
        };
    }

    const roastTime = new Date(roastDate).getTime();
    if (Number.isNaN(roastTime)) {
        return {
            ...params,
            roastAdjustment: { tempAdjust: 0, roastAgeDays: null, stage: 'invalid' }
        };
    }

    const roastAgeDays = Math.floor((Date.now() - roastTime) / (1000 * 60 * 60 * 24));
    let tempAdjust = 0;
    let stage = 'sweet-spot';

    // Micro-adjust only (max ±1°C) to keep processing/water/method dominant
    if (roastAgeDays < 7) {
        tempAdjust = -1;
        stage = 'resting';
    } else if (roastAgeDays >= 30) {
        tempAdjust = +1;
        stage = 'fading';
    }

    return {
        ...params,
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        roastAdjustment: { tempAdjust, roastAgeDays, stage }
    };
}

// ==========================================
// METHOD ADJUSTMENTS
// ==========================================

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

// ==========================================
// PROCESSING BASE PARAMS
// ==========================================

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
            grindBase = { comandante: 23, fellow: 3.6 };
            tempBase = { min: 92, max: 93 };
        } else if (p.includes('black')) {
            grindBase = { comandante: 26, fellow: 4.2 };
            tempBase = { min: 93, max: 94 };
        } else {
            grindBase = { comandante: 24, fellow: 3.9 };
            tempBase = { min: 93, max: 94 };
        }
        return { grindBase, tempBase, ratio: 16.7, targetTime: '2:45-3:15', category: 'honey' };
    }
    if (p.includes('natural')) {
        return { grindBase: { comandante: 25, fellow: 4.1 }, tempBase: { min: 93, max: 94 }, ratio: 16.7, targetTime: '2:45-3:15', category: 'natural' };
    }
    // Unknown processing: neutral mid-range defaults, wider temp window
    // Origin, altitude, cultivar adjustments will refine from here
    if (p === 'unknown') {
        return { grindBase: { comandante: 23, fellow: 3.7 }, tempBase: { min: 92, max: 94 }, ratio: 16, targetTime: '2:30-3:15', category: 'unknown' };
    }
    // Default fallback (washed)
    return { grindBase: { comandante: 22, fellow: 3.5 }, tempBase: { min: 92, max: 93 }, ratio: 16, targetTime: '2:30-3:00', category: 'washed' };
}

// ==========================================
// ADJUSTMENT PIPELINE
// ==========================================

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

function adjustForWaterHardness(params) {
    const activeHardness = getActiveWaterHardness();
    if (!activeHardness) return params;

    let grindAdjust = 0, tempAdjust = 0;
    const category = activeHardness.category || getWaterHardnessCategory(activeHardness.value);

    if (category === 'very_soft' || category === 'soft') {
        grindAdjust = -2; tempAdjust = +1;
    } else if (category === 'hard' || category === 'very_hard') {
        grindAdjust = +2; tempAdjust = -1;
    }

    return {
        ...params,
        grindBase: { comandante: params.grindBase.comandante + grindAdjust, fellow: params.grindBase.fellow + (grindAdjust * 0.5) },
        tempBase: { min: params.tempBase.min + tempAdjust, max: params.tempBase.max + tempAdjust },
        waterAdjustment: { grindAdjust, tempAdjust }
    };
}

// ==========================================
// GRINDER VALUE
// Profile data lives in js/data/grinders.js (GRINDERS registry).
// Fallback for unknown/legacy keys = fellow_gen2.
// ==========================================

function getGrinderValue(grindBase, grinder, offset) {
    const o = offset || 0;
    const base = grindBase.comandante;

    // "Other / not listed yet": return Comandante-equivalent; display handled by coffee-cards.js
    if (grinder === 'other') {
        return String(Math.round(base + o));
    }

    const profile = (GRINDERS[grinder] || GRINDERS.fellow_gen2).profile;

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

    if (profile.type === 'df64') {
        const val = Math.round(base * profile.baseFactor + o * profile.offsetFactor);
        return String(Math.max(profile.min, Math.min(profile.max, val)));
    }

    const val = Math.round(base * profile.baseFactor + o * profile.offsetFactor);
    return `${Math.max(profile.min, val)} clicks`;
}

// ==========================================
// BREW STEPS (method-aware)
// ==========================================

function generateBrewSteps(amount, ratio, method) {
    const waterAmount = Math.round(amount * ratio);
    return (METHODS[method] || METHODS.v60).buildSteps(amount, ratio, waterAmount);
}

// ==========================================
// FORMATTING & NOTES
// ==========================================

function formatTemp(tempBase) {
    return `${tempBase.min}-${tempBase.max}°C`;
}

function generateBrewNotes(coffee, params, method) {
    const notes = [];
    const methodNote = (METHODS[method] || METHODS.v60).note;

    if (methodNote) {
        notes.push(methodNote);
    } else {
        const categoryNotes = {
            'experimental-nitro': 'Nitro process - very delicate, preserve volatile compounds',
            'anaerobic-natural': 'Anaerobic natural - funky & fruity, control extraction',
            'anaerobic-washed': 'Anaerobic washed - clean but complex, cooler temp',
            'carbonic': 'Carbonic maceration - wine-like characteristics, slow extraction',
            'extended-fermentation': 'Extended fermentation - intense flavors, careful extraction',
            'yeast': 'Yeast inoculated - unique fermentation notes, standard approach',
            'honey': 'Honey process - sweet & fruity, balanced extraction',
            'natural': 'Natural process - full fruit body, coarser grind',
            'washed': 'Washed process - clean & bright, standard parameters',
            'unknown': 'Processing unknown - using balanced defaults. Adjust via feedback after first brew.'
        };
        notes.push(categoryNotes[params.category] || 'Standard brewing approach');
    }

    if (params.altitudeAdjustment) {
        if (params.altitudeAdjustment.altitude >= 1800) notes.push('High altitude beans - very dense, ground finer');
        else if (params.altitudeAdjustment.altitude < 1200) notes.push('Low altitude beans - softer, ground coarser');
    }
    if (params.cultivarAdjustment) {
        if (params.cultivarAdjustment.category === 'delicate') notes.push('Delicate cultivar - gentle extraction, lower temp');
        else if (params.cultivarAdjustment.category === 'robust') notes.push('Robust cultivar - can handle higher temps & coarser grind');
    }
    if (params.originAdjustment) {
        if (params.originAdjustment.region === 'africa') notes.push('African origin - floral notes, finer grind');
        else if (params.originAdjustment.region === 'asia') notes.push('Asian origin - earthy body, coarser grind');
    }

    const activeHardness = getActiveWaterHardness();
    if (activeHardness) {
        const category = activeHardness.category || getWaterHardnessCategory(activeHardness.value);
        if (category === 'very_soft' || category === 'soft') notes.push('Soft water - ground finer, higher temp');
        else if (category === 'hard' || category === 'very_hard') notes.push('Hard water - ground coarser, consider filtering');
    }

    return notes.join('. ');
}

export function boldWeights(text) {
    return text.replace(/(\d+g)/g, '<strong>$1</strong>');
}

// ==========================================
// WATER HARDNESS HELPERS
// ==========================================

function getActiveWaterHardness() {
    return manualWaterHardness;
}

function getWaterHardnessCategory(value) {
    if (value < 7) return 'very_soft';
    if (value < 14) return 'soft';
    if (value < 21) return 'medium';
    if (value < 28) return 'hard';
    return 'very_hard';
}
