// ==========================================
// FEEDBACK SYSTEM V6.0
// Cupping-inspired proportional adjustment logic
// ==========================================

import { coffees, saveCoffeesAndSync, sanitizeHTML } from './state.js';
import { getBrewRecommendations } from './brew-engine.js';

const suggestionHideTimers = new Map();
const feedbackTouchState = new WeakMap();
let feedbackSliderEventsBound = false;

// --- NEU: Proportionale Gewichtung ---
/**
 * Calculates the weight of deviation (0.0 to 1.0)
 * 50% = 0.0 weight
 * 40-60% = deadzone (no reaction)
 * 0/100% = full intensity
 */
function getFeedbackWeight(value) {
    const numeric = Number(value);
    const distanceFromCenter = Math.abs(numeric - 50);
    const deadZone = 10; 
    
    if (distanceFromCenter <= deadZone) return 0;
    return (distanceFromCenter - deadZone) / (50 - deadZone);
}

function sliderValueToFeedback(value) {
    const numeric = Number(value);
    if (numeric < 40) return 'low';
    if (numeric > 60) return 'high';
    return 'balanced';
}

function feedbackToSliderValue(value) {
    if (value === 'low') return '0';
    if (value === 'high') return '100';
    return '50';
}
// -------------------------------------

export function initFeedbackSliderInteractions() {
    if (feedbackSliderEventsBound) return;
    feedbackSliderEventsBound = true;

    document.addEventListener('click', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (slider) event.stopPropagation();
    });

    // --- Unified input handler (works for both drag and tap-to-position) ---
    document.addEventListener('input', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (!slider) return;

        event.stopPropagation();

        // If a vertical scroll was detected, block updates
        const state = feedbackTouchState.get(slider);
        if (state?.cancelled) return;

        const [index, category] = String(slider.dataset.feedbackSlider || '').split('-');
        if (index === undefined || !category) return;
        updateSliderVisual(slider);
        updateFeedbackSlider(Number(index), category, slider.value);
    });

    document.addEventListener('change', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (!slider) return;

        event.stopPropagation();

        const state = feedbackTouchState.get(slider);
        if (state?.cancelled) return;

        const [index, category] = String(slider.dataset.feedbackSlider || '').split('-');
        if (index === undefined || !category) return;
        updateSliderVisual(slider);
        updateFeedbackSlider(Number(index), category, slider.value);
    });

    // --- Touch handling: only detect vertical scroll to cancel ---
    // The browser handles horizontal slider movement natively.
    // We only intervene to revert if the user is clearly scrolling vertically.
    document.addEventListener('touchstart', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (!slider) return;

        feedbackTouchState.set(slider, {
            startX: event.touches[0].clientX,
            startY: event.touches[0].clientY,
            startValue: slider.value,
            cancelled: false,
            decided: false
        });
    }, { passive: true });

    document.addEventListener('touchmove', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (!slider) return;

        const state = feedbackTouchState.get(slider);
        if (!state || state.decided) return;

        const deltaY = Math.abs(event.touches[0].clientY - state.startY);
        const deltaX = Math.abs(event.touches[0].clientX - state.startX);

        // First significant movement decides: vertical = cancel slider, horizontal = let it through
        if (deltaY > 12 && deltaY > deltaX) {
            state.cancelled = true;
            state.decided = true;
            slider.value = state.startValue;
            updateSliderVisual(slider);
        } else if (deltaX > 8) {
            state.decided = true; // horizontal — let browser handle the slider natively
        }
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (!slider) return;

        const state = feedbackTouchState.get(slider);
        if (state?.cancelled) {
            slider.value = state.startValue;
            updateSliderVisual(slider);
        }
        feedbackTouchState.delete(slider);
    });

    document.addEventListener('touchcancel', (event) => {
        const slider = event.target.closest('.feedback-slider');
        if (!slider) return;
        const state = feedbackTouchState.get(slider);
        if (state) {
            slider.value = state.startValue;
            updateSliderVisual(slider);
        }
        feedbackTouchState.delete(slider);
    });
}

