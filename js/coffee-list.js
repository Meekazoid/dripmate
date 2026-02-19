// ==========================================
// COFFEE LIST RENDERING & SORTING
// List rendering, sorting, expand/collapse
// ==========================================

import { coffees, saveCoffeesAndSync } from './state.js';
import { renderCoffeeCard } from './coffee-cards.js';
import { getBrewRecommendations } from './brew-engine.js';

export function renderCoffees(expandAfterIndex) {
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
            // ── Updated: added .edit-btn and .inline-edit-input to ignore list ──
            if (e.target.closest('.delete-btn, .favorite-btn, .edit-btn, .inline-edit-input, .timer-btn, .feedback-slider, .apply-suggestion-btn, .adjust-btn, .history-btn, .reset-adjustments-btn, input[type="range"], input[type="date"]')) return;
            document.querySelectorAll('.coffee-card').forEach(c => { if (c !== this) c.classList.remove('expanded'); });
            this.classList.toggle('expanded');
        });
    });
}

export function deleteCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    if (confirm('Move this coffee to Compost?')) {
        coffees[originalIndex].deleted = true;
        coffees[originalIndex].deletedAt = new Date().toISOString();
        saveCoffeesAndSync();
        renderCoffees();
    }
}

export async function restoreCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    coffees[originalIndex].deleted = false;
    delete coffees[originalIndex].deletedAt;
    saveCoffeesAndSync();
    await renderDecafList();
    renderCoffees();
}

export async function permanentDeleteCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    if (confirm('Permanently delete this coffee? This cannot be undone.')) {
        coffees.splice(originalIndex, 1);
        saveCoffeesAndSync();
        await renderDecafList();
    }
}

export function toggleFavorite(originalIndex) {
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

export function updateCoffeeAmountLive(value, originalIndex) {
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

// Need to import renderDecafList from settings.js, but to avoid circular dependency, we'll call it dynamically
async function renderDecafList() {
    const module = await import('./settings.js');
    if (module.renderDecafList) {
        module.renderDecafList();
    }
}

// Register functions on window for onclick handlers
window.toggleFavorite = toggleFavorite;
window.deleteCoffee = deleteCoffee;
window.restoreCoffee = restoreCoffee;
window.permanentDeleteCoffee = permanentDeleteCoffee;
window.updateCoffeeAmountLive = updateCoffeeAmountLive;
