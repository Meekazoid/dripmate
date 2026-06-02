// ==========================================
// ONBOARDING — Activation Overlay + Coachmark Tour v2
// Dependency-free spotlight tour (no external libs)
// ==========================================

const KEY_PHASE1    = 'onboardingV1Done';
const KEY_PHASE2    = 'onboardingV2Done';
const KEY_ACTIVATED = 'justActivated';
const KEY_TIPS_HINT = 'quickTipsHintShown';

// ==========================================
// PHASE 1 — 2 steps, empty screen, no interaction needed
// Archive step removed (covered in Quick Tips instead)
// ==========================================

const PHASE1_STEPS = [
    {
        targetSelector: '.global-grinder-selector',
        title: 'Your Setup',
        body: "Set your grinder & brew method here — every recommendation adapts to your gear. You'll pick these in a moment.",
        placement: 'bottom',
    },
    {
        targetSelector: '#cameraBtn',
        title: 'Add a Coffee',
        body: "Scan your coffee bag — or upload a photo or enter it manually. Scans don't always nail it, so the alternatives are right there.",
        placement: 'bottom',
    },
];

// ==========================================
// PHASE 2 — 5 steps, follows natural brew workflow
// Card is expanded for steps 2–5
// ==========================================

const PHASE2_STEPS = [
    {
        targetSelector: '.coffee-card',
        title: 'Open Your Card',
        body: "Tap a card to open it — this is where you brew.",
        placement: 'bottom',
        expandCard: true,
    },
    {
        targetSelector: '.roast-date-section',
        title: 'Roast Date',
        body: "Set the roast date if it's on the bag — freshness shapes the recommendation.",
        placement: 'bottom',
        needsExpandedCard: true,
    },
    {
        targetSelector: '.ratio-control',
        title: 'Coffee Amount',
        body: "Set your dose in grams — stick close to the suggested ratio.",
        placement: 'bottom',
        needsExpandedCard: true,
    },
    {
        targetSelector: '.param-grid',
        title: 'Brew It',
        body: "Grind, temperature and the timer guide your pour, tuned to your setup (or sensible defaults).",
        placement: 'bottom',
        needsExpandedCard: true,
    },
    {
        targetSelector: '.feedback-section',
        title: 'Rate Your Cup',
        body: "After brewing, rate the cup — dripmate fine-tunes grind & temperature for next time.",
        placement: 'top',
        needsExpandedCard: true,
    },
];

// ==========================================
// MODULE STATE
// ==========================================

let _spotlightEl  = null;
let _tooltipEl    = null;
let _blockerEl    = null;
let _resizeObs    = null;
let _scrollFn     = null;
let _tourActive   = false;  // prevents double-start

// ==========================================
// PUBLIC API
// ==========================================

export function initOnboarding() {
    // Check for first-activation flag set by settings.js
    const justActivated = localStorage.getItem(KEY_ACTIVATED);
    if (justActivated && !localStorage.getItem(KEY_PHASE1)) {
        localStorage.removeItem(KEY_ACTIVATED);
        setTimeout(showOnboardingOverlay, 700);
    }

    // Event-based Phase 2 trigger: fires whenever renderCoffees() runs
    document.addEventListener('coffees:rendered', () => {
        maybeStartOnboardingPhase2();
    });
}

export function startOnboardingPhase1() {
    _startTour(PHASE1_STEPS, () => {
        localStorage.setItem(KEY_PHASE1, '1');
        _showFinishHint('Now add your first coffee to continue.');
    });
}

export function maybeStartOnboardingPhase2() {
    if (_tourActive) return;
    if (!localStorage.getItem(KEY_PHASE1)) return;
    if (localStorage.getItem(KEY_PHASE2)) return;
    if (!document.querySelector('.coffee-card')) return;

    _tourActive = true;
    setTimeout(() => {
        // If tour was already destroyed in the meantime (e.g. replayOnboarding), abort
        if (localStorage.getItem(KEY_PHASE2)) { _tourActive = false; return; }
        _startTour(PHASE2_STEPS, () => {
            _tourActive = false;
            localStorage.setItem(KEY_PHASE2, '1');
            _showPhase2CompletionHint();
        });
    }, 600);
}

export function replayOnboarding() {
    _destroySpotlight();
    _tourActive = false;
    localStorage.removeItem(KEY_PHASE1);
    localStorage.removeItem(KEY_PHASE2);
    localStorage.removeItem('setupChosen');
    showOnboardingOverlay();
}

export function openQuickTips() {
    const modal = document.getElementById('quickTipsModal');
    if (modal) modal.classList.add('active');
}

