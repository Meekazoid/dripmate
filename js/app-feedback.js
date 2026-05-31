// ==========================================
// APP FEEDBACK MODULE
// Namensraum: appFeedback / app-feedback — nicht mit dem Cupping-System verwechseln
// ==========================================

import { CONFIG } from './config.js';
import { getOrCreateDeviceId, getToken } from './services/backend-sync.js';
import { coffees } from './state.js';

const NUDGE_FLAG = 'appFeedbackNudgeShown';

// Capture document.referrer before any navigation can change it.
// The inline script in <head> sets window.__entryReferrer; use that if available.
const _entryReferrer = window.__entryReferrer !== undefined
    ? window.__entryReferrer
    : document.referrer;

function detectPlatform() {
    try {
        if (navigator.standalone === true) return 'ios_pwa';
        const ref = _entryReferrer || '';
        if (ref.startsWith('android-app://')) return 'android_app';
        if (window.Capacitor || window.cordova) return 'android_app';
        if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
        return 'web';
    } catch (_) { return 'other'; }
}

let _selectedCategory = null;

function _resetForm() {
    _selectedCategory = null;
    document.querySelectorAll('.app-feedback-chip').forEach(b => b.classList.remove('active'));
    document.getElementById('appFeedbackMessage').value = '';
    document.getElementById('appFeedbackGrinderUnsupported').checked = false;
    document.getElementById('appFeedbackMethodUnsupported').checked  = false;
    const grinderGroup = document.getElementById('appFeedbackGrinderGroup');
    const methodGroup  = document.getElementById('appFeedbackMethodGroup');
    if (grinderGroup) grinderGroup.style.display = 'none';
    if (methodGroup)  methodGroup.style.display  = 'none';
    document.getElementById('appFeedbackGrinderText').value = '';
    document.getElementById('appFeedbackMethodText').value  = '';
    const statusEl = document.getElementById('appFeedbackStatus');
    if (statusEl) statusEl.style.display = 'none';
    const submitBtn = document.getElementById('appFeedbackSubmitBtn');
    if (submitBtn) submitBtn.disabled = false;
}

export function openAppFeedback() {
    document.getElementById('appFeedbackModal').classList.add('active');
    _dismissNudge();
}

export function closeAppFeedback() {
    document.getElementById('appFeedbackModal').classList.remove('active');
}

async function _submitAppFeedback() {
    const statusEl  = document.getElementById('appFeedbackStatus');
    const submitBtn = document.getElementById('appFeedbackSubmitBtn');
    const message   = document.getElementById('appFeedbackMessage').value.trim();

    if (!message) {
        statusEl.textContent  = 'Please enter a message.';
        statusEl.className    = 'app-feedback-status app-feedback-status--error';
        statusEl.style.display = 'block';
        return;
    }

    const grinderChk         = document.getElementById('appFeedbackGrinderUnsupported');
    const methodChk          = document.getElementById('appFeedbackMethodUnsupported');
    const grinderUnsupported = grinderChk.checked ? 1 : 0;
    const methodUnsupported  = methodChk.checked  ? 1 : 0;

    const grinderTextRaw = document.getElementById('appFeedbackGrinderText').value.trim();
    const methodTextRaw  = document.getElementById('appFeedbackMethodText').value.trim();

    const body = {
        category:           _selectedCategory,
        message,
        grinderUnsupported,
        methodUnsupported,
        appVersion:         CONFIG.appVersion,
        platform:           detectPlatform(),
    };
    if (grinderUnsupported && grinderTextRaw) body.grinderText = grinderTextRaw;
    if (methodUnsupported  && methodTextRaw)  body.methodText  = methodTextRaw;

    submitBtn.disabled = true;
    statusEl.style.display = 'none';

    try {
        const res = await fetch(`${CONFIG.backendUrl}/api/app-feedback`, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${getToken()}`,
                'X-Device-ID':   getOrCreateDeviceId(),
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (res.ok && data.success) {
            _resetForm();
            statusEl.textContent   = 'Feedback sent — thanks!';
            statusEl.className     = 'app-feedback-status app-feedback-status--success';
            statusEl.style.display = 'block';
            setTimeout(() => {
                closeAppFeedback();
                statusEl.style.display = 'none';
            }, 1800);
        } else {
            statusEl.textContent   = data.error || "Couldn't send. Please try again.";
            statusEl.className     = 'app-feedback-status app-feedback-status--error';
            statusEl.style.display = 'block';
            submitBtn.disabled     = false;
        }
    } catch (_) {
        statusEl.textContent   = 'Network error — please try again.';
        statusEl.className     = 'app-feedback-status app-feedback-status--error';
        statusEl.style.display = 'block';
        submitBtn.disabled     = false;
    }
}

function _dismissNudge() {
    localStorage.setItem(NUDGE_FLAG, '1');
    const nudge = document.getElementById('appFeedbackNudge');
    if (nudge) nudge.style.display = 'none';
}

export function checkNudge() {
    if (localStorage.getItem(NUDGE_FLAG)) return;
    const active = coffees.filter(c => !c.deleted).length;
    if (active < 7) return;
    const nudge = document.getElementById('appFeedbackNudge');
    if (nudge) nudge.style.display = 'block';
}

export function initAppFeedback() {
    // Category chip toggles
    document.querySelectorAll('.app-feedback-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.dataset.category;
            if (_selectedCategory === val) {
                _selectedCategory = null;
                btn.classList.remove('active');
            } else {
                _selectedCategory = val;
                document.querySelectorAll('.app-feedback-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Equipment checkboxes reveal text inputs
    const grinderChk   = document.getElementById('appFeedbackGrinderUnsupported');
    const methodChk    = document.getElementById('appFeedbackMethodUnsupported');
    const grinderGroup = document.getElementById('appFeedbackGrinderGroup');
    const methodGroup  = document.getElementById('appFeedbackMethodGroup');

    if (grinderChk && grinderGroup) {
        grinderChk.addEventListener('change', () => {
            grinderGroup.style.display = grinderChk.checked ? 'block' : 'none';
        });
    }
    if (methodChk && methodGroup) {
        methodChk.addEventListener('change', () => {
            methodGroup.style.display = methodChk.checked ? 'block' : 'none';
        });
    }

    document.getElementById('appFeedbackSubmitBtn').addEventListener('click', _submitAppFeedback);

    const nudgeClose = document.getElementById('appFeedbackNudgeClose');
    if (nudgeClose) nudgeClose.addEventListener('click', _dismissNudge);
}
