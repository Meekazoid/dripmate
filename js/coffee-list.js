// ==========================================
// COFFEE LIST RENDERING & SORTING
// List rendering, sorting, expand/collapse
// ==========================================

import { coffees, saveCoffeesAndSync } from './state.js';
import { renderCoffeeCard } from './coffee-cards.js';
import { getBrewRecommendations } from './brew-engine.js';
import { initFeedbackSliderVisuals } from './feedback.js';

function showCompostConfirmModal() {
    const modal = document.getElementById('compostConfirmModal');
    const confirmBtn = document.getElementById('confirmCompostConfirmBtn');
    const cancelBtn = document.getElementById('cancelCompostConfirmBtn');
    const closeBtn = document.getElementById('closeCompostConfirmBtn');

    if (!modal || !confirmBtn || !cancelBtn || !closeBtn) {
        return Promise.resolve(confirm('Move this coffee to Compost?'));
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

function showCompostDeleteConfirmModal() {
    const modal = document.getElementById('compostDeleteConfirmModal');
    const confirmBtn = document.getElementById('confirmCompostDeleteConfirmBtn');
    const cancelBtn = document.getElementById('cancelCompostDeleteConfirmBtn');
    const closeBtn = document.getElementById('closeCompostDeleteConfirmBtn');

    if (!modal || !confirmBtn || !cancelBtn || !closeBtn) {
        return Promise.resolve(confirm('Permanently delete this coffee? This cannot be undone.'));
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

// ==========================================
// ROASTERY STACK HELPERS
// ==========================================

function groupByRoastery(sorted) {
    const buckets = new Map();

    sorted.forEach(item => {
        const raw = (item.coffee.roastery || '').trim();
        const key = raw.toLowerCase();

        if (!raw || key === 'unknown') {
            buckets.set(Symbol('single'), [item]); // niemals stacken
            return;
        }

        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(item);
    });

    const groups = [];
    for (const [, items] of buckets) {
        if (items.length <= 1) groups.push({ single: true, item: items[0] });
        else groups.push({ single: false, items });
    }
    return groups;
}

function attachCardClickListener(card) {
    card.addEventListener('click', function (e) {
        if (card.dataset.suppressClick === '1') {
            card.dataset.suppressClick = '0';
            return;
        }

        if (e.target.closest('.delete-btn, .favorite-btn, .edit-btn, .inline-edit-input, .edit-process, .timer-btn, .feedback-slider, .apply-suggestion-btn, .adjust-btn, .history-btn, .reset-adjustments-btn, input[type="range"], input[type="date"], .color-picker-btn, .color-picker-popup')) return;

        document.querySelectorAll('.coffee-card').forEach(c => {
            if (c !== this) c.classList.remove('expanded');
        });
        this.classList.toggle('expanded');

        // Stack-Layout aktualisieren
        const wrapper = this.closest('.roastery-stack-wrapper');
        if (wrapper) wrapper.dispatchEvent(new CustomEvent('roastery-stack:sync-height', { bubbles: true }));
    });
}

function buildRoasteryStack(items) {
    const wrapper = document.createElement('div');
    wrapper.className = 'roastery-stack-wrapper';

    const slot = document.createElement('div');
    slot.className = 'roastery-stack-slot';

    const dots = document.createElement('div');
    dots.className = 'roastery-stack-dots';

    const ghostLayer = document.createElement('div');
    ghostLayer.className = 'roastery-stack-ghost-layer';
    const ghostCount = Math.min(3, Math.max(0, items.length - 1));
    const ghosts = Array.from({ length: ghostCount }, (_, i) => {
        const ghost = document.createElement('div');
        ghost.className = `roastery-stack-ghost roastery-stack-ghost-${i + 1}`;
        ghostLayer.appendChild(ghost);
        return ghost;
    });

    let current = 0;

    // Pointer state
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;
    let isPointerDown = false;
    let dragActive = false;
    let animating = false;

    // Schwellwerte
    const ACTIVATE_X = 12;
    const LOCK_Y = 10;
    const SWIPE_THRESHOLD = 64;
    const SWIPE_IGNORE_SELECTOR = '.delete-btn, .favorite-btn, .edit-btn, .inline-edit-input, .edit-process, .timer-btn, .feedback-slider, .apply-suggestion-btn, .adjust-btn, .history-btn, .reset-adjustments-btn, input, select, textarea, button, .color-picker-btn, .color-picker-popup';

    function makeCard(item, idx, total) {
        const tpl = document.createElement('template');
        tpl.innerHTML = renderCoffeeCard(item.coffee, item.originalIndex).trim();
        const card = tpl.content.firstElementChild;

        // Badge zentriert auf der Oberkante (wie im vereinbarten Design)
        const badge = document.createElement('div');
        badge.className = 'roastery-stack-counter';
        badge.textContent = `${idx + 1}/${total}`;
        card.appendChild(badge);

        attachCardClickListener(card);
        return card;
    }

    function makePreviewCard(item) {
        const tpl = document.createElement('template');
        tpl.innerHTML = renderCoffeeCard(item.coffee, item.originalIndex).trim();
        const card = tpl.content.firstElementChild;
        card.classList.remove('expanded');
        card.classList.add('roastery-stack-preview-card');
        return card;
    }

    function renderDots() {
        dots.innerHTML = '';
        items.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.className = `roastery-stack-dot${i === current ? ' active' : ''}`;
            dots.appendChild(dot);
        });
    }

    function syncGhostHeight() {
        const active = slot.querySelector('.coffee-card');
        if (!active) return;
        const h = active.offsetHeight || 0;
        ghosts.forEach(g => { g.style.height = `${h}px`; });
    }

    function renderGhostPreview() {
        ghosts.forEach(g => { g.innerHTML = ''; });
        if (ghosts.length === 0 || items.length < 2) return;

        const nextItem = items[(current + 1) % items.length];
        const previewCard = makePreviewCard(nextItem);
        ghosts[0].appendChild(previewCard);
    }

    function renderCurrent(inDirection) {
        slot.innerHTML = '';
        slot.appendChild(makeCard(items[current], current, items.length));
        renderGhostPreview();
        renderDots();
        syncGhostHeight();
        requestAnimationFrame(syncGhostHeight);

        if (inDirection) {
            const slideClass = inDirection === 'left' ? 'roastery-slide-in-left' : 'roastery-slide-in-right';
            slot.classList.add(slideClass);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => slot.classList.remove(slideClass));
            });
        }
    }

    function cleanupPointerState() {
        if (pointerId !== null) {
            slot.releasePointerCapture?.(pointerId);
        }
        pointerId = null;
        isPointerDown = false;
        dragActive = false;
        deltaX = 0;
        deltaY = 0;
        slot.classList.remove('roastery-stack-dragging');
    }

    function animateSnapBack() {
        slot.classList.add('roastery-snap-back');
        slot.style.transform = '';
        setTimeout(() => slot.classList.remove('roastery-snap-back'), 180);
    }

    function go(direction /* 'left' | 'right' */) {
        if (animating) return;
        animating = true;
        slot.classList.remove('roastery-fly-left', 'roastery-fly-right', 'roastery-snap-back');
        slot.classList.remove('roastery-slide-in-left', 'roastery-slide-in-right');
        slot.classList.add('roastery-push-out');

        const activeCard = slot.querySelector('.coffee-card');
        if (activeCard) activeCard.dataset.suppressClick = '1';

        setTimeout(() => {
            current = direction === 'left'
                ? (current + 1) % items.length
                : (current - 1 + items.length) % items.length;

            slot.classList.remove('roastery-push-out');
            slot.style.transform = '';
            renderCurrent(direction);
            animating = false;
        }, 200);
    }

    function onPointerDown(e) {
        if (animating) return;
        if (e.button !== undefined && e.button !== 0) return;
        const activeCard = slot.querySelector('.coffee-card');
        if (activeCard?.classList.contains('expanded')) return;
        if (e.target.closest(SWIPE_IGNORE_SELECTOR)) return;

        pointerId = e.pointerId;
        isPointerDown = true;
        dragActive = false;
        startX = e.clientX;
        startY = e.clientY;
        deltaX = 0;
        deltaY = 0;

        slot.setPointerCapture?.(pointerId);
    }

    function onPointerMove(e) {
        if (animating || !isPointerDown || e.pointerId !== pointerId) return;

        deltaX = e.clientX - startX;
        deltaY = e.clientY - startY;

        if (!dragActive) {
            if (Math.abs(deltaY) > LOCK_Y && Math.abs(deltaY) > Math.abs(deltaX)) {
                // Pointer-Capture sauber freigeben bevor State zurückgesetzt wird
                if (pointerId !== null) {
                    slot.releasePointerCapture?.(pointerId);
                }
                cleanupPointerState();
                return;
            }
            if (Math.abs(deltaX) < ACTIVATE_X) return;
            dragActive = true;
            slot.classList.add('roastery-stack-dragging');
        }

        const scale = Math.max(0.93, 1 - Math.abs(deltaX) / 900);
        slot.style.transform = `translateX(${deltaX}px) scale(${scale})`;
        e.preventDefault();
    }

    function onPointerEndLike(e) {
        if (animating || !isPointerDown || e.pointerId !== pointerId) return;

        slot.releasePointerCapture?.(pointerId);

        const wasDrag = dragActive;
        const moved = deltaX;

        cleanupPointerState();

        if (!wasDrag) return;

        if (Math.abs(moved) >= SWIPE_THRESHOLD) {
            go(moved < 0 ? 'left' : 'right');
        } else {
            animateSnapBack();
        }
    }

    slot.addEventListener('pointerdown', onPointerDown);
    slot.addEventListener('pointermove', onPointerMove);
    slot.addEventListener('pointerup', onPointerEndLike);
    slot.addEventListener('pointercancel', onPointerEndLike);

    // Ghost-Höhe bei Expand/Collapse
    wrapper.addEventListener('roastery-stack:sync-height', syncGhostHeight);

    // Ghost-Höhe bei Resize / Orientation
    const ro = new ResizeObserver(() => syncGhostHeight());
    ro.observe(slot);

    const onViewportChange = () => requestAnimationFrame(syncGhostHeight);
    window.addEventListener('resize', onViewportChange, { passive: true });
    window.addEventListener('orientationchange', onViewportChange, { passive: true });

    // Cleanup wenn Wrapper aus DOM entfernt wird
    const mo = new MutationObserver(() => {
        if (!document.body.contains(wrapper)) {
            ro.disconnect();
            mo.disconnect();
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('orientationchange', onViewportChange);
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    wrapper.appendChild(ghostLayer);
    wrapper.appendChild(slot);
    wrapper.appendChild(dots);

    renderCurrent();
    return wrapper;
}

// ==========================================
// RENDER
// ==========================================

export function renderCoffees(expandAfterIndex) {
    const listEl = document.getElementById('coffeeList');
    const emptyState = document.getElementById('emptyState');

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

    const groups = groupByRoastery(sorted);
    listEl.innerHTML = '';

    groups.forEach(group => {
        if (group.single) {
            const tpl = document.createElement('template');
            tpl.innerHTML = renderCoffeeCard(group.item.coffee, group.item.originalIndex).trim();
            const card = tpl.content.firstElementChild;
            attachCardClickListener(card);
            listEl.appendChild(card);
        } else {
            listEl.appendChild(buildRoasteryStack(group.items));
        }
    });

    initFeedbackSliderVisuals(listEl);

    // Re-expand card if requested (e.g. after reset adjustments)
    if (expandAfterIndex !== undefined) {
        const card = document.querySelector(`.coffee-card[data-original-index="${expandAfterIndex}"]`);
        if (card) {
            card.classList.add('expanded');
            const wrapper = card.closest('.roastery-stack-wrapper');
            if (wrapper) wrapper.dispatchEvent(new CustomEvent('roastery-stack:sync-height', { bubbles: true }));
        }
    }
}

export async function deleteCoffee(originalIndex) {
    if (originalIndex < 0 || originalIndex >= coffees.length) return;

    const shouldMoveToCompost = await showCompostConfirmModal();
    if (!shouldMoveToCompost) return;

    coffees[originalIndex].deleted = true;
    coffees[originalIndex].deletedAt = new Date().toISOString();
    saveCoffeesAndSync();
    renderCoffees();
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

    const shouldDelete = await showCompostDeleteConfirmModal();
    if (shouldDelete) {
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