function sliderProgressPercent(sliderEl) {
    const min = Number(sliderEl.min || 0);
    const max = Number(sliderEl.max || 100);
    const value = Number(sliderEl.value || min);
    const ratio = (value - min) / (max - min || 1);
    return Math.min(100, Math.max(0, ratio * 100));
}

function updateSliderVisual(sliderEl) {
    if (!sliderEl) return;
    sliderEl.style.setProperty('--feedback-progress', `${sliderProgressPercent(sliderEl)}%`);
}

export function initFeedbackSliderVisuals(root = document) {
    root.querySelectorAll('.feedback-slider').forEach(updateSliderVisual);
}

function showResetAdjustmentsConfirmModal() {
    const modal = document.getElementById('resetAdjustmentsConfirmModal');
    const confirmBtn = document.getElementById('confirmResetAdjustmentsConfirmBtn');
    const cancelBtn = document.getElementById('cancelResetAdjustmentsConfirmBtn');
    const closeBtn = document.getElementById('closeResetAdjustmentsConfirmBtn');

    if (!modal || !confirmBtn || !cancelBtn || !closeBtn) {
        return Promise.resolve(confirm("Reset this coffee's tuning?"));
    }

    modal.classList.add('active');

    return new Promise(resolve => {
        let resolved = false;

        const cleanup = (result) => {
            if (resolved) return;
            resolved = true;
            modal.classList.remove('active');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            closeBtn.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdrop);
            resolve(result);
        };

        const onConfirm = () => cleanup(true);
        const onCancel = () => cleanup(false);
        const onBackdrop = (e) => {
            if (e.target === modal) onCancel();
        };

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
        closeBtn.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdrop);
    });
}

function clearSuggestionHideTimer(index) {
    const existing = suggestionHideTimers.get(index);
    if (existing) {
        clearTimeout(existing);
        suggestionHideTimers.delete(index);
    }
}

export function updateFeedbackSlider(index, category, sliderValue) {
    const coffee = coffees[index];
    if (!coffee.feedback) coffee.feedback = {};
    
    // Wir speichern jetzt den genauen Zahlenwert für die Berechnungen
    coffee.feedback[category] = sliderValue;

    const valueState = sliderValueToFeedback(sliderValue);
    document.querySelectorAll(`[data-feedback="${index}-${category}"]`).forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === valueState);
    });

    generateSuggestion(index);
    localStorage.setItem('coffees', JSON.stringify(coffees));
}

export function snapFeedbackSlider(index, category, sliderEl) {
    if (!sliderEl) return;
    const snappedValue = feedbackToSliderValue(sliderValueToFeedback(sliderEl.value));
    sliderEl.value = snappedValue;
    updateSliderVisual(sliderEl);
    updateFeedbackSlider(index, category, snappedValue);
}

export function selectFeedback(index, category, value, syncSlider = true) {
    const coffee = coffees[index];
    if (!coffee.feedback) coffee.feedback = {};

    const previousValue = coffee.feedback[category];
    const numericValue = feedbackToSliderValue(value);
    coffee.feedback[category] = numericValue;

    document.querySelectorAll(`[data-feedback="${index}-${category}"]`).forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });

    const sliderEl = document.querySelector(`[data-feedback-slider="${index}-${category}"]`);
    if (sliderEl && syncSlider) {
        sliderEl.classList.add('no-transition');
        sliderEl.value = numericValue;
        updateSliderVisual(sliderEl);
        requestAnimationFrame(() => requestAnimationFrame(() => sliderEl.classList.remove('no-transition')));
    }

    if (previousValue === numericValue) return;

    generateSuggestion(index);
    localStorage.setItem('coffees', JSON.stringify(coffees));
}

