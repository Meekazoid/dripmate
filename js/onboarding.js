// ==========================================
// ONBOARDING — Activation Overlay + Coachmark Tour
// Dependency-free spotlight tour (no external libs)
// ==========================================

const KEY_PHASE1 = 'onboardingV1Done';
const KEY_PHASE2 = 'onboardingV2Done';
const KEY_JUST_ACTIVATED = 'justActivated';

// ==========================================
// PHASE 1 STEPS (post-activation, empty screen)
// ==========================================

const PHASE1_STEPS = [
    {
        targetSelector: '.global-grinder-selector',
        title: 'Your Setup',
        body: 'Set your grinder & brew method first — every recommendation adapts to your gear.',
        placement: 'bottom',
    },
    {
        targetSelector: '#cameraBtn',
        title: 'Add a Coffee',
        body: 'Tap to scan your coffee bag — or upload a photo or enter it manually. Scans don\'t always nail it, so the alternatives are right there.',
        placement: 'bottom',
    },
    {
        targetSelector: '#trashBinBtn',
        title: 'Archive',
        body: 'Archive coffees you\'re not brewing now — they keep all their tuning, and you can restore or permanently delete them anytime.',
        placement: 'left',
    },
];

// ==========================================
// PHASE 2 STEPS (first coffee card exists)
// ==========================================

const PHASE2_STEPS = [
    {
        targetSelector: '.coffee-card',
        title: 'Open Your Card',
        body: 'Tap to open your card — this is where the brewing happens. Inside you get grind setting, temperature, ratio, water amount, brew steps and a timer, all tuned to your setup (or sensible defaults).',
        placement: 'bottom',
    },
    {
        targetSelector: '.coffee-card .feedback-section',
        title: 'Rate Your Cup',
        body: 'After brewing, rate the cup — dripmate fine-tunes grind & temperature for next time.',
        placement: 'top',
    },
    {
        targetSelector: '.coffee-card .edit-btn',
        title: 'Edit Details',
        body: 'Tap the pencil to add or fix any missing details on a coffee.',
        placement: 'bottom',
    },
];

// ==========================================
// SPOTLIGHT STATE
// ==========================================

let _spotlightEl = null;
let _tooltipEl = null;
let _resizeObserver = null;
let _scrollHandler = null;
let _currentTarget = null;
let _currentPlacement = null;

// ==========================================
// PUBLIC API
// ==========================================

export function initOnboarding() {
    const justActivated = localStorage.getItem(KEY_JUST_ACTIVATED);
    if (justActivated && !localStorage.getItem(KEY_PHASE1)) {
        localStorage.removeItem(KEY_JUST_ACTIVATED);
        // Small delay to let the page settle after reload/magic-link init
        setTimeout(showOnboardingOverlay, 700);
    }
}

export function startOnboardingPhase1() {
    _startTour(PHASE1_STEPS, () => {
        localStorage.setItem(KEY_PHASE1, '1');
    });
}

export function maybeStartOnboardingPhase2() {
    if (!localStorage.getItem(KEY_PHASE1)) return;
    if (localStorage.getItem(KEY_PHASE2)) return;
    const firstCard = document.querySelector('.coffee-card');
    if (!firstCard) return;
    setTimeout(() => {
        _startTour(PHASE2_STEPS, () => {
            localStorage.setItem(KEY_PHASE2, '1');
        });
    }, 400);
}

export function replayOnboarding() {
    localStorage.removeItem(KEY_PHASE1);
    localStorage.removeItem(KEY_PHASE2);
    localStorage.removeItem('setupChosen');
    showOnboardingOverlay();
}

// ==========================================
// ACTIVATION OVERLAY MODAL
// Sand-look toast-inspired modal, theme-adaptive
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
                <button class="btn ob-btn-primary" id="obShowAroundBtn">Show me around</button>
                <button class="btn ob-btn-secondary" id="obSkipBtn">Skip</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('obShowAroundBtn').addEventListener('click', () => {
        overlay.remove();
        startOnboardingPhase1();
    });

    document.getElementById('obSkipBtn').addEventListener('click', () => {
        overlay.remove();
        localStorage.setItem(KEY_PHASE1, '1');
    });
}

// ==========================================
// COACHMARK TOUR ENGINE
// ==========================================

function _startTour(steps, onComplete) {
    _showStep(steps, 0, onComplete);
}

function _showStep(steps, index, onComplete) {
    _destroySpotlight();

    if (index >= steps.length) {
        onComplete();
        return;
    }

    const step = steps[index];
    const target = document.querySelector(step.targetSelector);

    if (!target) {
        _showStep(steps, index + 1, onComplete);
        return;
    }

    _currentTarget = target;
    _currentPlacement = step.placement;

    _buildSpotlight(target, step, index, steps, onComplete);
}

