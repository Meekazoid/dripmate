// ==========================================
// BREWBUDDY - APP.JS
// Extracted & cleaned from index.html
// Dead code eliminated, modular structure
// WITH TIMEMORE S3 SUPPORT
// ==========================================

// ==========================================
// 1. CONFIG & GLOBALS
// ==========================================

const CONFIG = {
    backendUrl: 'https://brew-buddy-backend-production.up.railway.app',
};

let coffees = JSON.parse(localStorage.getItem('coffees') || '[]');
let coffeeAmount = parseInt(localStorage.getItem('coffeeAmount')) || 15;
let preferredGrinder = localStorage.getItem('preferredGrinder') || 'fellow';
let waterHardness = null; // Current active water hardness (manual or API)
let manualWaterHardness = JSON.parse(localStorage.getItem('manualWaterHardness') || 'null');
let apiWaterHardness = null; // Water hardness from ZIP lookup
let userZipCode = localStorage.getItem('userZipCode') || '';

// Brew timer state (per-card)
let brewTimers = {};
let animationFrames = {};

// ==========================================
// 2. THEME
// ==========================================

const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

// ==========================================
// 3. MANUAL FORM TOGGLE
// ==========================================

function toggleManual() {
    const manualSection = document.querySelector('.manual-section');
    manualSection.classList.toggle('hidden');
}

// ==========================================
// 4. GLOBAL GRINDER SELECTOR
// ==========================================

function initGlobalGrinder() {
    const fellowBtn = document.getElementById('global-fellow');
    const comandanteBtn = document.getElementById('global-comandante');
    const timemoreBtn = document.getElementById('global-timemore');

    // Reset all states
    fellowBtn.classList.remove('active');
    comandanteBtn.classList.remove('active');
    timemoreBtn.classList.remove('active');

    // Set active state based on preference
    if (preferredGrinder === 'comandante') {
        comandanteBtn.classList.add('active');
    } else if (preferredGrinder === 'timemore') {
        timemoreBtn.classList.add('active');
    } else {
        fellowBtn.classList.add('active');
    }

    // Bind event listeners
    fellowBtn.addEventListener('click', () => switchGlobalGrinder('fellow'));
    comandanteBtn.addEventListener('click', () => switchGlobalGrinder('comandante'));
    timemoreBtn.addEventListener('click', () => switchGlobalGrinder('timemore'));
}

async function switchGlobalGrinder(grinder) {
    const fellowBtn = document.getElementById('global-fellow');
    const comandanteBtn = document.getElementById('global-comandante');
    const timemoreBtn = document.getElementById('global-timemore');

    // Remove all active states
    fellowBtn.classList.remove('active');
    comandanteBtn.classList.remove('active');
    timemoreBtn.classList.remove('active');

    // Set active state for selected grinder
    if (grinder === 'fellow') {
        fellowBtn.classList.add('active');
    } else if (grinder === 'comandante') {
        comandanteBtn.classList.add('active');
    } else if (grinder === 'timemore') {
        timemoreBtn.classList.add('active');
    }

    preferredGrinder = grinder;
    localStorage.setItem('preferredGrinder', grinder);

    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncGrinderPreference) {
        await window.backendSync.syncGrinderPreference(grinder);
    }

    renderCoffees();

    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    console.log(`✓ Grinder switched to: ${grinder}`);
}

function getGrinderLabel(grinder) {
    if (grinder === 'comandante') return 'Comandante';
    if (grinder === 'timemore') return 'Timemore S3';
    return 'Fellow Ode';
}

// ==========================================
// 5. ROAST DATE & FRESHNESS
// ==========================================

function updateRoastDate(index, dateValue) {
    coffees[index].roastDate = dateValue;
    localStorage.setItem('coffees', JSON.stringify(coffees));

    const badgeWrapper = document.getElementById(`freshness-badge-${index}`);
    if (badgeWrapper) {
        badgeWrapper.innerHTML = getRoastFreshnessBadge(coffees[index].roastDate);
    }
}

function getRoastFreshnessBadge(roastDate) {
    if (!roastDate) return '';

    const roastTime = new Date(roastDate).getTime();
    const currentTime = Date.now();
    const daysDiff = Math.floor((currentTime - roastTime) / (1000 * 60 * 60 * 24));

    const flameIcon = `<svg class="freshness-icon" viewBox="0 0 24 24">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>`;

    let category, label, gradientStyle = '';

    if (daysDiff < 7) {
        category = 'resting';
        label = 'Still Resting';
    } else if (daysDiff < 30) {
        category = 'sweet';
        label = 'Sweet Spot';

        if (daysDiff < 10) {
            const progress = (daysDiff - 7) / 3;
            const blueOpacity = 0.15 * (1 - progress);
            const orangeOpacity = 0.15 * progress;
            gradientStyle = `background: linear-gradient(135deg, rgba(33, 150, 243, ${blueOpacity}) 0%, rgba(255, 152, 0, ${orangeOpacity}) 100%);`;
        } else if (daysDiff >= 25) {
            const progress = (daysDiff - 25) / 5;
            const orangeOpacity = 0.15 * (1 - progress);
            const grayOpacity = 0.15 * progress;
            gradientStyle = `background: linear-gradient(135deg, rgba(255, 152, 0, ${orangeOpacity}) 0%, rgba(158, 158, 158, ${grayOpacity}) 100%);`;
        }
    } else {
        category = 'fading';
        label = 'Fading';
    }

    return `<div class="freshness-badge ${category}" style="${gradientStyle}">${flameIcon}${label}</div>`;
}

// ==========================================
// 6. BREW PARAMETERS ENGINE
// ==========================================

function getBrewRecommendations(coffee) {
    const amount = coffee.customAmount || coffeeAmount;
    const grinder = preferredGrinder;

    const baseParams = getProcessingBaseParams(coffee.process);
    const altitudeAdjusted = adjustForAltitude(baseParams, coffee.altitude);
    const cultivarAdjusted = adjustForCultivar(altitudeAdjusted, coffee.cultivar);
    const originAdjusted = adjustForOrigin(cultivarAdjusted, coffee.origin);
    const finalParams = adjustForWaterHardness(originAdjusted);

    const grindSetting = getGrinderValue(finalParams.grindBase, grinder, coffee.grindOffset);
    const temperature = coffee.customTemp || formatTemp(finalParams.tempBase);
    const steps = generateBrewSteps(amount, finalParams.ratio, finalParams.brewStyle);
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
        notes: generateBrewNotes(coffee, finalParams)
    };
}

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
    // Default: washed
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

