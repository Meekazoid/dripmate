// ==========================================
// COFFEE LIST RENDERING & SORTING
// List rendering, sorting, expand/collapse
// ==========================================

import { coffees, saveCoffeesAndSync } from './state.js';
import { renderCoffeeCard } from './coffee-cards.js';
import { getBrewRecommendations } from './brew-engine.js';
import { initFeedbackSliderVisuals } from './feedback.js';
import { initBrewWaves } from './brew-wave.js';

function showCompostConfirmModal() {
    const modal = document.getElementById('compostConfirmModal');
    const confirmBtn = document.getElementById('confirmCompostConfirmBtn');
    const cancelBtn = document.getElementById('cancelCompostConfirmBtn');
    const closeBtn = document.getElementById('closeCompostConfirmBtn');

    if (!modal || !confirmBtn || !cancelBtn || !closeBtn) {
        return Promise.resolve(confirm('Move this coffee to Cold Brew?'));
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

        if (e.target.closest('.delete-btn, .edit-btn, .inline-edit-input, .edit-process, .timer-btn, .feedback-slider, .apply-suggestion-btn, .adjust-btn, .history-btn, .reset-adjustments-btn, input[type="range"], input[type="date"], .color-picker-btn, .color-picker-popup')) return;

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

    const counter = document.createElement('div');
    counter.className = 'roastery-stack-counter';

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
    let pendingDeltaX = 0;
    let dragRaf = 0;
    let isTransitioning = false;
    let transitionAnim = null;
    let lastMoveTime = 0;
    let lastMoveX = 0;
    let velocityX = 0;
    let incomingEl = null;
    let incomingAnim = null;
    // Schwellwerte
    const ACTIVATE_X = 12;
    const LOCK_Y = 10;
    const SWIPE_THRESHOLD = 64;
    const SWIPE_IGNORE_SELECTOR = '.delete-btn, .edit-btn, .inline-edit-input, .edit-process, .timer-btn, .feedback-slider, .apply-suggestion-btn, .adjust-btn, .history-btn, .reset-adjustments-btn, input, select, textarea, button, .color-picker-btn, .color-picker-popup';
    const SPRING_EASING = 'cubic-bezier(0.2, 0, 0, 1.2)';
    const ANIM_DURATION = 300;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function makeCard(item) {
        const tpl = document.createElement('template');
        tpl.innerHTML = renderCoffeeCard(item.coffee, item.originalIndex).trim();
        const card = tpl.content.firstElementChild;

        attachCardClickListener(card);
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

    function renderCounter(animate = false) {
        counter.textContent = `${current + 1}/${items.length}`;
        if (!animate) {
            counter.classList.remove('roastery-counter-pop');
            return;
        }
        counter.classList.remove('roastery-counter-pop');
        requestAnimationFrame(() => counter.classList.add('roastery-counter-pop'));
    }

    function syncGhostHeight() {
        const active = slot.querySelector('.coffee-card');
        if (!active) return;
        const h = active.offsetHeight || 0;
        ghosts.forEach(g => { g.style.height = `${h}px`; });
    }

    function renderGhostPreview() {
        ghosts.forEach(g => { g.innerHTML = ''; });
    }

    function renderCurrent(animateCounter = false) {
        slot.innerHTML = '';
        slot.appendChild(makeCard(items[current]));
        renderGhostPreview();
        renderDots();
        renderCounter(animateCounter);
        syncGhostHeight();
        requestAnimationFrame(syncGhostHeight);
    }

    function cleanupPointerState() {
        if (dragRaf) {
            cancelAnimationFrame(dragRaf);
            dragRaf = 0;
        }
        if (pointerId !== null) {
            slot.releasePointerCapture?.(pointerId);
        }
        pointerId = null;
        isPointerDown = false;
        dragActive = false;
        deltaX = 0;
        deltaY = 0;
        slot.classList.remove('roastery-stack-dragging');
        ghosts.forEach(g => { g.style.transform = ''; });
    }

    function applyDragTransform() {
        dragRaf = 0;
        slot.style.transform = `translateX(${pendingDeltaX}px)`;
        if (!reducedMotion) {
            const shift = pendingDeltaX * 0.04;
            ghosts.forEach((g, i) => {
                const base = 1 - 0.012 * (i + 1);
                const boost = Math.min(Math.abs(pendingDeltaX) * 0.0003, 0.005);
                g.style.transform = `scale(${(base + boost).toFixed(4)}) translateX(${shift.toFixed(2)}px)`;
            });
        }
    }

    function animateSnapBack() {
        slot.classList.add('roastery-snap-back');
        slot.style.transform = '';
        setTimeout(() => slot.classList.remove('roastery-snap-back'), 220);
    }

    function go(direction /* 'left' | 'right' */, startOffsetX = 0) {
        if (isTransitioning) return;
        isTransitioning = true;

        if (transitionAnim) { transitionAnim.cancel(); transitionAnim = null; }
        if (incomingAnim) { incomingAnim.cancel(); incomingAnim = null; }
        if (incomingEl && incomingEl.parentNode) {
            incomingEl.parentNode.removeChild(incomingEl);
            incomingEl = null;
        }

        slot.classList.remove('roastery-snap-back');

        const activeCard = slot.querySelector('.coffee-card');
        if (activeCard) activeCard.dataset.suppressClick = '1';

        const nextIndex = direction === 'left'
            ? (current + 1) % items.length
            : (current - 1 + items.length) % items.length;

        const startX = Number.isFinite(startOffsetX) ? startOffsetX : 0;
        const exitToX = direction === 'left' ? -140 : 140;
        const enterFromX = direction === 'left' ? 140 : -140;

        incomingEl = makeCard(items[nextIndex]);
        incomingEl.style.position = 'absolute';
        incomingEl.style.top = '0';
        incomingEl.style.left = '0';
        incomingEl.style.right = '0';
        incomingEl.style.willChange = 'transform, opacity';
        incomingEl.style.pointerEvents = 'none';
        incomingEl.style.zIndex = '3';
        ghostLayer.style.visibility = 'hidden';
        counter.style.visibility = 'hidden';
        dots.style.visibility = 'hidden';
        wrapper.style.overflow = 'hidden';
        wrapper.appendChild(incomingEl);

        let finalized = false;
        const finalizeSwitch = () => {
            if (finalized) return;
            finalized = true;
            if (transitionAnim) { transitionAnim.cancel(); transitionAnim = null; }
            if (incomingAnim) { incomingAnim.cancel(); incomingAnim = null; }
            if (incomingEl && incomingEl.parentNode) {
                incomingEl.parentNode.removeChild(incomingEl);
                incomingEl = null;
            }
            wrapper.style.overflow = '';
            ghostLayer.style.visibility = '';
            counter.style.visibility = '';
            dots.style.visibility = '';
            current = nextIndex;
            slot.style.transform = '';
            slot.style.opacity = '';
            renderCurrent(true);
            isTransitioning = false;
        };

        const animOpts = { duration: ANIM_DURATION, easing: SPRING_EASING, fill: 'forwards' };

        transitionAnim = slot.animate(
            [
                { transform: `translateX(${startX}px)`, opacity: 1 },
                { transform: `translateX(${exitToX}px)`, opacity: 0 }
            ],
            animOpts
        );

        incomingAnim = incomingEl.animate(
            [
                { transform: `translateX(${enterFromX}px)`, opacity: 0 },
                { transform: 'translateX(0px)', opacity: 1 }
            ],
            animOpts
        );

        transitionAnim.addEventListener('finish', finalizeSwitch, { once: true });
        setTimeout(finalizeSwitch, ANIM_DURATION + 80);
    }

    function onPointerDown(e) {
        if (e.button !== undefined && e.button !== 0) return;
        if (isTransitioning) return;
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
        lastMoveTime = performance.now();
        lastMoveX = e.clientX;
        velocityX = 0;

        slot.setPointerCapture?.(pointerId);
    }

    function onPointerMove(e) {
        if (!isPointerDown || e.pointerId !== pointerId) return;

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

        const now = performance.now();
        const dt = now - lastMoveTime;
        if (dt > 0 && dt < 100) {
            velocityX = (e.clientX - lastMoveX) / dt;
        }
        lastMoveTime = now;
        lastMoveX = e.clientX;

        pendingDeltaX = deltaX;
        if (!dragRaf) dragRaf = requestAnimationFrame(applyDragTransform);

        e.preventDefault();
    }

    function onPointerEndLike(e) {
        if (!isPointerDown || e.pointerId !== pointerId) return;

        slot.releasePointerCapture?.(pointerId);

        const wasDrag = dragActive;
        const moved = deltaX;

        cleanupPointerState();

        if (!wasDrag) return;

        const elapsed = performance.now() - lastMoveTime;
        const isFling = elapsed < 120 && Math.abs(velocityX) > 0.4 && Math.abs(moved) > 20;

        if (Math.abs(moved) >= SWIPE_THRESHOLD || isFling) {
            const dir = moved < 0 ? 'left' : 'right';
            go(dir, moved);
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
    wrapper.appendChild(counter);
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

    // Sort by manual sortOrder; within a stack, by stackPos
    const sorted = activeCoffees.sort((a, b) => {
        const orderA = a.coffee.sortOrder !== undefined ? a.coffee.sortOrder : Infinity;
        const orderB = b.coffee.sortOrder !== undefined ? b.coffee.sortOrder : Infinity;
        if (orderA !== orderB) return orderA - orderB;
        if (a.coffee.stackId !== null && a.coffee.stackId === b.coffee.stackId) {
            return (a.coffee.stackPos || 0) - (b.coffee.stackPos || 0);
        }
        return 0;
    });

    // Group consecutive items that share a non-null stackId into stacks; everything else is a single card
    const groups = [];
    let gi = 0;
    while (gi < sorted.length) {
        const item = sorted[gi];
        const sid = item.coffee.stackId;
        if (sid !== null && sid !== undefined) {
            const stackItems = [item];
            gi++;
            while (gi < sorted.length && sorted[gi].coffee.stackId === sid) {
                stackItems.push(sorted[gi]);
                gi++;
            }
            if (stackItems.length === 1) {
                groups.push({ single: true, item: stackItems[0] });
            } else {
                groups.push({ single: false, items: stackItems });
            }
        } else {
            groups.push({ single: true, item });
            gi++;
        }
    }

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
    initBrewWaves(listEl);

    // Re-expand card if requested (e.g. after reset adjustments)
    if (expandAfterIndex !== undefined) {
        const card = document.querySelector(`.coffee-card[data-original-index="${expandAfterIndex}"]`);
        if (card) {
            card.classList.add('expanded');
            const wrapper = card.closest('.roastery-stack-wrapper');
            if (wrapper) wrapper.dispatchEvent(new CustomEvent('roastery-stack:sync-height', { bubbles: true }));
        }
    }

    // Signal onboarding that cards are in the DOM (idempotent listener in onboarding.js)
    document.dispatchEvent(new CustomEvent('coffees:rendered'));
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

    const activeSortOrders = coffees
        .filter(c => c.deleted !== true && c.sortOrder !== undefined)
        .map(c => c.sortOrder);
    const maxOrder = activeSortOrders.length > 0 ? Math.max(...activeSortOrders) : -1;

    coffees[originalIndex].deleted = false;
    delete coffees[originalIndex].deletedAt;
    coffees[originalIndex].sortOrder = maxOrder + 1;
    coffees[originalIndex].stackId = null;
    coffees[originalIndex].stackPos = 0;
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

    // Informational dose-size hint (flow speed guidance, no automatic adjustment)
    const hintEl = document.getElementById(`doseHint-${originalIndex}`);
    if (hintEl) {
        if (amount >= 24) {
            hintEl.textContent = 'Larger batch — flow runs slower; you may need to grind a touch coarser.';
            hintEl.classList.add('visible');
        } else if (amount <= 14) {
            hintEl.textContent = 'Small dose — flow runs faster; you may need to grind a touch finer.';
            hintEl.classList.add('visible');
        } else {
            hintEl.textContent = '';
            hintEl.classList.remove('visible');
        }
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

export function unstackShown(originalIndex) {
    const coffee = coffees[originalIndex];
    if (!coffee || !coffee.stackId) return;

    const stackId       = coffee.stackId;
    const stackSortOrder = coffee.sortOrder || 0;

    // Extract this card from the stack; place it just above the remaining stack.
    coffee.stackId   = null;
    coffee.stackPos  = 0;
    coffee.sortOrder = stackSortOrder - 0.5;

    // Re-number remaining members; solo-remaining -> also un-stack.
    const rem = coffees
        .filter(c => c.stackId === stackId && c.deleted !== true)
        .sort((a, b) => (a.stackPos || 0) - (b.stackPos || 0));

    if (rem.length === 1) {
        rem[0].stackId  = null;
        rem[0].stackPos = 0;
    } else {
        rem.forEach((c, i) => { c.stackPos = i; });
    }

    _drNormalizeSortOrders();
    saveCoffeesAndSync();
    renderCoffees();
}

// ==========================================
// DRAG-REORDER (Phase 3)
// Delegated from #coffeeList. Long-press gate sits before the existing
// swipe handler: cancels on horizontal movement (stack) or any movement
// > cancel-px before the timer, so the swipe handler always wins.
// ==========================================

const _DR_LONG_MS   = 260;
const _DR_SWIPE_PX  = 8;    // horizontal on a stack -> cancel, let swipe win
const _DR_MOVE_PX   = 18;   // vertical movement before timer -> scroll intent -> cancel
const _DR_MERGE_MIN = 0.30; // merge-zone: 30-70 % of target height
const _DR_MERGE_MAX = 0.70;
const _DR_GAP       = 22;   // .coffee-list gap (px)
const _DR_ASCROLL_Z = 80;   // auto-scroll edge zone (px)
const _DR_ASCROLL_V = 6;    // auto-scroll speed (px/frame)
const _DR_IGNORE = '.delete-btn,.edit-btn,.stack-front-btn,.timer-btn,'
    + '.feedback-slider,.apply-suggestion-btn,.adjust-btn,.history-btn,'
    + '.reset-adjustments-btn,input,select,textarea,button,'
    + '.color-picker-btn,.color-picker-popup,.inline-edit-input';

let _dr = null; // current drag state

function _drFindUnit(listEl, target) {
    let el = target;
    while (el && el.parentElement !== listEl) el = el.parentElement;
    return (el && el.parentElement === listEl) ? el : null;
}

function _drUnitOriginalIndices(el) {
    if (el.classList.contains('coffee-card')) {
        const i = parseInt(el.dataset.originalIndex);
        return isNaN(i) ? [] : [i];
    }
    return Array.from(el.querySelectorAll('.coffee-card'))
        .map(c => parseInt(c.dataset.originalIndex))
        .filter(n => !isNaN(n));
}

// Like _drUnitOriginalIndices but reads full stack membership from coffees[], not DOM.
// Needed because a stack wrapper only renders ONE .coffee-card at a time (the shown one).
function _drAllCoffeeIndices(el) {
    if (el.classList.contains('roastery-stack-wrapper')) {
        const shown = el.querySelector('.roastery-stack-slot .coffee-card');
        const shownIdx = shown ? parseInt(shown.dataset.originalIndex) : NaN;
        if (isNaN(shownIdx)) return [];
        const stackId = coffees[shownIdx] ? coffees[shownIdx].stackId : null;
        if (!stackId) return [shownIdx];
        return coffees.reduce((acc, c, i) => {
            if (c.stackId === stackId && c.deleted !== true) acc.push(i);
            return acc;
        }, []);
    }
    const idx = parseInt(el.dataset.originalIndex);
    return isNaN(idx) ? [] : [idx];
}

function _drResetVisuals() {
    if (!_dr) return;
    if (_dr.ghost)   { _dr.ghost.remove(); _dr.ghost = null; }
    if (_dr.unitEl)  { _dr.unitEl.style.opacity = ''; _dr.unitEl.style.pointerEvents = ''; }
    if (_dr.snaps)   { _dr.snaps.forEach(s => { s.el.style.transform = ''; s.el.style.transition = ''; }); }
    if (_dr.mergeTgt){ _dr.mergeTgt.classList.remove('drag-merge-target'); _dr.mergeTgt = null; }
    if (_dr.ascRaf)  { cancelAnimationFrame(_dr.ascRaf); _dr.ascRaf = null; }
}

function _drCancel() {
    if (!_dr) return;
    clearTimeout(_dr.timer);
    if (_dr.listEl) try { _dr.listEl.releasePointerCapture(_dr.pointerId); } catch (_) {}
    // Pre-lift solo cards hold capture on unitEl, not listEl yet — release both.
    if (_dr.unitEl && !_dr.isStack) try { _dr.unitEl.releasePointerCapture(_dr.pointerId); } catch (_) {}
    _drResetVisuals();
    _dr = null;
}

function _drLift(listEl) {
    const { unitEl, startX, startY } = _dr;
    const rect = unitEl.getBoundingClientRect();

    if (navigator.vibrate) navigator.vibrate(30);
    if (window.getSelection) window.getSelection().removeAllRanges();

    // Suppress any click that the browser fires after the drag touch ends.
    if (!_dr.isStack) unitEl.dataset.suppressClick = '1';

    unitEl.style.opacity = '0';
    unitEl.style.pointerEvents = 'none';

    const ghost = unitEl.cloneNode(true);
    ghost.style.cssText = 'position:fixed;left:0;top:0;margin:0;box-sizing:border-box;'
        + `width:${rect.width}px;height:${rect.height}px;`
        + 'pointer-events:none;z-index:1000;border-radius:16px;transition:none;'
        + 'box-shadow:0 14px 40px rgba(0,0,0,0.45);'
        + `transform:translate(${rect.left}px,${rect.top}px) scale(1.04);`;
    document.body.appendChild(ghost);

    const allUnits = Array.from(listEl.children);
    const origIdx  = allUnits.indexOf(unitEl);
    const snaps    = allUnits.map(el => {
        const r = el.getBoundingClientRect();
        return { el, top: r.top + window.scrollY, height: r.height };
    });

    Object.assign(_dr, {
        lifted: true, ghost, rect, listEl,
        allUnits, origIdx, snaps,
        targetIdx: origIdx, mergeTgt: null,
        fixedX: rect.left, ascRaf: null, lastPY: startY,
    });
}

// ── During drag: sibling shifts + auto-scroll ─────────────────────────────────

function _drComputeTargetIdx(pointerY) {
    const { snaps, origIdx } = _dr;
    const absY = pointerY + window.scrollY;
    for (let i = 0; i < snaps.length; i++) {
        if (absY < snaps[i].top + snaps[i].height / 2) return i;
    }
    return snaps.length - 1;
}

function _drUpdateShifts(pointerY) {
    const { snaps, origIdx } = _dr;
    const targetIdx = _drComputeTargetIdx(pointerY);
    _dr.targetIdx   = targetIdx;
    const dragH     = snaps[origIdx].height + _DR_GAP;

    snaps.forEach(({ el }, i) => {
        if (i === origIdx) return;
        let shift = 0;
        if      (targetIdx < origIdx && i >= targetIdx && i < origIdx) shift =  dragH;
        else if (targetIdx > origIdx && i > origIdx    && i <= targetIdx) shift = -dragH;
        el.style.transition = 'transform .18s cubic-bezier(.2,0,0,1.2)';
        el.style.transform  = shift ? `translateY(${shift}px)` : '';
    });
}

function _drRunAutoScroll() {
    if (!_dr || !_dr.lifted || _dr.ascRaf) return;
    const tick = () => {
        if (!_dr || !_dr.lifted) return;
        const py = _dr.lastPY;
        const vy = window.innerHeight;
        if      (py < _DR_ASCROLL_Z)      window.scrollBy(0, -_DR_ASCROLL_V);
        else if (py > vy - _DR_ASCROLL_Z) window.scrollBy(0,  _DR_ASCROLL_V);
        _dr.ascRaf = requestAnimationFrame(tick);
    };
    _dr.ascRaf = requestAnimationFrame(tick);
}

// ── During drag: merge-target highlight (30-70 % of target height) ────────────

function _drUpdateMerge(pointerY) {
    // Use live hit-test so stacks (which are taller) contribute their actual height.
    // Ghost has pointer-events:none so elementFromPoint reaches real list units.
    // x is fixed to the card rail center so merge detection works on the vertical rail.
    const hitX  = _dr.fixedX + _dr.rect.width / 2;
    const hit   = document.elementFromPoint(hitX, pointerY);
    const tgtEl = hit ? _drFindUnit(_dr.listEl, hit) : null;
    let newMTgt = null;

    if (tgtEl && tgtEl !== _dr.unitEl) {
        const r    = tgtEl.getBoundingClientRect();
        const relY = (pointerY - r.top) / r.height;
        if (relY >= _DR_MERGE_MIN && relY <= _DR_MERGE_MAX) {
            newMTgt = tgtEl;
        }
    }

    if (newMTgt !== _dr.mergeTgt) {
        if (_dr.mergeTgt) _dr.mergeTgt.classList.remove('drag-merge-target');
        if (newMTgt)      newMTgt.classList.add('drag-merge-target');
        _dr.mergeTgt = newMTgt;
    }
}

// ── Drop: normalize + persist ─────────────────────────────────────────────────

function _drNormalizeSortOrders() {
    const active = coffees.filter(c => c.deleted !== true)
        .sort((a, b) => {
            if ((a.sortOrder || 0) !== (b.sortOrder || 0)) return (a.sortOrder || 0) - (b.sortOrder || 0);
            if (a.stackId && a.stackId === b.stackId) return (a.stackPos || 0) - (b.stackPos || 0);
            return 0;
        });
    let pos = 0, gi = 0;
    while (gi < active.length) {
        const c = active[gi];
        if (c.stackId) {
            const sid = c.stackId;
            while (gi < active.length && active[gi].stackId === sid) { active[gi].sortOrder = pos; gi++; }
        } else {
            c.sortOrder = pos; gi++;
        }
        pos++;
    }
}

function _drCommitMerge() {
    const { snaps, origIdx, mergeTgt, unitEl } = _dr;
    _drResetVisuals();

    const targetIndices = _drAllCoffeeIndices(mergeTgt);
    const dragIndices   = _drAllCoffeeIndices(unitEl);
    if (!targetIndices.length || !dragIndices.length) { _dr = null; return; }

    // Resolve or create target stackId
    let targetStackId = coffees[targetIndices[0]].stackId;
    if (!targetStackId) {
        targetStackId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
        targetIndices.forEach(i => { coffees[i].stackId = targetStackId; coffees[i].stackPos = 0; });
    }

    // Append dragged coffees to end of target stack
    const existing = coffees.filter(c => c.stackId === targetStackId && c.deleted !== true);
    let maxPos = existing.reduce((m, c) => Math.max(m, c.stackPos || 0), -1);
    dragIndices.forEach(i => {
        if (coffees[i].stackId === targetStackId) return;
        coffees[i].stackId  = targetStackId;
        coffees[i].stackPos = ++maxPos;
    });

    // All stack members get the target's current sortOrder so they cluster together
    const baseSO = coffees[targetIndices[0]].sortOrder || 0;
    coffees.filter(c => c.stackId === targetStackId && c.deleted !== true)
           .forEach(c => { c.sortOrder = baseSO; });

    _drNormalizeSortOrders();
    saveCoffeesAndSync();
    renderCoffees();
    _dr = null;
}

function _drCommitReorder() {
    const { snaps, origIdx, targetIdx } = _dr;
    _drResetVisuals();

    if (targetIdx === origIdx) { _dr = null; return; }

    // Move the dragged unit (solo card or entire stack) to the target position.
    // All cards in a stack share the same sortOrder so they stay grouped.
    const order = Array.from({ length: snaps.length }, (_, i) => i);
    order.splice(origIdx, 1);
    order.splice(targetIdx, 0, origIdx);

    order.forEach((snapIdx, pos) => {
        _drAllCoffeeIndices(snaps[snapIdx].el).forEach(j => { coffees[j].sortOrder = pos; });
    });

    _drNormalizeSortOrders();
    saveCoffeesAndSync();
    renderCoffees();
    _dr = null;
}

export function initDragReorder() {
    const listEl = document.getElementById('coffeeList');
    if (!listEl || listEl._drInit) return;
    listEl._drInit = true;

    listEl.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (_dr) _drCancel();
        if (e.target.closest(_DR_IGNORE)) return;
        const unitEl = _drFindUnit(listEl, e.target);
        if (!unitEl) return;

        const isStack = unitEl.classList.contains('roastery-stack-wrapper');
        const pid = e.pointerId;
        // For solo cards: capture immediately so the browser cannot fire pointercancel
        // during the 260ms wait (stacks already capture via the slot's internal handler).
        if (!isStack) try { unitEl.setPointerCapture(pid); } catch (_) {}
        // FIX A: transfer capture to listEl and lift — fires even if finger stays still.
        const timer = setTimeout(() => {
            if (!_dr || _dr.pointerId !== pid || _dr.lifted) return;
            try { listEl.setPointerCapture(pid); } catch (_) {}
            _drLift(listEl);
        }, _DR_LONG_MS);

        _dr = { pointerId: pid, startX: e.clientX, startY: e.clientY,
                timer, unitEl, isStack, lifted: false, listEl };
    });

    listEl.addEventListener('pointermove', (e) => {
        if (!_dr || e.pointerId !== _dr.pointerId) return;

        if (!_dr.lifted) {
            // Swipe/scroll detection before lift
            const adx = Math.abs(e.clientX - _dr.startX);
            const ady = Math.abs(e.clientY - _dr.startY);
            if (_dr.isStack && adx > _DR_SWIPE_PX && adx > ady) { _drCancel(); return; } // horizontal -> swipe wins
            if (ady > _DR_MOVE_PX)                               { _drCancel(); return; } // vertical -> scroll wins
            return;
        }

        e.preventDefault();
        _dr.lastPY = e.clientY;
        const ty = _dr.rect.top + (e.clientY - _dr.startY);
        _dr.ghost.style.transform = `translate(${_dr.fixedX}px,${ty}px) scale(1.03)`;

        _drUpdateShifts(e.clientY);
        _drUpdateMerge(e.clientY);
        _drRunAutoScroll();
    });

    const onEnd = (e) => {
        if (!_dr || e.pointerId !== _dr.pointerId) return;
        clearTimeout(_dr.timer);
        if (_dr.listEl) try { _dr.listEl.releasePointerCapture(_dr.pointerId); } catch (_) {}
        if (_dr.unitEl && !_dr.isStack) try { _dr.unitEl.releasePointerCapture(_dr.pointerId); } catch (_) {}
        if (!_dr.lifted) { _dr = null; return; }
        if (_dr.mergeTgt) _drCommitMerge();
        else              _drCommitReorder();
    };
    listEl.addEventListener('pointerup',     onEnd);
    // FIX 2: suppress native scroll during drag so the browser does not fire pointercancel.
    listEl.addEventListener('touchmove', e => { if (_dr && _dr.lifted) e.preventDefault(); }, { passive: false });
    listEl.addEventListener('pointercancel', onEnd);
}

// Register functions on window for onclick handlers
window.deleteCoffee = deleteCoffee;
window.restoreCoffee = restoreCoffee;
window.permanentDeleteCoffee = permanentDeleteCoffee;
window.updateCoffeeAmountLive = updateCoffeeAmountLive;
window.unstackShown = unstackShown;