function _buildSpotlight(target, step, index, steps, onComplete) {
    const rect = target.getBoundingClientRect();
    const pad = 8;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Spotlight ring — box-shadow creates dark veil around it
    _spotlightEl = document.createElement('div');
    _spotlightEl.className = 'ob-spotlight';
    _applySpotlightRect(rect, pad);
    if (!reduced) _spotlightEl.style.transition = 'top 0.2s, left 0.2s, width 0.2s, height 0.2s';
    document.body.appendChild(_spotlightEl);

    // Tooltip
    const isLast = index === steps.length - 1;
    _tooltipEl = document.createElement('div');
    _tooltipEl.className = 'ob-tooltip';
    _tooltipEl.setAttribute('role', 'dialog');
    _tooltipEl.setAttribute('aria-modal', 'true');
    _tooltipEl.innerHTML = `
        <div class="ob-tooltip-title">${_esc(step.title)}</div>
        <div class="ob-tooltip-body">${_esc(step.body)}</div>
        <div class="ob-tooltip-actions">
            ${index > 0 ? '<button class="ob-btn ob-btn-back">← Back</button>' : ''}
            <span class="ob-step-counter">${index + 1} / ${steps.length}</span>
            <button class="ob-btn ob-btn-skip">Skip</button>
            <button class="ob-btn ob-btn-next">${isLast ? 'Done ✓' : 'Next →'}</button>
        </div>
    `;
    document.body.appendChild(_tooltipEl);

    _positionTooltip(rect, step.placement);
    if (!reduced) _tooltipEl.style.animation = 'ob-fade-in 0.18s ease';

    _tooltipEl.querySelector('.ob-btn-next').addEventListener('click', () => {
        _showStep(steps, index + 1, onComplete);
    });
    _tooltipEl.querySelector('.ob-btn-skip')?.addEventListener('click', () => {
        _destroySpotlight();
        onComplete();
    });
    _tooltipEl.querySelector('.ob-btn-back')?.addEventListener('click', () => {
        _showStep(steps, index - 1, onComplete);
    });

    // Reposition on resize / scroll
    _scrollHandler = () => _reposition(target, step.placement);
    window.addEventListener('scroll', _scrollHandler, { passive: true });
    window.addEventListener('resize', _scrollHandler, { passive: true });

    if (typeof ResizeObserver !== 'undefined' && !_resizeObserver) {
        _resizeObserver = new ResizeObserver(_scrollHandler);
        _resizeObserver.observe(document.documentElement);
    }
}

function _applySpotlightRect(rect, pad) {
    if (!_spotlightEl) return;
    _spotlightEl.style.top    = `${rect.top    - pad}px`;
    _spotlightEl.style.left   = `${rect.left   - pad}px`;
    _spotlightEl.style.width  = `${rect.width  + pad * 2}px`;
    _spotlightEl.style.height = `${rect.height + pad * 2}px`;
}

function _reposition(target, placement) {
    if (!_spotlightEl || !_tooltipEl) return;
    const rect = target.getBoundingClientRect();
    _applySpotlightRect(rect, 8);
    _positionTooltip(rect, placement);
}

function _positionTooltip(rect, placement) {
    if (!_tooltipEl) return;
    const tt = _tooltipEl;
    const margin = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // First pass: measure (approximate)
    tt.style.visibility = 'hidden';
    tt.style.top = '0px';
    tt.style.left = '0px';
    tt.style.maxWidth = `${Math.min(320, vw - 32)}px`;

    // Force layout to get tooltip size
    const ttW = tt.offsetWidth || 280;
    const ttH = tt.offsetHeight || 120;

    let top, left;

    if (placement === 'bottom') {
        top  = rect.bottom + margin;
        left = rect.left + rect.width / 2 - ttW / 2;
        // Fallback to top if no room
        if (top + ttH > vh - 16) { top = rect.top - ttH - margin; }
    } else if (placement === 'top') {
        top  = rect.top - ttH - margin;
        left = rect.left + rect.width / 2 - ttW / 2;
        if (top < 16) { top = rect.bottom + margin; }
    } else if (placement === 'left') {
        top  = rect.top + rect.height / 2 - ttH / 2;
        left = rect.left - ttW - margin;
        if (left < 16) { left = rect.right + margin; }
    } else { // right
        top  = rect.top + rect.height / 2 - ttH / 2;
        left = rect.right + margin;
        if (left + ttW > vw - 16) { left = rect.left - ttW - margin; }
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, vw - ttW - 16));
    top  = Math.max(16, Math.min(top,  vh - ttH - 16));

    tt.style.top  = `${top}px`;
    tt.style.left = `${left}px`;
    tt.style.visibility = 'visible';
}

function _destroySpotlight() {
    if (_spotlightEl)   { _spotlightEl.remove();  _spotlightEl = null; }
    if (_tooltipEl)     { _tooltipEl.remove();     _tooltipEl = null; }
    if (_resizeObserver){ _resizeObserver.disconnect(); _resizeObserver = null; }
    if (_scrollHandler) {
        window.removeEventListener('scroll', _scrollHandler);
        window.removeEventListener('resize', _scrollHandler);
        _scrollHandler = null;
    }
    _currentTarget = null;
    _currentPlacement = null;
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