function getGrinderValue(grindBase, grinder, offset) {
    const o = offset || 0;
    
    if (grinder === 'comandante') {
        return `${Math.max(1, Math.round(grindBase.comandante + o))} clicks`;
    }
    
    if (grinder === 'timemore') {
        // Baseline: 6.5 entspricht Comandante 22 clicks
        // Formel: S3_Wert = 6.5 + (Comandante_Klicks - 22) * 0.15
        const baseValue = 6.5 + (grindBase.comandante - 22) * 0.15;
        const withOffset = baseValue + (o * 0.15);
        return Math.max(1.0, withOffset).toFixed(1);
    }
    
    // Fellow Ode (default)
    return Math.max(0.1, grindBase.fellow + o * 0.1).toFixed(1);
}

function formatTemp(tempBase) {
    return `${tempBase.min}-${tempBase.max}°C`;
}

function generateBrewSteps(amount, ratio, brewStyle) {
    const waterAmount = Math.round(amount * ratio);
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
    // Standard & controlled
    return [
        { time: '0:00', action: `Bloom: ${bloom}g water, 30-40 sec` },
        { time: '0:40', action: `To ${Math.round(waterAmount * 0.5)}g: Pour evenly` },
        { time: '1:15', action: `To ${Math.round(waterAmount * 0.83)}g: Concentric circles` },
        { time: '1:45', action: `To ${waterAmount}g: Final pour` }
    ];
}

function generateBrewNotes(coffee, params) {
    const notes = [];
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

function boldWeights(text) {
    return text.replace(/(\d+g)/g, '<strong>$1</strong>');
}

// ==========================================
// 7. BREW TIMER
// ==========================================

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

function startBrewTimer(index) {
    const brewParams = getBrewRecommendations(coffees[index]);

    const steps = brewParams.steps.map((step, i) => ({
        ...step,
        startSeconds: parseTimeToSeconds(step.time),
        index: i
    }));

    const totalBrewTime = steps[steps.length - 1].startSeconds + 60;

    steps.forEach((step, i) => {
        step.endSeconds = i < steps.length - 1 ? steps[i + 1].startSeconds : totalBrewTime;
        step.duration = step.endSeconds - step.startSeconds;
    });

    brewTimers[index] = { startTime: performance.now(), steps, isRunning: true, isPaused: false };

    const startBtn = document.getElementById(`start-brew-${index}`);
    const pauseBtn = document.getElementById(`pause-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) { startBtn.textContent = 'Brewing...'; startBtn.classList.add('brewing'); startBtn.disabled = true; }
    if (pauseBtn) pauseBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;

    // Smooth scroll to pour-over steps
    const card = document.querySelector(`.coffee-card[data-original-index="${index}"]`);
    if (card) {
        const brewSteps = card.querySelector('.brew-steps');
        if (brewSteps) {
            const targetTimeBox = card.querySelector('.param-grid');
            const offset = targetTimeBox ? targetTimeBox.offsetHeight + 60 : 100;
            const elementPosition = brewSteps.getBoundingClientRect().top;
            window.scrollTo({ top: elementPosition + window.pageYOffset - offset, behavior: 'smooth' });
        }
    }

    updateBrewProgress(index);
}

function pauseBrewTimer(index) {
    const timer = brewTimers[index];
    if (!timer) return;

    if (timer.isPaused) {
        timer.startTime = performance.now() - (timer.pausedAt || 0);
        timer.isPaused = false;
        timer.isRunning = true;
        updateBrewProgress(index);
        const pauseBtn = document.getElementById(`pause-brew-${index}`);
        if (pauseBtn) pauseBtn.textContent = 'Pause';
    } else {
        timer.pausedAt = performance.now() - timer.startTime;
        timer.isPaused = true;
        timer.isRunning = false;
        if (animationFrames[index]) cancelAnimationFrame(animationFrames[index]);
        const pauseBtn = document.getElementById(`pause-brew-${index}`);
        if (pauseBtn) pauseBtn.textContent = 'Resume';
    }
}

function resetBrewTimer(index) {
    const timer = brewTimers[index];
    if (!timer) return;

    timer.isRunning = false;
    if (animationFrames[index]) cancelAnimationFrame(animationFrames[index]);

    timer.steps.forEach((_, i) => {
        const bar = document.getElementById(`progress-bar-${index}-${i}`);
        if (bar) bar.style.width = '0%';
    });

    const display = document.getElementById(`brew-timer-display-${index}`);
    if (display) display.textContent = '00:00';

    const startBtn = document.getElementById(`start-brew-${index}`);
    const pauseBtn = document.getElementById(`pause-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) { startBtn.textContent = 'Start Brew'; startBtn.classList.remove('brewing'); startBtn.disabled = false; }
    if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.disabled = true; }
    if (resetBtn) resetBtn.disabled = true;

    delete brewTimers[index];
    delete animationFrames[index];
}

function updateBrewProgress(index) {
    const timer = brewTimers[index];
    if (!timer || !timer.isRunning) return;

    const elapsedMs = performance.now() - timer.startTime;
    const elapsedSeconds = elapsedMs / 1000;

    const display = document.getElementById(`brew-timer-display-${index}`);
    if (display) display.textContent = formatTime(Math.floor(elapsedSeconds));

    timer.steps.forEach((step, i) => {
        const bar = document.getElementById(`progress-bar-${index}-${i}`);
        if (!bar) return;

        let pct = 0;
        if (elapsedSeconds >= step.endSeconds) {
            pct = 100;
        } else if (elapsedSeconds > step.startSeconds) {
            pct = Math.min(100, ((elapsedSeconds - step.startSeconds) / step.duration) * 100);
        }
        bar.style.width = `${pct.toFixed(2)}%`;
    });

    animationFrames[index] = requestAnimationFrame(() => updateBrewProgress(index));
}

// ==========================================
// 8. FEEDBACK SYSTEM
// ==========================================