// ==========================================
// CORE LOGIC: PROPORTIONAL SUGGESTIONS
// ==========================================
function generateSuggestion(index) {
    const coffee = coffees[index];
    const feedback = coffee.feedback || {};
    const suggestionDiv = document.getElementById(`suggestion-${index}`);
    if (!suggestionDiv) return;

    clearSuggestionHideTimer(index);

    let totalGrindImpact = 0;
    let totalTempImpact = 0;
    let activeInputs = 0;

    const categories = ['bitterness', 'sweetness', 'acidity', 'body'];
    categories.forEach(key => {
        const val = feedback[key] !== undefined ? Number(feedback[key]) : 50;
        if (val !== 50) activeInputs++;
    });

    if (activeInputs === 0) {
        suggestionDiv.innerHTML = '';
        suggestionDiv.classList.add('hidden');
        return;
    }

    // 1. Calculate Net-Impact (Mathematical balancing)
    const bVal = feedback.bitterness !== undefined ? Number(feedback.bitterness) : 50;
    const bWeight = getFeedbackWeight(bVal);
    if (bVal > 50) { totalGrindImpact += (5 * bWeight); totalTempImpact -= (2 * bWeight); }
    else if (bVal < 50) { totalGrindImpact -= (2 * bWeight); }

    const sVal = feedback.sweetness !== undefined ? Number(feedback.sweetness) : 50;
    const sWeight = getFeedbackWeight(sVal);
    if (sVal < 50) { totalGrindImpact -= (3 * sWeight); totalTempImpact += (1 * sWeight); }

    const aVal = feedback.acidity !== undefined ? Number(feedback.acidity) : 50;
    const aWeight = getFeedbackWeight(aVal);
    if (aVal > 50) { totalGrindImpact -= (4 * aWeight); totalTempImpact += (2 * aWeight); }
    else if (aVal < 50) { totalGrindImpact += (1 * aWeight); }

    const boVal = feedback.body !== undefined ? Number(feedback.body) : 50;
    const boWeight = getFeedbackWeight(boVal);
    if (boVal > 50) { totalGrindImpact += (3 * boWeight); }
    else if (boVal < 50) { totalGrindImpact -= (3 * boWeight); }

    // 2. Round & Cap values
    const finalGrindDelta = Math.round(totalGrindImpact);
    const finalTempDelta = Math.round(totalTempImpact * 2) / 2;
    const cappedGrind = Math.max(-4, Math.min(4, finalGrindDelta));
    const cappedTemp = Math.max(-2, Math.min(2, finalTempDelta));

    // 3. Consolidated Strategy Labels
    let strategyLabels = [];
    if (cappedGrind > 0) {
        strategyLabels.push(`→ Grind ${Math.abs(cappedGrind) > 2 ? 'significantly' : 'slightly'} coarser`);
    } else if (cappedGrind < 0) {
        strategyLabels.push(`→ Grind ${Math.abs(cappedGrind) > 2 ? 'significantly' : 'slightly'} finer`);
    }
    
    if (cappedTemp > 0) {
        strategyLabels.push(`→ Increase temperature (+${cappedTemp}°C)`);
    } else if (cappedTemp < 0) {
        strategyLabels.push(`→ Lower temperature (${cappedTemp}°C)`);
    }

    if (strategyLabels.length === 0) {
        suggestionDiv.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-secondary);">✓ Nuances are balanced. No major adjustments needed.</div>`;
        suggestionDiv.classList.remove('hidden');

        // Restore hide timer for "balanced" state
        const hideTimer = setTimeout(() => {
            suggestionDiv.classList.add('hidden');
            suggestionHideTimers.delete(index);
        }, 3000);
        suggestionHideTimers.set(index, hideTimer);
        return;
    }

    const previewGrind = cappedGrind !== 0
        ? getBrewRecommendations({ ...coffee, grindOffset: (coffee.grindOffset || 0) + cappedGrind }).grindSetting
        : null;

    let newTempStr = null;
    if (cappedTemp !== 0) {
        const currentTemp = coffee.customTemp || getDefaultTemp(coffee.process?.toLowerCase() || 'unknown');
        newTempStr = adjustTemp(currentTemp, cappedTemp);
    }

    // 4. UI Rendering
    suggestionDiv.innerHTML = `
        <div class="suggestion-title">
            <svg style="width: 18px; height: 18px; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                <path d="M9 18h6"></path><path d="M10 22h4"></path>
            </svg>
            Tuning Strategy
        </div>
        <div class="suggestion-text" style="font-weight: 500; color: var(--text-primary); margin: 8px 0;">
            ${strategyLabels.join('<br>')}
        </div>
        <div class="suggestion-values">
            ${previewGrind ? `<div class="suggestion-value"><strong>Target Grind:</strong> ${previewGrind}</div>` : ''}
            ${newTempStr ? `<div class="suggestion-value"><strong>Target Temp:</strong> ${newTempStr}</div>` : ''}
        </div>
        <button class="apply-suggestion-btn" onclick="applySuggestion(${index}, ${cappedGrind}, '${newTempStr}')">
            Apply Adjustments
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
    const low = parseFloat(match[1]) + change;
    const high = match[2] ? parseFloat(match[2]) + change : null;
    return high ? `${low}-${high}°C` : `${low}°C`;
}

export async function applySuggestion(index, grindOffsetDelta, newTemp) {
    const { renderCoffees } = await import('./coffee-list.js');
    
    const coffee = coffees[index];
    const before = getBrewRecommendations(coffee);

    if (grindOffsetDelta && grindOffsetDelta !== 0) {
        coffee.grindOffset = (coffee.grindOffset || 0) + grindOffsetDelta;
    }
    if (newTemp && newTemp !== 'null') coffee.customTemp = newTemp;

    const after = getBrewRecommendations(coffee);
    addHistoryEntry(coffee, {
        timestamp: new Date().toISOString(),
        previousGrind: before.grindSetting,
        previousTemp: before.temperature,
        newGrind: after.grindSetting,
        newTemp: after.temperature,
        grindOffsetDelta: grindOffsetDelta || 0,
        customTempApplied: newTemp && newTemp !== 'null' ? newTemp : null
    });

    coffee.feedback = {};
    saveCoffeesAndSync();
    renderCoffees(index);
}

export function addHistoryEntry(coffee, entry) {
    if (!coffee.feedbackHistory) coffee.feedbackHistory = [];
    coffee.feedbackHistory.unshift(entry);
    if (coffee.feedbackHistory.length > 30) {
        coffee.feedbackHistory = coffee.feedbackHistory.slice(0, 30);
    }
}

function formatHistoryDate(iso) {
    let date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso || 'Unknown date';
    const dd   = String(date.getDate()).padStart(2, '0');
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh   = String(date.getHours()).padStart(2, '0');
    const min  = String(date.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} \u00b7 ${hh}:${min}`;
}

