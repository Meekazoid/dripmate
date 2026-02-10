// ==========================================
// FEEDBACK SYSTEM
// Extraction/taste feedback and AI suggestions
// ==========================================

import { coffees, saveCoffeesAndSync } from './state.js';
import { getBrewRecommendations } from './brew-engine.js';

export function selectFeedback(index, category, value) {
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

export async function applySuggestion(index, grindOffsetDelta, newTemp) {
    // Import dynamically to avoid circular dependency
    const { renderCoffees } = await import('./coffee-list.js');
    
    const coffee = coffees[index];
    if (grindOffsetDelta && grindOffsetDelta !== 0) {
        coffee.grindOffset = (coffee.grindOffset || 0) + grindOffsetDelta;
    }
    if (newTemp && newTemp !== 'null') coffee.customTemp = newTemp;
    coffee.feedback = {};
    saveCoffeesAndSync();
    renderCoffees(index);
}

// Manual adjustment functions
export function adjustGrindManual(index, direction) {
    const coffee = coffees[index];
    coffee.grindOffset = (coffee.grindOffset || 0) + direction;

    // Direct DOM update using recalculated value
    const el = document.getElementById(`grind-value-${index}`);
    if (el) el.textContent = getBrewRecommendations(coffee).grindSetting;
    saveCoffeesAndSync();
}

export function adjustTempManual(index, direction) {
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

export function resetCoffeeAdjustments(index) {
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
window.applySuggestion = applySuggestion;
window.adjustGrindManual = adjustGrindManual;
window.adjustTempManual = adjustTempManual;
window.resetCoffeeAdjustments = resetCoffeeAdjustments;