function selectFeedback(index, category, value) {
    const coffee = coffees[index];
    if (!coffee.feedback) coffee.feedback = {};
    coffee.feedback[category] = value;

    document.querySelectorAll(`[data-feedback="${index}-${category}"]`).forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });

    generateSuggestion(index);
    localStorage.setItem('coffees', JSON.stringify(coffees));
}

function generateSuggestion(index) {
    const coffee = coffees[index];
    const feedback = coffee.feedback || {};
    const suggestionDiv = document.getElementById(`suggestion-${index}`);
    if (!suggestionDiv) return;

    let suggestions = [];
    let grindOffsetDelta = 0;
    let newTemp = null;

    if (feedback.extraction === 'under') {
        suggestions.push('Coffee is underextracted - tastes sour/weak', '→ Grind finer', '→ Or increase temperature by 2°C');
        grindOffsetDelta += -5;
        newTemp = adjustTemp(coffee.customTemp || getDefaultTemp(coffee.process.toLowerCase()), +2);
    } else if (feedback.extraction === 'over') {
        suggestions.push('Coffee is overextracted - tastes bitter/harsh', '→ Grind coarser', '→ Or decrease temperature by 2°C');
        grindOffsetDelta += +5;
        newTemp = adjustTemp(coffee.customTemp || getDefaultTemp(coffee.process.toLowerCase()), -2);
    }

    if (feedback.taste === 'flat') {
        suggestions.push('Flavors not coming through clearly', '→ Increase temperature by 2°C');
        newTemp = adjustTemp(coffee.customTemp || getDefaultTemp(coffee.process.toLowerCase()), +2);
    } else if (feedback.taste === 'harsh') {
        suggestions.push('Taste is too harsh/aggressive', '→ Lower temperature by 2°C');
        newTemp = adjustTemp(coffee.customTemp || getDefaultTemp(coffee.process.toLowerCase()), -2);
    }

    if (feedback.body === 'thin') {
        suggestions.push('Body too thin/watery', '→ Grind slightly finer');
        grindOffsetDelta += -3;
    } else if (feedback.body === 'heavy') {
        suggestions.push('Body too heavy/muddy', '→ Grind slightly coarser');
        grindOffsetDelta += +3;
    }

    if (suggestions.length === 0 || feedback.extraction === 'perfect') {
        suggestionDiv.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-secondary);">✓ Perfect! No adjustments needed.</div>`;
        suggestionDiv.classList.remove('hidden');
        return;
    }

    // Preview what the grind would look like with the new offset
    const previewGrind = grindOffsetDelta !== 0
        ? getBrewRecommendations({ ...coffee, grindOffset: (coffee.grindOffset || 0) + grindOffsetDelta }).grindSetting
        : null;

    suggestionDiv.innerHTML = `
        <div class="suggestion-title">
            <svg style="width: 18px; height: 18px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                <path d="M9 18h6"></path><path d="M10 22h4"></path>
            </svg>
            Suggested Adjustments
        </div>
        <div class="suggestion-text">${suggestions.join('<br>')}</div>
        <div class="suggestion-values">
            ${previewGrind ? `<div class="suggestion-value"><strong>New Grind:</strong> ${previewGrind}</div>` : ''}
            ${newTemp ? `<div class="suggestion-value"><strong>New Temp:</strong> ${newTemp}</div>` : ''}
        </div>
        <button class="apply-suggestion-btn" onclick="applySuggestion(${index}, ${grindOffsetDelta}, '${newTemp}')">
            Apply These Settings
        </button>
    `;
    suggestionDiv.classList.remove('hidden');
}

function getDefaultTemp(processType) {
    const tempCoffee = { process: processType, altitude: '1500', cultivar: 'Unknown', origin: 'Unknown' };
    return getBrewRecommendations(tempCoffee).temperature;
}

function adjustTemp(current, change) {
    const match = current.match(/(\d+)(?:-(\d+))?/);
    if (!match) return current;
    const low = parseInt(match[1]) + change;
    const high = match[2] ? parseInt(match[2]) + change : null;
    return high ? `${low}-${high}°C` : `${low}°C`;
}

function applySuggestion(index, grindOffsetDelta, newTemp) {
    const coffee = coffees[index];
    if (grindOffsetDelta && grindOffsetDelta !== 0) {
        coffee.grindOffset = (coffee.grindOffset || 0) + grindOffsetDelta;
    }
    if (newTemp && newTemp !== 'null') coffee.customTemp = newTemp;
    coffee.feedback = {};
    saveCoffeesAndSync();
    renderCoffees(index);
}

// ==========================================
// 8b. INITIAL VALUES & MANUAL ADJUSTMENTS
// ==========================================

/**
 * Compute engine-default grind & temp for a coffee,
 * ignoring any custom overrides. This is the "pure" recommendation.
 */
function getInitialBrewValues(coffee) {
    const clone = { ...coffee };
    delete clone.customGrind;
    delete clone.grindOffset;
    delete clone.customTemp;
    const rec = getBrewRecommendations(clone);
    return { grind: rec.grindSetting, temp: rec.temperature };
}

/**
 * Ensure every coffee object has initialGrind and initialTemp.
 * Called once per card render – only writes if fields are missing.
 */
function ensureInitialValues(coffee) {
    if (!coffee.initialGrind || !coffee.initialTemp) {
        const initial = getInitialBrewValues(coffee);
        coffee.initialGrind = initial.grind;
        coffee.initialTemp = initial.temp;
    }
}

/**
 * Run migration on the entire coffees array.
 * Stamps initial values on any coffee that lacks them,
 * then persists once.
 */
function migrateCoffeesInitialValues() {
    let changed = false;
    coffees.forEach(coffee => {
        if (!coffee.initialGrind || !coffee.initialTemp) {
            ensureInitialValues(coffee);
            changed = true;
        }
    });
    if (changed) {
        localStorage.setItem('coffees', JSON.stringify(coffees));
    }
}

// ---- Manual +/− Buttons ----

function adjustGrindManual(index, direction) {
    const coffee = coffees[index];
    coffee.grindOffset = (coffee.grindOffset || 0) + direction;

    // Direct DOM update using recalculated value
    const el = document.getElementById(`grind-value-${index}`);
    if (el) el.textContent = getBrewRecommendations(coffee).grindSetting;
    saveCoffeesAndSync();
}