function formatHistoryDelta(entry) {
    if (entry.brewStart) {
        return entry.brewLabel || 'Brew started';
    }

    if (entry.resetToInitial) {
        return 'Reset to engine baseline values';
    }

    if (entry.manualAdjust === 'grind') {
        const sign = (entry.grindOffsetDelta || 0) > 0 ? '+' : '';
        return `Manual grind adjust ${sign}${entry.grindOffsetDelta || 0}`;
    }

    if (entry.manualAdjust === 'temp') {
        return `Manual temperature adjust ${entry.customTempApplied || ''}`.trim();
    }

    const parts = [];
    if (entry.grindOffsetDelta) {
        const sign = entry.grindOffsetDelta > 0 ? '+' : '';
        parts.push(`Grind offset ${sign}${entry.grindOffsetDelta}`);
    }
    if (entry.customTempApplied) {
        parts.push(`Temp override ${entry.customTempApplied}`);
    }
    if (parts.length === 0) return 'No direct offset change';
    return parts.join(' · ');
}

export function openFeedbackHistory(index) {
    const modal = document.getElementById('feedbackHistoryModal');
    const titleEl = document.getElementById('feedbackHistoryTitle');
    const listEl = document.getElementById('feedbackHistoryList');
    const emptyEl = document.getElementById('feedbackHistoryEmpty');
    const coffee = coffees[index];

    if (!modal || !titleEl || !listEl || !emptyEl || !coffee) return;

    modal.dataset.coffeeIndex = index;

    titleEl.textContent = `History \u00b7 ${coffee.name || 'Coffee'}`;

    const history = Array.isArray(coffee.feedbackHistory) ? coffee.feedbackHistory : [];
    if (history.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
    } else {
        emptyEl.style.display = 'none';
        listEl.innerHTML = history.map(entry => {
            const dateStr = sanitizeHTML(formatHistoryDate(entry.timestamp));
            const deltaStr = sanitizeHTML(formatHistoryDelta(entry));
            if (entry.brewStart) {
                return `
            <div class="history-item history-item--brew-start">
                <div class="history-item-brew-badge">&#9749; Brew</div>
                <div class="history-item-top">
                    <strong>${dateStr}</strong>
                </div>
                <div class="history-item-brew-label">${deltaStr}</div>
            </div>`;
            }
            const grindChanged = entry.previousGrind !== entry.newGrind;
            const tempChanged  = entry.previousTemp  !== entry.newTemp;
            const grindCell = grindChanged ? `<div class="history-cell"><span>Grind</span><strong>${sanitizeHTML(entry.previousGrind)} &rarr; ${sanitizeHTML(entry.newGrind)}</strong></div>` : '';
            const tempCell  = tempChanged  ? `<div class="history-cell"><span>Temp</span><strong>${sanitizeHTML(entry.previousTemp)} &rarr; ${sanitizeHTML(entry.newTemp)}</strong></div>` : '';
            const grid = (grindCell || tempCell) ? `<div class="history-item-grid">${grindCell}${tempCell}</div>` : '';
            return `
            <div class="history-item">
                <div class="history-item-top">
                    <strong>${dateStr}</strong>
                </div>
                ${grid}
            </div>`;
        }).join('');
    }

    modal.classList.add('active');
}

