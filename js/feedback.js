// ==========================================
// FEEDBACK SYSTEM
// Cupping-inspired sensory feedback and parameter suggestions
// ==========================================

import { coffees, saveCoffeesAndSync, sanitizeHTML } from './state.js';
import { getBrewRecommendations } from './brew-engine.js';

const suggestionHideTimers = new Map();

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

function sliderValueToFeedback(value) {
    const numeric = Number(value);
    if (numeric <= 33) return 'low';
    if (numeric >= 67) return 'high';
    return 'balanced';
}

function feedbackToSliderValue(value) {
    if (value === 'low') return '0';
    if (value === 'high') return '100';
    return '50';
}

export function updateFeedbackSlider(index, category, sliderValue) {
    const value = sliderValueToFeedback(sliderValue);
    selectFeedback(index, category, value);
}


export function selectFeedback(index, category, value) {
    const coffee = coffees[index];
    if (!coffee.feedback) coffee.feedback = {};

    const previousValue = coffee.feedback[category];
    coffee.feedback[category] = value;

    document.querySelectorAll(`[data-feedback="${index}-${category}"]`).forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });

    const sliderEl = document.querySelector(`[data-feedback-slider="${index}-${category}"]`);
    if (sliderEl) sliderEl.value = feedbackToSliderValue(value);

    if (previousValue === value) return;

    generateSuggestion(index);
    localStorage.setItem('coffees', JSON.stringify(coffees));
}

function hasAnyCuppingInput(feedback) {
    return ['bitterness', 'sweetness', 'acidity', 'body'].some(key => Boolean(feedback[key]));
}

function generateSuggestion(index) {
    const coffee = coffees[index];
    const feedback = coffee.feedback || {};
    const suggestionDiv = document.getElementById(`suggestion-${index}`);
    if (!suggestionDiv) return;

    clearSuggestionHideTimer(index);

    let suggestions = [];
    let grindOffsetDelta = 0;
    let tempDelta = 0;
    let newTemp = null;

    if (!hasAnyCuppingInput(feedback)) {
        suggestionDiv.innerHTML = '';
        suggestionDiv.classList.add('hidden');
        return;
    }

    // Cupping-inspired mappings (low / balanced / high)
    const hasBitterHigh = feedback.bitterness === 'high';
    const hasSweetLow = feedback.sweetness === 'low';
    const hasAcidityHigh = feedback.acidity === 'high';
    const hasAcidityLow = feedback.acidity === 'low';

    if (hasBitterHigh) {
        suggestions.push('Bitterness is high', '→ Grind coarser', '→ Lower temperature by 2°C');
        grindOffsetDelta += +5;
        tempDelta -= 2;
    } else if (feedback.bitterness === 'low') {
        suggestions.push('Bitterness is very low / cup feels sharp-thin', '→ Slightly finer grind');
        grindOffsetDelta += -2;
    }

    if (hasSweetLow) {
        suggestions.push('Sweetness is low', '→ Increase extraction slightly (finer + warmer)');
        grindOffsetDelta += -3;
        tempDelta += 1;
    } else if (feedback.sweetness === 'high') {
        suggestions.push('Sweetness is high', '→ Keep this profile as a reference cup');
    }

    if (hasAcidityHigh) {
        suggestions.push('Acidity feels too sharp', '→ Grind finer', '→ Raise temperature by 1–2°C');
        grindOffsetDelta += -4;
        tempDelta += 2;
    } else if (hasAcidityLow) {
        if (hasBitterHigh) {
            suggestions.push('Acidity is low + bitterness high', '→ Keep coarser/cooler direction to reduce harshness');
            grindOffsetDelta += +1;
            tempDelta -= 1;
        } else if (hasSweetLow) {
            suggestions.push('Acidity is low + sweetness low', '→ Increase extraction (slightly finer + warmer)');
            grindOffsetDelta += -2;
            tempDelta += 1;
        } else {
            suggestions.push('Acidity feels muted', '→ Coarser by 1 click equivalent only');
            grindOffsetDelta += +1;
        }
    }

    if (feedback.body === 'low') {
        suggestions.push('Body is too light', '→ Grind slightly finer');
        grindOffsetDelta += -3;
    } else if (feedback.body === 'high') {
        suggestions.push('Body is too heavy', '→ Grind slightly coarser');
        grindOffsetDelta += +3;
    }

    const allBalanced = ['bitterness', 'sweetness', 'acidity', 'body']
        .every(key => !feedback[key] || feedback[key] === 'balanced');

    if (suggestions.length === 0 || allBalanced) {
        suggestionDiv.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-secondary);">✓ Perfect! No adjustments needed.</div>`;
        suggestionDiv.classList.remove('hidden');

        const hideTimer = setTimeout(() => {
            const currentCoffee = coffees[index];
            if (!currentCoffee) return;
            const currentFeedback = currentCoffee.feedback || {};
            const stillBalanced = ['bitterness', 'sweetness', 'acidity', 'body']
                .every(key => !currentFeedback[key] || currentFeedback[key] === 'balanced');
            if (stillBalanced) {
                suggestionDiv.classList.add('hidden');
            }
            suggestionHideTimers.delete(index);
        }, 3000);

        suggestionHideTimers.set(index, hideTimer);
        return;
    }

    // Conflict guidance for opposite extraction signals
    if (hasBitterHigh && hasAcidityHigh) {
        suggestions.push('Conflict: bitterness high + acidity high', '→ Keep temperature stable; change grind first, then taste again');
    }

    // Cap step size per iteration to keep loop stable/reproducible
    const cappedGrindDelta = Math.max(-4, Math.min(4, grindOffsetDelta));
    const cappedTempDelta = Math.max(-2, Math.min(2, tempDelta));
    if (cappedGrindDelta !== grindOffsetDelta || cappedTempDelta !== tempDelta) {
        suggestions.push('Adjustment cap applied', '→ Changes limited to stable single-step iteration');
    }

    // Preview what the grind would look like with the new offset
    const previewGrind = cappedGrindDelta !== 0
        ? getBrewRecommendations({ ...coffee, grindOffset: (coffee.grindOffset || 0) + cappedGrindDelta }).grindSetting
        : null;

    if (cappedTempDelta !== 0) {
        newTemp = adjustTemp(coffee.customTemp || getDefaultTemp(coffee.process.toLowerCase()), cappedTempDelta);
    }

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
        <button class="apply-suggestion-btn" onclick="applySuggestion(${index}, ${cappedGrindDelta}, '${newTemp}')">
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