function adjustTempManual(index, direction) {
    const coffee = coffees[index];
    const currentTemp = coffee.customTemp || getBrewRecommendations(coffee).temperature;

    const match = currentTemp.match(/(\d+)(?:-(\d+))?/);
    if (!match) return;

    const low = parseInt(match[1]) + direction;
    const high = match[2] ? parseInt(match[2]) + direction : null;
    coffee.customTemp = high ? `${low}-${high}°C` : `${low}°C`;

    const el = document.getElementById(`temp-value-${index}`);
    if (el) el.textContent = coffee.customTemp;
    saveCoffeesAndSync();
}

// ---- Reset to Initial ----

function resetCoffeeAdjustments(index) {
    const coffee = coffees[index];

    // Recompute fresh engine defaults (respects current grinder & water)
    const initial = getInitialBrewValues(coffee);

    // Update the stored anchors to current engine state
    coffee.initialGrind = initial.grind;
    coffee.initialTemp = initial.temp;

    // Wipe all custom overrides
    delete coffee.customGrind;
    delete coffee.grindOffset;
    delete coffee.customTemp;
    delete coffee.feedback;

    // Direct DOM update – card stays open
    const grindEl = document.getElementById(`grind-value-${index}`);
    const tempEl = document.getElementById(`temp-value-${index}`);
    if (grindEl) grindEl.textContent = initial.grind;
    if (tempEl) tempEl.textContent = initial.temp;

    // Clear feedback visual state
    document.querySelectorAll(`[data-feedback^="${index}-"]`).forEach(opt => {
        opt.classList.remove('selected');
    });

    // Hide suggestion box
    const suggestionEl = document.getElementById(`suggestion-${index}`);
    if (suggestionEl) {
        suggestionEl.innerHTML = '';
        suggestionEl.classList.add('hidden');
    }

    saveCoffeesAndSync();
}

// ==========================================
// 9. COFFEE CARD RENDERING
// ==========================================