export function closeFeedbackHistory() {
    const modal = document.getElementById('feedbackHistoryModal');
    if (modal) modal.classList.remove('active');
}

export function adjustGrindManual(index, direction) {
    const coffee = coffees[index];
    const before = getBrewRecommendations(coffee);
    coffee.grindOffset = (coffee.grindOffset || 0) + direction;

    const after = getBrewRecommendations(coffee);
    addHistoryEntry(coffee, {
        timestamp: new Date().toISOString(),
        previousGrind: before.grindSetting,
        previousTemp: before.temperature,
        newGrind: after.grindSetting,
        newTemp: after.temperature,
        grindOffsetDelta: direction,
        customTempApplied: null,
        manualAdjust: 'grind'
    });

    const el = document.getElementById(`grind-value-${index}`);
    if (el) el.textContent = after.grindSetting;
    saveCoffeesAndSync();
}

export function adjustTempManual(index, direction) {
    const coffee = coffees[index];
    const before = getBrewRecommendations(coffee);
    const currentTemp = coffee.customTemp || getBrewRecommendations(coffee).temperature;

    const match = currentTemp.match(/(\d+)(?:-(\d+))?/);
    if (!match) return;

    const low = parseInt(match[1]) + direction;
    const high = match[2] ? parseInt(match[2]) + direction : null;
    coffee.customTemp = high ? `${low}-${high}°C` : `${low}°C`;

    const after = getBrewRecommendations(coffee);
    addHistoryEntry(coffee, {
        timestamp: new Date().toISOString(),
        previousGrind: before.grindSetting,
        previousTemp: before.temperature,
        newGrind: after.grindSetting,
        newTemp: after.temperature,
        grindOffsetDelta: 0,
        customTempApplied: coffee.customTemp,
        manualAdjust: 'temp'
    });

    const el = document.getElementById(`temp-value-${index}`);
    if (el) el.textContent = coffee.customTemp;
    saveCoffeesAndSync();
}

export async function resetCoffeeAdjustments(index) {
    const confirmed = await showResetAdjustmentsConfirmModal();
    if (!confirmed) return;

    const coffee = coffees[index];
    const before = getBrewRecommendations(coffee);

    const initial = getInitialBrewValues(coffee);

    coffee.initialGrind = initial.grind;
    coffee.initialTemp = initial.temp;

    delete coffee.customGrind;
    delete coffee.grindOffset;
    delete coffee.customTemp;
    delete coffee.feedback;

    const after = getBrewRecommendations(coffee);
    addHistoryEntry(coffee, {
        timestamp: new Date().toISOString(),
        previousGrind: before.grindSetting,
        previousTemp: before.temperature,
        newGrind: after.grindSetting,
        newTemp: after.temperature,
        grindOffsetDelta: 0,
        customTempApplied: null,
        resetToInitial: true
    });

    const grindEl = document.getElementById(`grind-value-${index}`);
    const tempEl = document.getElementById(`temp-value-${index}`);
    if (grindEl) grindEl.textContent = initial.grind;
    if (tempEl) tempEl.textContent = initial.temp;

    document.querySelectorAll(`[data-feedback^="${index}-"]`).forEach(opt => {
        opt.classList.remove('selected');
    });

    const suggestionEl = document.getElementById(`suggestion-${index}`);
    if (suggestionEl) {
        suggestionEl.innerHTML = '';
        suggestionEl.classList.add('hidden');
    }

    saveCoffeesAndSync();
}

