// ==========================================
// BREW PARAMETERS ENGINE V5.2
// Method-aware: V60 / Chemex / AeroPress
// 8 Grinder variants (verified specs)
// ==========================================

import { coffeeAmount, preferredGrinder, preferredMethod, manualWaterHardness, apiWaterHardness } from './state.js';
import { getGrinderLabel } from './grinder.js';

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
    const temperature = coffee.customTemp || formatTemp(finalParams.tempBase);
    const steps = generateBrewSteps(amount, finalParams.ratio, finalParams.brewStyle, method);
    const waterAmountMl = Math.round(amount * finalParams.ratio);

    return {
        grindSetting,
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

// ==========================================
// PROCESSING BASE PARAMS
// ==========================================

function getProcessingBaseParams(process) {
    const p = process.toLowerCase();

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
    return { grindBase: { comandante: 22, fellow: 3.5 }, tempBase: { min: 92, max: 93 }, ratio: 16, brewStyle: 'standard', targetTime: '2:30-3:00', category: 'washed' };
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
    const cultivar = cultivarStr.toLowerCase();
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
    const origin = originStr.toLowerCase();
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
// Conversion factors based on µm/click:
//   Comandante C40: ~30µm/click, V60 range 21-25 clicks
//   Fellow Ode Gen 2: ~25µm/step (SSP MP 64mm flat)
//   Fellow Ode Gen 1: ~50µm/step (original 64mm flat)
//   Timemore S3: 15µm/click, 42mm S2C890, V60 range 50-80
//   Timemore C2: ~80µm/click, 38mm conical, V60 range 15-20
//   1Zpresso JX: 48mm conical, 30 clicks/rotation
//   Baratza Encore: 40mm conical, 40 stepped settings
// ==========================================

function getGrinderValue(grindBase, grinder, offset) {
    const o = offset || 0;
    const base = grindBase.comandante;

    // Calibration matrix v1: centralizes scaling and offset sensitivity per grinder.
    const profiles = {
        comandante_mk4: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        comandante_mk3: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        comandante: { type: 'clicks', baseFactor: 1.0, offsetFactor: 1.0, min: 1 },
        fellow_gen2: { type: 'ode', baseRef: 'fellow2', offsetFactor: 0.1, min: 0.1 },
        fellow_gen1: { type: 'ode', baseRef: 'fellow1', offsetFactor: 0.1, min: 0.1 },
        fellow: { type: 'ode', baseRef: 'fellow2', offsetFactor: 0.1, min: 0.1 },
        timemore_s3: { type: 'clicks', baseFactor: 2.0, offsetFactor: 2.0, min: 1 },
        timemore_c2: { type: 'clicks', baseFactor: 0.82, offsetFactor: 0.82, min: 1 },
        timemore: { type: 'clicks', baseFactor: 2.0, offsetFactor: 2.0, min: 1 },
        '1zpresso': { type: 'rot', baseFactor: 1.1 / 30, offsetFactor: 1.1 / 30, min: 0.1 },
        baratza: { type: 'encore', baseFactor: 0.8, offsetFactor: 0.8, min: 1, max: 40 }
    };

    const profile = profiles[grinder] || profiles.fellow;

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

// ==========================================
// BREW STEPS (method-aware)
// ==========================================

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

// ==========================================
// FORMATTING & NOTES
// ==========================================

function formatTemp(tempBase) {
    return `${tempBase.min}-${tempBase.max}°C`;
}

function generateBrewNotes(coffee, params, method) {
    const notes = [];

    if (method === 'chemex') {
        notes.push('Chemex - thick paper filter, clean cup, coarser grind');
    } else if (method === 'aeropress') {
        notes.push('AeroPress inverted - full immersion, concentrated, finer grind');
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
            'washed': 'Washed process - clean & bright, standard parameters'
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
    return manualWaterHardness || apiWaterHardness;
}

function getWaterHardnessCategory(value) {
    if (value < 7) return 'very_soft';
    if (value < 14) return 'soft';
    if (value < 21) return 'medium';
    if (value < 28) return 'hard';
    return 'very_hard';
}