function renderCoffeeCard(coffee, index) {
    ensureInitialValues(coffee);
    const brewParams = getBrewRecommendations(coffee);
    const amount = coffee.customAmount || coffeeAmount;

    return `
        <div class="coffee-card" data-original-index="${index}">
            <div class="coffee-header">
                <div>
                    <div class="coffee-name">${coffee.name}</div>
                    <div class="coffee-origin">${coffee.origin}</div>
                </div>
                <button class="favorite-btn ${coffee.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${index});">
                    <svg class="star-icon" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteCoffee(${index});">
                    <svg class="delete-icon" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
            
            <div class="process-freshness-row">
                <div class="coffee-process-small">${coffee.process}</div>
                <div class="freshness-badge-inline" id="freshness-badge-${index}">
                    ${getRoastFreshnessBadge(coffee.roastDate)}
                </div>
            </div>
            
            <div class="brew-params">
                <div class="roast-date-section">
                    <div class="roast-date-input-wrapper">
                        <svg class="roast-icon" viewBox="0 0 24 24">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                        </svg>
                        <span class="roast-label">Roast Date</span>
                        <input type="date" id="roastDate-${index}" class="roast-date-input"
                            value="${coffee.roastDate || ''}"
                            onchange="updateRoastDate(${index}, this.value); event.stopPropagation();"
                            onclick="event.stopPropagation();" />
                    </div>
                </div>
                
                <div class="ratio-control">
                    <h4 id="amount-header-${index}">Coffee Amount – Ratio 1:${brewParams.ratioNumber}</h4>
                    <div class="ratio-slider">
                        <div class="ratio-value-display">
                            <span class="ratio-value" id="ratioValue-${index}">${amount}g</span>
                        </div>
                        <div class="slider-track">
                            <span>10g</span>
                            <input type="range" min="10" max="30" value="${amount}" 
                                oninput="updateCoffeeAmountLive(this.value, ${index}); event.stopPropagation();" 
                                onmousedown="event.stopPropagation();"
                                ontouchstart="event.stopPropagation();"
                                onclick="event.stopPropagation();">
                            <span>30g</span>
                        </div>
                    </div>
                </div>
                
                <div class="param-grid">
                    <div class="param-box">
                        <div class="param-label">${brewParams.grinderLabel}</div>
                        <div class="param-value-row">
                            <div class="param-value" id="grind-value-${index}">${brewParams.grindSetting}</div>
                            <div class="param-adjust">
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustGrindManual(${index}, 1);">+</button>
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustGrindManual(${index}, -1);">−</button>
                            </div>
                        </div>
                    </div>
                    <div class="param-box">
                        <div class="param-label">Temperature</div>
                        <div class="param-value-row">
                            <div class="param-value" id="temp-value-${index}">${brewParams.temperature}</div>
                            <div class="param-adjust">
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustTempManual(${index}, 1);">+</button>
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustTempManual(${index}, -1);">−</button>
                            </div>
                        </div>
                    </div>
                    <div class="param-box">
                        <div class="param-label">Water</div>
                        <div class="param-value" id="water-value-${index}">${brewParams.waterAmountMl}ml</div>
                    </div>
                    <div class="param-box">
                        <div class="param-label">Target Time</div>
                        <div class="param-value">${brewParams.targetTime}</div>
                    </div>
                </div>
                
                <div class="brew-timer-section">
                    <div class="timer-display" id="brew-timer-display-${index}">00:00</div>
                    <div class="timer-controls-main">
                        <button class="timer-btn start-brew" id="start-brew-${index}" onclick="event.stopPropagation(); startBrewTimer(${index});">
                            <img src="v60-icon.png" class="v60-icon" alt="V60">
                            Start Brew
                        </button>
                    </div>
                    <div class="timer-controls-secondary">
                        <button class="timer-btn timer-btn-secondary" id="pause-brew-${index}" onclick="event.stopPropagation(); pauseBrewTimer(${index});" disabled>Pause</button>
                        <button class="timer-btn timer-btn-secondary" id="reset-brew-${index}" onclick="event.stopPropagation(); resetBrewTimer(${index});" disabled>Reset</button>
                    </div>
                </div>
                
                <div class="brew-steps">
                    <h4>V60 Pour-Over Steps</h4>
                    ${brewParams.steps.map((step, stepIndex) => `
                        <div class="step">
                            <div class="step-time">${step.time}</div>
                            <div class="step-action">${boldWeights(step.action)}</div>
                            <div class="step-progress">
                                <div class="step-progress-bar" id="progress-bar-${index}-${stepIndex}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="feedback-section">
                    <h4>Brew Feedback</h4>
                    <div class="feedback-group">
                        <div class="feedback-label">Extraction</div>
                        <div class="feedback-scale">
                            ${['under', 'perfect', 'over'].map(v => `
                                <div class="scale-option ${coffee.feedback?.extraction === v ? 'selected' : ''}" 
                                     data-feedback="${index}-extraction" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'extraction', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-group">
                        <div class="feedback-label">Taste Clarity</div>
                        <div class="feedback-scale">
                            ${['flat', 'good', 'perfect', 'harsh'].map(v => `
                                <div class="scale-option ${coffee.feedback?.taste === v ? 'selected' : ''}" 
                                     data-feedback="${index}-taste" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'taste', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-group">
                        <div class="feedback-label">Body</div>
                        <div class="feedback-scale">
                            ${['thin', 'balanced', 'heavy'].map(v => `
                                <div class="scale-option ${coffee.feedback?.body === v ? 'selected' : ''}" 
                                     data-feedback="${index}-body" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'body', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-suggestion hidden" id="suggestion-${index}"></div>
                    <button class="reset-adjustments-btn" onclick="event.stopPropagation(); resetCoffeeAdjustments(${index});">Reset Adjustments</button>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px; font-size: 0.9rem;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <svg style="width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                            <path d="M9 18h6"></path><path d="M10 22h4"></path>
                        </svg>
                        <div>
                            <strong style="color: var(--accent); display: block; margin-bottom: 6px;">Tip:</strong>
                            <span style="color: var(--text-secondary); line-height: 1.5;">${brewParams.notes}</span>
                        </div>
                    </div>
                </div>
                
                ${coffee.cultivar && coffee.cultivar !== 'Unknown' ? `
                <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                    <strong>Variety:</strong> ${coffee.cultivar} | <strong>Altitude:</strong> ${coffee.altitude} masl
                </div>` : ''}
                
                <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                    <strong>Tasting Notes:</strong> ${coffee.tastingNotes}
                </div>
            </div>
        </div>
    `;
}

// ==========================================
// 10. COFFEE LIST RENDERING & SORTING
// ==========================================

function renderCoffees(expandAfterIndex) {
    const listEl = document.getElementById('coffeeList');
    const emptyState = document.getElementById('emptyState');

    // Filter: only non-deleted cards
    const activeCoffees = coffees
        .map((coffee, originalIndex) => ({ coffee, originalIndex }))
        .filter(item => item.coffee.deleted !== true);

    if (activeCoffees.length === 0) {
        listEl.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Sort: favorites first (newest favorited first), then by added date
    const sorted = activeCoffees.sort((a, b) => {
        const aFav = a.coffee.favorite === true;
        const bFav = b.coffee.favorite === true;

        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;

        if (aFav && bFav) {
            return new Date(b.coffee.favoritedAt || 0).getTime() - new Date(a.coffee.favoritedAt || 0).getTime();
        }

        return new Date(b.coffee.addedDate || 0).getTime() - new Date(a.coffee.addedDate || 0).getTime();
    });

    listEl.innerHTML = sorted.map(item => renderCoffeeCard(item.coffee, item.originalIndex)).join('');

    // Re-expand card if requested (e.g. after reset adjustments)
    if (expandAfterIndex !== undefined) {
        const card = document.querySelector(`.coffee-card[data-original-index="${expandAfterIndex}"]`);
        if (card) card.classList.add('expanded');
    }

    // Card expand/collapse listeners
    document.querySelectorAll('.coffee-card').forEach(card => {
        card.addEventListener('click', function (e) {
            if (e.target.closest('.delete-btn, .favorite-btn, .timer-btn, .scale-option, .apply-suggestion-btn, .adjust-btn, .reset-adjustments-btn, input[type="range"], input[type="date"]')) return;
            document.querySelectorAll('.coffee-card').forEach(c => { if (c !== this) c.classList.remove('expanded'); });
            this.classList.toggle('expanded');
        });
    });
}

// ==========================================
// 11. DELETE / RESTORE / FAVORITE
// ==========================================

function deleteCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    if (confirm('Move this coffee to Compost?')) {
        coffees[originalIndex].deleted = true;
        coffees[originalIndex].deletedAt = new Date().toISOString();
        saveCoffeesAndSync();
        renderCoffees();
    }
}

function restoreCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    coffees[originalIndex].deleted = false;
    delete coffees[originalIndex].deletedAt;
    saveCoffeesAndSync();
    renderDecafList();
    renderCoffees();
}

function permanentDeleteCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    if (confirm('Permanently delete this coffee? This cannot be undone.')) {
        coffees.splice(originalIndex, 1);
        saveCoffeesAndSync();
        renderDecafList();
    }
}

function toggleFavorite(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    const coffee = coffees[originalIndex];
    coffee.favorite = !coffee.favorite;

    if (coffee.favorite) {
        coffee.favoritedAt = new Date().toISOString();
    } else {
        delete coffee.favoritedAt;
    }

    saveCoffeesAndSync();
    renderCoffees();
}

/** Central save + backend sync helper */
function saveCoffeesAndSync() {
    localStorage.setItem('coffees', JSON.stringify(coffees));
    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncCoffeesToBackend) {
        window.backendSync.syncCoffeesToBackend(coffees);
    }
}

// ==========================================
// 12. COFFEE AMOUNT SLIDER
// ==========================================

function updateCoffeeAmountLive(value, originalIndex) {
    const amount = parseInt(value);
    coffees[originalIndex].customAmount = amount;

    const valueDisplay = document.getElementById(`ratioValue-${originalIndex}`);
    if (valueDisplay) valueDisplay.textContent = amount + 'g';

    const brewParams = getBrewRecommendations(coffees[originalIndex]);

    // Update header with new ratio
    const headerEl = document.getElementById(`amount-header-${originalIndex}`);
    if (headerEl) headerEl.textContent = `Coffee Amount – Ratio 1:${brewParams.ratioNumber}`;

    // Update water value
    const waterEl = document.getElementById(`water-value-${originalIndex}`);
    if (waterEl) waterEl.textContent = `${brewParams.waterAmountMl}ml`;

    // Update brew steps
    const expandedCard = document.querySelector(`.coffee-card[data-original-index="${originalIndex}"]`);
    if (expandedCard && expandedCard.classList.contains('expanded')) {
        const steps = expandedCard.querySelectorAll('.step');
        brewParams.steps.forEach((step, i) => {
            if (steps[i]) steps[i].querySelector('.step-action').textContent = step.action;
        });
    }

    localStorage.setItem('coffees', JSON.stringify(coffees));
}

// ==========================================
// 13. IMAGE HANDLING & AI ANALYSIS
// ==========================================

async function compressImage(file, maxSizeMB = 4.0) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                const maxDim = 1920;

                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = (height / width) * maxDim; width = maxDim; }
                    else { width = (width / height) * maxDim; height = maxDim; }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.85;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                let attempts = 0;
                const targetSize = maxSizeMB * 1024 * 1024 * 1.37;
                let consecutiveResets = 0;

                while (dataUrl.length > targetSize && attempts < 10) {
                    quality -= 0.08;
                    if (quality < 0.4 && attempts > 5) {
                        consecutiveResets++;
                        if (consecutiveResets > 2) break;
                        width = Math.floor(width * 0.85);
                        height = Math.floor(height * 0.85);
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        quality = 0.7;
                    }
                    dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.1, quality));
                    attempts++;
                }

                if (dataUrl.length > targetSize) {
                    canvas.width = Math.floor(width * 0.7);
                    canvas.height = Math.floor(height * 0.7);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                }

                resolve({ dataUrl, base64: dataUrl.split(',')[1], type: 'image/jpeg', originalSize: file.size, compressedSize: Math.round(dataUrl.length * 0.75) });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function analyzeCoffeeImage(imageData, mediaType) {
    if (!CONFIG.backendUrl) throw new Error('Backend URL not configured. Please enter it in settings.');

    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('deviceId');
    if (!token || !deviceId) throw new Error('Device not activated. Please enter your access code in Settings (⚙️).');

    const response = await fetch(`${CONFIG.backendUrl}/api/analyze-coffee`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Device-ID': deviceId
        },
        body: JSON.stringify({ imageData, mediaType }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis error');
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Analysis failed');
    return result.data;
}

async function processImageUpload(file, uploadBtn) {
    const preview = document.getElementById('imagePreview');
    const loadingEl = document.getElementById('loadingMessage');
    const cameraBtn = document.getElementById('cameraBtn');

    loadingEl.classList.remove('hidden');
    cameraBtn.disabled = true;
    if (uploadBtn) uploadBtn.disabled = true;

    try {
        const previewReader = new FileReader();
        previewReader.onload = (event) => { preview.src = event.target.result; preview.style.display = 'block'; };
        previewReader.readAsDataURL(file);

        const fileSizeMB = file.size / (1024 * 1024);
        let imageData, mediaType;

        if (fileSizeMB > 4.0) {
            showMessage('info', `Compressing image (${fileSizeMB.toFixed(1)}MB → smaller)...`);
            const compressed = await compressImage(file);
            imageData = compressed.base64;
            mediaType = compressed.type;
        } else {
            imageData = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result.split(',')[1]);
                r.onerror = reject;
                r.readAsDataURL(file);
            });
            mediaType = file.type;
        }

        const coffeeInfo = await analyzeCoffeeImage(imageData, mediaType);
        coffees.unshift(coffeeInfo);
        saveCoffeesAndSync();
        renderCoffees();
        showMessage('success', '✓ Coffee added successfully!');
        preview.style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        showMessage('error', error.message || 'Failed to process image');
    } finally {
        loadingEl.classList.add('hidden');
        cameraBtn.disabled = false;
        if (uploadBtn) uploadBtn.disabled = false;
    }
}