export async function applySuggestion(index, grindOffsetDelta, newTemp) {
    // Import dynamically to avoid circular dependency
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

function addHistoryEntry(coffee, entry) {
    if (!coffee.feedbackHistory) coffee.feedbackHistory = [];
    coffee.feedbackHistory.unshift(entry);
    if (coffee.feedbackHistory.length > 30) {
        coffee.feedbackHistory = coffee.feedbackHistory.slice(0, 30);
    }
}

function formatHistoryDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString();
}

function formatHistoryDelta(entry) {
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

    titleEl.textContent = `Adjustment History · ${coffee.name || 'Coffee'}`;

    const history = Array.isArray(coffee.feedbackHistory) ? coffee.feedbackHistory : [];
    if (history.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'block';
    } else {
        emptyEl.style.display = 'none';
        listEl.innerHTML = history.map(entry => `
            <div class="history-item">
                <div class="history-item-top">
                    <strong>${sanitizeHTML(formatHistoryDate(entry.timestamp))}</strong>
                    <span>${sanitizeHTML(formatHistoryDelta(entry))}</span>
                </div>
                <div class="history-item-grid">
                    <div><span>Grind</span><strong>${sanitizeHTML(entry.previousGrind)} → ${sanitizeHTML(entry.newGrind)}</strong></div>
                    <div><span>Temp</span><strong>${sanitizeHTML(entry.previousTemp)} → ${sanitizeHTML(entry.newTemp)}</strong></div>
                </div>
            </div>
        `).join('');
    }

    modal.classList.add('active');
}

export function closeFeedbackHistory() {
    const modal = document.getElementById('feedbackHistoryModal');
    if (modal) modal.classList.remove('active');
}

// Manual adjustment functions
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

    // Direct DOM update using recalculated value
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

// Register functions on window for onclick handlers
window.selectFeedback = selectFeedback;
window.updateFeedbackSlider = updateFeedbackSlider;
window.applySuggestion = applySuggestion;
window.adjustGrindManual = adjustGrindManual;
window.adjustTempManual = adjustTempManual;
window.resetCoffeeAdjustments = resetCoffeeAdjustments;
window.openFeedbackHistory = openFeedbackHistory;
window.closeFeedbackHistory = closeFeedbackHistory;