export function getInitialBrewValues(coffee) {
    const clone = { ...coffee };
    delete clone.customGrind;
    delete clone.grindOffset;
    delete clone.customTemp;
    const rec = getBrewRecommendations(clone);
    return { grind: rec.grindSetting, temp: rec.temperature };
}

export function ensureInitialValues(coffee) {
    if (!coffee.initialGrind || !coffee.initialTemp) {
        const initial = getInitialBrewValues(coffee);
        coffee.initialGrind = initial.grind;
        coffee.initialTemp = initial.temp;
    }
}

export function migrateCoffeesInitialValues() {
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

export function clearFeedbackHistory(index) {
    const modal = document.getElementById('feedbackHistoryModal');
    const resolvedIndex = index !== undefined ? index : Number(modal && modal.dataset.coffeeIndex);
    if (isNaN(resolvedIndex) || !coffees[resolvedIndex]) return;

    const coffee = coffees[resolvedIndex];
    coffee.feedbackHistory = [];
    saveCoffeesAndSync();

    const listEl  = document.getElementById('feedbackHistoryList');
    const emptyEl = document.getElementById('feedbackHistoryEmpty');
    if (listEl)  listEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
}

export function openClearHistoryConfirm() {
    const historyModal = document.getElementById("feedbackHistoryModal");
    const confirmModal = document.getElementById("clearHistoryConfirmModal");
    if (!confirmModal) return;
    const idx = historyModal && historyModal.dataset.coffeeIndex;
    confirmModal.dataset.coffeeIndex = idx;
    if (historyModal) historyModal.classList.remove("active");
    confirmModal.classList.add("active");
}

export function closeClearHistoryConfirm() {
    const confirmModal = document.getElementById("clearHistoryConfirmModal");
    if (confirmModal) confirmModal.classList.remove("active");
}

function initClearHistoryConfirmListeners() {
    const closeBtn      = document.getElementById("closeClearHistoryConfirmBtn");
    const cancelBtn     = document.getElementById("cancelClearHistoryConfirmBtn");
    const okBtn         = document.getElementById("confirmClearHistoryBtn");
    const triggerBtn    = document.getElementById("clearHistoryBtn");
    if (closeBtn)    closeBtn.addEventListener("click",   closeClearHistoryConfirm);
    if (cancelBtn)   cancelBtn.addEventListener("click",  closeClearHistoryConfirm);
    if (triggerBtn)  triggerBtn.addEventListener("click", openClearHistoryConfirm);
    if (okBtn) okBtn.addEventListener("click", () => {
        const confirmModal = document.getElementById("clearHistoryConfirmModal");
        const idx = confirmModal && Number(confirmModal.dataset.coffeeIndex);
        closeClearHistoryConfirm();
        clearFeedbackHistory(idx);
        openFeedbackHistory(idx);
    });
}

document.addEventListener("DOMContentLoaded", initClearHistoryConfirmListeners);

// Register functions on window for onclick handlers
window.selectFeedback = selectFeedback;
window.updateFeedbackSlider = updateFeedbackSlider;
window.snapFeedbackSlider = snapFeedbackSlider;
window.applySuggestion = applySuggestion;
window.adjustGrindManual = adjustGrindManual;
window.adjustTempManual = adjustTempManual;
window.resetCoffeeAdjustments = resetCoffeeAdjustments;
window.openFeedbackHistory = openFeedbackHistory;
window.closeFeedbackHistory = closeFeedbackHistory;
window.clearFeedbackHistory = clearFeedbackHistory;
window.openClearHistoryConfirm = openClearHistoryConfirm;
window.closeClearHistoryConfirm = closeClearHistoryConfirm;