// ==========================================
// 14. MANUAL ENTRY
// ==========================================

async function saveCoffeeManual() {
    const name = document.getElementById('name').value.trim();
    const origin = document.getElementById('origin').value.trim();
    const process = document.getElementById('process').value;
    const cultivar = document.getElementById('cultivar').value.trim();
    const altitude = document.getElementById('altitude').value.trim();
    const roaster = document.getElementById('roaster').value.trim();
    const tastingNotes = document.getElementById('tastingNotes').value.trim();

    if (!name || !origin || !process) {
        alert('Please fill in at least Name, Origin and Processing Method.');
        return;
    }

    coffees.unshift({
        name, origin, process,
        cultivar: cultivar || 'Unknown',
        altitude: altitude || '1500',
        roaster: roaster || 'Unknown',
        tastingNotes: tastingNotes || 'No notes',
        addedDate: new Date().toISOString()
    });

    saveCoffeesAndSync();

    // Clear form
    ['name', 'origin', 'process', 'cultivar', 'altitude', 'roaster', 'tastingNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    document.querySelector('.manual-section')?.classList.add('hidden');
    renderCoffees();
    showMessage('success', '✓ Coffee added successfully!');
}

// ==========================================
// 15. MESSAGES
// ==========================================

function showMessage(type, message) {
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');

    if (type === 'error') {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        successEl.classList.add('hidden');
    } else if (type === 'info') {
        successEl.textContent = '⏳ ' + message;
        successEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
    } else {
        successEl.textContent = message;
        successEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
    }

    if (type !== 'info') {
        setTimeout(() => { errorEl.classList.add('hidden'); successEl.classList.add('hidden'); }, 5000);
    }
}

// ==========================================
// 16. WATER HARDNESS
// ==========================================

/**
 * Get the active water hardness value (manual overrides API)
 */
function getActiveWaterHardness() {
    return manualWaterHardness || apiWaterHardness;
}

/**
 * Get category for a given hardness value
 */
function getWaterHardnessCategory(value) {
    if (value < 7) return 'very_soft';
    if (value < 14) return 'soft';
    if (value < 21) return 'medium';
    if (value < 28) return 'hard';
    return 'very_hard';
}

function openWaterModal() {
    document.getElementById('waterModal').classList.add('active');
    document.getElementById('zipCodeInput').value = userZipCode;
    
    // Load manual hardness value if exists
    const manualInput = document.getElementById('manualHardnessInput');
    if (manualWaterHardness) {
        manualInput.value = manualWaterHardness.value;
    } else {
        manualInput.value = '';
    }
    
    // Display current active hardness
    const activeHardness = getActiveWaterHardness();
    if (activeHardness) {
        displayWaterHardness(activeHardness, manualWaterHardness ? 'manual' : 'api');
    }
}

function closeWaterModal() {
    document.getElementById('waterModal').classList.remove('active');
}

function displayWaterHardness(hardness, source = 'api') {
    const categoryMap = {
        'very_soft': 'SEHR WEICH',
        'soft': 'WEICH',
        'medium': 'MITTEL',
        'hard': 'HART',
        'very_hard': 'SEHR HART'
    };
    
    const category = hardness.category || getWaterHardnessCategory(hardness.value);
    const categoryText = hardness.category_de ? hardness.category_de.toUpperCase() : categoryMap[category];
    
    document.getElementById('hardnessValueDisplay').textContent = `${hardness.value} °dH`;
    document.getElementById('hardnessCategoryDisplay').textContent = categoryText;
    
    // Display source badge
    const sourceDisplay = document.getElementById('hardnessSourceDisplay');
    if (source === 'manual') {
        sourceDisplay.textContent = '✏️ MANUAL OVERRIDE';
        sourceDisplay.style.background = 'rgba(76, 175, 80, 0.15)';
        sourceDisplay.style.color = '#4CAF50';
    } else {
        sourceDisplay.textContent = '📍 AUTO-DETECTED';
        sourceDisplay.style.background = 'rgba(212, 165, 116, 0.15)';
        sourceDisplay.style.color = 'var(--accent)';
    }
    
    document.getElementById('hardnessRegion').textContent = hardness.region || 'Manual Entry';
    document.getElementById('hardnessSource').textContent = hardness.source || 'User Input';
    document.getElementById('hardnessDescriptionDisplay').textContent = 
        hardness.description || getHardnessDescription(category);
    document.getElementById('waterHardnessDisplay').style.display = 'block';
}

function getHardnessDescription(category) {
    const descriptions = {
        'very_soft': 'Sehr weiches Wasser - feinerer Mahlgrad und höhere Temperatur empfohlen',
        'soft': 'Weiches Wasser - leicht feinerer Mahlgrad empfohlen',
        'medium': 'Mittelhartes Wasser - Standard-Einstellungen funktionieren gut',
        'hard': 'Hartes Wasser - gröberer Mahlgrad und niedrigere Temperatur empfohlen',
        'very_hard': 'Sehr hartes Wasser - deutlich gröberer Mahlgrad, Filterung empfohlen'
    };
    return descriptions[category] || '';
}

async function saveWaterHardness() {
    const zipCode = document.getElementById('zipCodeInput').value.trim();

    if (!zipCode) { alert('Please enter a postal code.'); return; }
    if (!/^\d{5}$/.test(zipCode)) { alert('Please enter a valid 5-digit postal code.'); return; }
    if (typeof WaterHardness === 'undefined') { alert('Water hardness module not loaded. Please reload the page.'); return; }

    try {
        const hardness = await WaterHardness.getHardness(zipCode);
        apiWaterHardness = hardness;
        userZipCode = zipCode;
        localStorage.setItem('userZipCode', zipCode);
        
        // Only update active hardness if no manual override exists
        if (!manualWaterHardness) {
            waterHardness = apiWaterHardness;
            displayWaterHardness(hardness, 'api');
        } else {
            // Show API value but indicate manual is active
            displayWaterHardness(manualWaterHardness, 'manual');
            alert('Note: Manual water hardness override is active. ZIP-based value saved as fallback.');
        }

        const waterBtn = document.getElementById('waterControlBtn');
        if (waterBtn) waterBtn.classList.add('active');

        renderCoffees();
    } catch (error) {
        alert(`Error loading water hardness:\n${error.message}`);
    }
}

async function saveManualWaterHardness() {
    const manualInput = document.getElementById('manualHardnessInput');
    const value = parseFloat(manualInput.value);
    
    if (!value || value < 0 || value > 50) {
        alert('Please enter a valid water hardness value between 0 and 50 °dH.');
        return;
    }
    
    // Create manual hardness object
    manualWaterHardness = {
        value: value,
        category: getWaterHardnessCategory(value),
        region: 'Manual Entry',
        source: 'User Input',
        isManual: true
    };
    
    // Save to localStorage
    localStorage.setItem('manualWaterHardness', JSON.stringify(manualWaterHardness));
    
    // Set as active hardness
    waterHardness = manualWaterHardness;
    
    // Display updated value
    displayWaterHardness(manualWaterHardness, 'manual');
    
    // Sync to backend
    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncWaterHardness) {
        await window.backendSync.syncWaterHardness(value);
    }
    
    // Update UI
    const waterBtn = document.getElementById('waterControlBtn');
    if (waterBtn) waterBtn.classList.add('active');
    
    renderCoffees();
    
    alert(`✓ Manual water hardness saved: ${value} °dH\n\nYour brew parameters have been adjusted.`);
}