export function closeQuickTips() {
    const modal = document.getElementById('quickTipsModal');
    if (modal) modal.classList.remove('active');
}

// ==========================================
// ACTIVATION OVERLAY MODAL (theme-adaptive)
// ==========================================

function showOnboardingOverlay() {
    const existing = document.getElementById('onboardingOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'modal active ob-overlay';

    overlay.innerHTML = `
        <div class="modal-content ob-overlay-content">
            <div class="ob-overlay-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><use href="#icon-coffee"/></svg>
            </div>
            <h2 class="ob-overlay-title">Welcome to dripmate!</h2>
            <p class="ob-overlay-body">Photograph your coffee, get brew parameters tuned to your gear.</p>
            <p class="ob-overlay-note">Your device is now linked. To use dripmate on another device, request a login link in Settings.</p>
            <div class="ob-overlay-actions">
                <button type="button" class="ob-btn-primary" id="obShowAroundBtn">Show me around</button>
                <button type="button" class="ob-btn-secondary" id="obSkipBtn">Skip</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#obShowAroundBtn').addEventListener('click', () => {
        overlay.remove();
        startOnboardingPhase1();
    });
    overlay.querySelector('#obSkipBtn').addEventListener('click', () => {
        overlay.remove();
        localStorage.setItem(KEY_PHASE1, '1');
    });
}

// ==========================================
// COACHMARK TOUR ENGINE
// ==========================================

function _startTour(steps, onComplete) {
    _tourActive = true;
    _addBlocker();
    _showStep(steps, 0, onComplete);
}

function _showStep(steps, index, onComplete) {
    _destroySpotlight();

    if (index >= steps.length) {
        _removeBlocker();
        _tourActive = false;
        onComplete();
        return;
    }

    const step = steps[index];

    // Expand first coffee card if this step needs it
    if (step.needsExpandedCard || step.expandCard) {
        const card = document.querySelector('.coffee-card');
        if (!card) {
            _showStep(steps, index + 1, onComplete);
            return;
        }
        if (!card.classList.contains('expanded')) {
            card.classList.add('expanded');
            const wrapper = card.closest('.roastery-stack-wrapper');
            if (wrapper) wrapper.dispatchEvent(new CustomEvent('roastery-stack:sync-height', { bubbles: true }));
        }
    }

    const target = document.querySelector(step.targetSelector);
    if (!target) {
        _showStep(steps, index + 1, onComplete);
        return;
    }

    // Scroll target to center, then measure in next frame after layout settles
    target.scrollIntoView({ block: 'center', behavior: 'instant' });

    // Double-rAF: ensures CSS transitions (card expand) + scroll have settled
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const fresh = document.querySelector(step.targetSelector);
        if (!fresh) { _showStep(steps, index + 1, onComplete); return; }
        _buildSpotlight(fresh, step, index, steps, onComplete);
    }));
}

function _buildSpotlight(target, step, index, steps, onComplete) {
    const pad     = 8;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLast  = index === steps.length - 1;

    // Spotlight ring — box-shadow creates the dark veil
    _spotlightEl = document.createElement('div');
    _spotlightEl.className = 'ob-spotlight';
    _applySpotlightRect(target.getBoundingClientRect(), pad);
    if (!reduced) {
        _spotlightEl.style.transition = 'top 0.18s, left 0.18s, width 0.18s, height 0.18s';
    }
    document.body.appendChild(_spotlightEl);

    // Tooltip
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'ob-tooltip';
    _tooltipEl.setAttribute('role', 'dialog');
    _tooltipEl.setAttribute('aria-modal', 'true');
    _tooltipEl.innerHTML = `
        <div class="ob-tooltip-title">${_esc(step.title)}</div>
        <div class="ob-tooltip-body">${_esc(step.body)}</div>
        <div class="ob-tooltip-actions">
            ${index > 0 ? '<button type="button" class="ob-btn ob-btn-back">← Back</button>' : ''}
            <span class="ob-step-counter">${index + 1} / ${steps.length}</span>
            <button type="button" class="ob-btn ob-btn-skip">Skip</button>
            <button type="button" class="ob-btn ob-btn-next">${isLast ? 'Done ✓' : 'Next →'}</button>
        </div>
    `;
    document.body.appendChild(_tooltipEl);

    _positionTooltip(target.getBoundingClientRect(), step.placement);
    if (!reduced) _tooltipEl.style.animation = 'ob-fade-in 0.15s ease';

    // Button handlers
    _tooltipEl.querySelector('.ob-btn-next').addEventListener('click', () => _showStep(steps, index + 1, onComplete));
    _tooltipEl.querySelector('.ob-btn-skip')?.addEventListener('click', () => {
        _destroySpotlight();
        _removeBlocker();
        _tourActive = false;
        onComplete();
    });
    _tooltipEl.querySelector('.ob-btn-back')?.addEventListener('click', () => _showStep(steps, index - 1, onComplete));

    // Recompute on scroll / resize
    _scrollFn = () => {
        if (!_spotlightEl || !_tooltipEl) return;
        const r = target.getBoundingClientRect();
        _applySpotlightRect(r, pad);
        _positionTooltip(r, step.placement);
    };
    window.addEventListener('scroll', _scrollFn, { passive: true });
    window.addEventListener('resize', _scrollFn, { passive: true });

    if (typeof ResizeObserver !== 'undefined' && !_resizeObs) {
        _resizeObs = new ResizeObserver(_scrollFn);
        _resizeObs.observe(document.documentElement);
    }
}

function _applySpotlightRect(rect, pad) {
    if (!_spotlightEl) return;
    _spotlightEl.style.top    = `${rect.top    - pad}px`;
    _spotlightEl.style.left   = `${rect.left   - pad}px`;
    _spotlightEl.style.width  = `${rect.width  + pad * 2}px`;
    _spotlightEl.style.height = `${rect.height + pad * 2}px`;
}

function _positionTooltip(rect, placement) {
    if (!_tooltipEl) return;
    const tt  = _tooltipEl;
    const gap = 14;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;

    tt.style.visibility = 'hidden';
    tt.style.top  = '0px';
    tt.style.left = '0px';
    tt.style.maxWidth = `${Math.min(300, vw - 32)}px`;

    const ttW = tt.offsetWidth  || 260;
    const ttH = tt.offsetHeight || 120;

    let top, left;

    if (placement === 'bottom') {
        top  = rect.bottom + gap;
        left = rect.left + rect.width / 2 - ttW / 2;
        if (top + ttH > vh - 16) top = rect.top - ttH - gap;
    } else if (placement === 'top') {
        top  = rect.top - ttH - gap;
        left = rect.left + rect.width / 2 - ttW / 2;
        if (top < 16) top = rect.bottom + gap;
    } else if (placement === 'left') {
        top  = rect.top + rect.height / 2 - ttH / 2;
        left = rect.left - ttW - gap;
        if (left < 16) left = rect.right + gap;
    } else {
        top  = rect.top + rect.height / 2 - ttH / 2;
        left = rect.right + gap;
        if (left + ttW > vw - 16) left = rect.left - ttW - gap;
    }

    left = Math.max(16, Math.min(left, vw - ttW - 16));
    top  = Math.max(16, Math.min(top,  vh - ttH - 16));

    tt.style.top        = `${top}px`;
    tt.style.left       = `${left}px`;
    tt.style.visibility = 'visible';
}

// ==========================================
// BLOCKER (prevents app interaction during tour)
// ==========================================

function _addBlocker() {
    if (_blockerEl) return;
    _blockerEl = document.createElement('div');
    _blockerEl.className = 'ob-blocker';
    document.body.appendChild(_blockerEl);
}

function _removeBlocker() {
    if (_blockerEl) { _blockerEl.remove(); _blockerEl = null; }
}

// ==========================================
// CLEANUP
// ==========================================

function _destroySpotlight() {
    if (_spotlightEl) { _spotlightEl.remove(); _spotlightEl = null; }
    if (_tooltipEl)   { _tooltipEl.remove();   _tooltipEl   = null; }
    if (_resizeObs)   { _resizeObs.disconnect(); _resizeObs = null; }
    if (_scrollFn) {
        window.removeEventListener('scroll', _scrollFn);
        window.removeEventListener('resize', _scrollFn);
        _scrollFn = null;
    }
}

// ==========================================
// FINISH / COMPLETION HINTS
// ==========================================

function _showFinishHint(text) {
    const el = document.createElement('div');
    el.className = 'ob-finish-hint';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 400);
    }, 3200);
}

function _showPhase2CompletionHint() {
    if (localStorage.getItem(KEY_TIPS_HINT)) return;
    localStorage.setItem(KEY_TIPS_HINT, '1');
    const el = document.createElement('div');
    el.className = 'ob-finish-hint';
    el.innerHTML = 'Want a quick icon guide? Open <strong>Quick Tips</strong> in Settings.';
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 400);
    }, 5000);
}

// ==========================================
// HELPERS
// ==========================================

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