function clearManualWaterHardness() {
    manualWaterHardness = null;
    localStorage.removeItem('manualWaterHardness');
    
    // Fallback to API value if available
    waterHardness = apiWaterHardness;
    
    if (apiWaterHardness) {
        displayWaterHardness(apiWaterHardness, 'api');
    }
    
    renderCoffees();
}

// ==========================================
// 17. SETTINGS & DEVICE ACTIVATION
// ==========================================

function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    const token = localStorage.getItem('token');
    const statusDiv = document.getElementById('activationStatus');

    if (token) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(40, 167, 69, 0.1)';
        statusDiv.style.border = '1px solid rgba(40, 167, 69, 0.3)';
        statusDiv.style.color = '#5fda7d';
        statusDiv.innerHTML = '✅ Device already activated';
    } else {
        statusDiv.style.display = 'none';
    }
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function showActivationError(message) {
    const statusDiv = document.getElementById('activationStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(220, 53, 69, 0.1)';
    statusDiv.style.border = '1px solid rgba(220, 53, 69, 0.3)';
    statusDiv.style.color = '#ff6b7a';
    statusDiv.innerHTML = '❌ ' + message;
}

async function activateDevice() {
    const accessCode = document.getElementById('accessCodeInput').value.trim();
    const statusDiv = document.getElementById('activationStatus');

    if (!accessCode) { showActivationError('Please enter an access code'); return; }

    const getOrCreateDeviceId = () => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            const fingerprint = [
                navigator.userAgent, navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                navigator.hardwareConcurrency || 'unknown'
            ].join('|');
            deviceId = 'device-' + btoa(fingerprint).substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    };

    try {
        const deviceId = getOrCreateDeviceId();
        const response = await fetch(`${CONFIG.backendUrl}/api/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${accessCode}`,
                'X-Device-ID': deviceId
            }
        });

        if (!response.ok) {
            const error = await response.json();
            showActivationError(error.error || 'Token validation failed');
            return;
        }

        const data = await response.json();

        if (data.valid) {
            localStorage.setItem('token', accessCode);
            localStorage.setItem('deviceId', deviceId);

            statusDiv.style.display = 'block';
            statusDiv.style.background = 'rgba(40, 167, 69, 0.1)';
            statusDiv.style.border = '1px solid rgba(40, 167, 69, 0.3)';
            statusDiv.style.color = '#5fda7d';
            statusDiv.innerHTML = '✅ Success! Device linked.<br>You can now use all features.';

            if (typeof initBackendSync === 'function') await initBackendSync();
            setTimeout(() => { closeSettings(); location.reload(); }, 2000);
        } else {
            showActivationError(data.error || 'Invalid access code');
        }
    } catch (error) {
        showActivationError(error.message || 'Activation failed');
    }
}

// ==========================================
// 18. DECAF (TRASH BIN) MODAL
// ==========================================

function openDecafModal() {
    renderDecafList();
    document.getElementById('decafModal').classList.add('active');
}

function closeDecafModal() {
    document.getElementById('decafModal').classList.remove('active');
}

function renderDecafList() {
    const decafListEl = document.getElementById('decafList');
    const decafEmptyEl = document.getElementById('decafEmpty');

    const deletedCoffees = coffees
        .map((coffee, index) => ({ coffee, index }))
        .filter(item => item.coffee.deleted === true);

    if (deletedCoffees.length === 0) {
        decafListEl.innerHTML = '';
        decafEmptyEl.style.display = 'block';
        return;
    }

    decafEmptyEl.style.display = 'none';

    const sorted = deletedCoffees.sort((a, b) => {
        return new Date(b.coffee.deletedAt || 0).getTime() - new Date(a.coffee.deletedAt || 0).getTime();
    });

    decafListEl.innerHTML = sorted.map(item => `
        <div class="decaf-card">
            <div class="decaf-card-info">
                <div class="decaf-card-name">${item.coffee.name}</div>
                <div class="decaf-card-origin">${item.coffee.origin}</div>
            </div>
            <div class="decaf-card-actions">
                <button class="restore-btn" onclick="restoreCoffee(${item.index})">Restore</button>
                <button class="permanent-delete-btn" onclick="permanentDeleteCoffee(${item.index})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// 19. EVENT LISTENERS
// ==========================================

function initEventListeners() {
    // Camera & Upload
    document.getElementById('cameraBtn').addEventListener('click', () => document.getElementById('imageInput').click());
    document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('uploadInput').click());

    document.getElementById('imageInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await processImageUpload(file, null);
        e.target.value = '';
    });

    document.getElementById('uploadInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        await processImageUpload(file, document.getElementById('uploadBtn'));
        e.target.value = '';
    });

    // Manual entry
    document.getElementById('manualBtn').addEventListener('click', toggleManual);
    document.getElementById('saveManualBtn').addEventListener('click', saveCoffeeManual);

    // Theme toggle
    document.getElementById('themeToggleBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleTheme(); });

    // Water hardness
    document.getElementById('waterControlBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openWaterModal(); });
    document.getElementById('closeWaterBtn').addEventListener('click', closeWaterModal);
    document.getElementById('saveWaterBtn').addEventListener('click', saveWaterHardness);
    document.getElementById('saveManualHardnessBtn').addEventListener('click', saveManualWaterHardness);

    // Trash bin / Decaf
    document.getElementById('trashBinBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDecafModal(); });
    document.getElementById('closeDecafBtn').addEventListener('click', closeDecafModal);

    // Settings
    document.getElementById('settingsBtnControl').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openSettings(); });
    document.getElementById('closeSettingsBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeSettings(); });
    document.getElementById('activateDeviceBtn').addEventListener('click', () => { activateDevice().catch(err => { console.error('Activation error:', err); showActivationError(err.message); }); });

    // Modal backdrop close
    document.getElementById('settingsModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSettings(); });
    document.getElementById('decafModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDecafModal(); });
    document.getElementById('waterModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeWaterModal(); });
}

// ==========================================
// 20. INITIALIZATION
// ==========================================

function initApp() {
    // Migrate existing coffees: stamp initialGrind/initialTemp
    migrateCoffeesInitialValues();

    // Load water hardness with priority: manual > API
    if (manualWaterHardness) {
        // Manual override exists - use it
        waterHardness = manualWaterHardness;
        const waterBtn = document.getElementById('waterControlBtn');
        if (waterBtn) waterBtn.classList.add('active');
    } else if (userZipCode && typeof WaterHardness !== 'undefined') {
        // No manual override - load from ZIP
        WaterHardness.getHardness(userZipCode).then(data => {
            apiWaterHardness = data;
            waterHardness = apiWaterHardness;
            const waterBtn = document.getElementById('waterControlBtn');
            if (waterBtn) waterBtn.classList.add('active');
        }).catch(err => console.log('Could not load water hardness:', err));
    }

    // Render coffee list
    renderCoffees();

    // Init global grinder selector
    initGlobalGrinder();

    // Bind all event listeners
    initEventListeners();
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
