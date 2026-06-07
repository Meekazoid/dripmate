// ==========================================
// DRIPMATE - APP.JS (ES MODULE ENTRY POINT)
// Main entry point that imports all modules
// ==========================================

// Import all modules
import { initTheme, toggleTheme, toggleManual, collapseManual, alignHeader } from './theme.js';
import { initGlobalGrinder } from './grinder.js';
import { closeFeedbackHistory, migrateCoffeesInitialValues } from './feedback.js';
import { initFeedbackSliderInteractions } from './feedback.js';
import { renderCoffees } from './coffee-list.js';
import { initPressedStateInteractions } from './coffee-cards.js';
import { processImageUpload } from './image-handler.js';
import { saveCoffeeManual, initProcessPicker } from './manual-entry.js';
import { 
    openWaterModal, 
    closeWaterModal, 
    saveWaterHardness, 
    saveManualWaterHardness,
    clearManualWaterHardness 
} from './water-hardness.js';
import {
    openSettings,
    closeSettings,
    openDecafModal,
    closeDecafModal,
    handleMagicLink,
    requestMagicLink,
    validateAndPersistToken,
    signupForAccess,
    logoutDevice
} from './settings.js';
import { updateRoastDate } from './freshness.js';
import { 
    startBrewTimer,
    pauseBrewTimer,
    resetBrewTimer
} from './brew-timer.js';
import { 
    manualWaterHardness,
    userZipCode,
    setWaterHardness,
    setApiWaterHardness
} from './state.js';
import { initBackendSync, getToken } from './services/backend-sync.js';
import { initAppFeedback, openAppFeedback, closeAppFeedback, checkNudge } from './app-feedback.js';
import { initOnboarding, replayOnboarding, openQuickTips, closeQuickTips } from './onboarding.js';

// Make updateRoastDate available globally for onclick handlers
window.updateRoastDate = updateRoastDate;
// Expose openAppFeedback globally for inline onclick handlers (e.g. other-grinder hint)
window.openAppFeedback = openAppFeedback;
// Expose renderCoffees globally so backend-sync can trigger re-render after load
window.renderCoffees = renderCoffees;
// Make brew timer functions available globally for onclick handlers
window.startBrewTimer = startBrewTimer;
window.pauseBrewTimer = pauseBrewTimer;
window.resetBrewTimer = resetBrewTimer;
console.log('âœ… Brew timer functions attached to window:', {
    startBrewTimer: typeof window.startBrewTimer,
    pauseBrewTimer: typeof window.pauseBrewTimer,
    resetBrewTimer: typeof window.resetBrewTimer
});

// Initialize event listeners
function initEventListeners() {
    // Camera & Upload — collapse manual entry when switching to image-based flows
    document.getElementById('cameraBtn').addEventListener('click', () => { collapseManual(); document.getElementById('imageInput').click(); });
    document.getElementById('uploadBtn').addEventListener('click', () => { collapseManual(); document.getElementById('uploadInput').click(); });

    // Empty-state action buttons (mirror camera / upload / manual)
    const emptyStateScanBtn   = document.getElementById('emptyStateScanBtn');
    const emptyStateUploadBtn = document.getElementById('emptyStateUploadBtn');
    const emptyStateManualBtn = document.getElementById('emptyStateManualBtn');
    if (emptyStateScanBtn)   emptyStateScanBtn.addEventListener('click',   () => { collapseManual(); document.getElementById('imageInput').click(); });
    if (emptyStateUploadBtn) emptyStateUploadBtn.addEventListener('click', () => { collapseManual(); document.getElementById('uploadInput').click(); });
    if (emptyStateManualBtn) emptyStateManualBtn.addEventListener('click', toggleManual);

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
    initProcessPicker();

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
    document.getElementById('logoutDeviceBtn').addEventListener('click', () => logoutDevice());

    // Send Magic Link
    const sendMagicBtn = document.getElementById('sendMagicLinkBtn');
    if (sendMagicBtn) {
        sendMagicBtn.addEventListener('click', async () => {
            const email  = document.getElementById('magicLinkEmailInput').value.trim();
            const status = document.getElementById('magicLinkStatus');
            if (!email) {
                status.className = 'dm-status dm-status-error';
                status.style.display = 'block';
                status.textContent = 'Please enter your email address.';
                return;
            }
            sendMagicBtn.disabled = true;
            sendMagicBtn.textContent = 'Sending…';
            const result = await requestMagicLink(email);
            sendMagicBtn.disabled = false;
            sendMagicBtn.textContent = 'Send login link';
            status.className = 'dm-status ' + (result.success ? 'dm-status-success' : 'dm-status-error');
            status.style.display = 'block';
            status.textContent = result.success
                ? 'Link sent — check your inbox.'
                : (result.error || 'Couldn\'t send. Please try again.');
        });
    }
    // Impressum & Datenschutz
    document.getElementById('openImpressumBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openModal('impressumModal'); });
    document.getElementById('closeImpressumBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeModal('impressumModal'); });
    document.getElementById('openDatenschutzBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openModal('datenschutzModal'); });
    document.getElementById('closeDatenschutzBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeModal('datenschutzModal'); });

    // Modal backdrop close
    document.getElementById('settingsModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSettings(); });
    document.getElementById('decafModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeDecafModal(); });
    document.getElementById('closeFeedbackHistoryBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeFeedbackHistory(); });
    document.getElementById('feedbackHistoryModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeFeedbackHistory(); });
    document.getElementById('waterModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeWaterModal(); });
    document.getElementById('impressumModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal('impressumModal'); });
    document.getElementById('datenschutzModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal('datenschutzModal'); });

    // App Feedback
    document.getElementById('appFeedbackBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAppFeedback(); });
    document.getElementById('closeAppFeedbackBtn').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeAppFeedback(); });
    document.getElementById('appFeedbackModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeAppFeedback(); });

    // Replay Tutorial (Settings modal)
    const replayBtn = document.getElementById('replayTutorialBtn');
    if (replayBtn) replayBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeSettings(); replayOnboarding(); });

    // Quick Tips (Settings modal)
    const quickTipsBtn = document.getElementById('quickTipsBtn');
    if (quickTipsBtn) quickTipsBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeSettings(); openQuickTips(); });
    const closeQuickTipsBtn = document.getElementById('closeQuickTipsBtn');
    if (closeQuickTipsBtn) closeQuickTipsBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeQuickTips(); });
    const quickTipsModal = document.getElementById('quickTipsModal');
    if (quickTipsModal) quickTipsModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeQuickTips(); });
}

// Generic modal helpers for legal pages
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Renders and initializes the full app UI. Called once a valid token is confirmed.
function bootApp() {
    initTheme();
    alignHeader();
    window.addEventListener('resize', alignHeader);

    migrateCoffeesInitialValues();

    if (manualWaterHardness) {
        setWaterHardness(manualWaterHardness);
        const waterBtn = document.getElementById('waterControlBtn');
        if (waterBtn) waterBtn.classList.add('active');
    } else if (userZipCode && typeof WaterHardness !== 'undefined') {
        WaterHardness.getHardness(userZipCode).then(data => {
            setApiWaterHardness(data);
            setWaterHardness(data);
            const waterBtn = document.getElementById('waterControlBtn');
            if (waterBtn) waterBtn.classList.add('active');
        }).catch(err => console.log('Could not load water hardness:', err));
    }

    initOnboarding();
    renderCoffees();
    initAppFeedback();
    checkNudge();

    initBackendSync().catch((error) => {
        console.warn('[app] Deferred backend sync failed:', error && error.message ? error.message : error);
    });

    initGlobalGrinder();
    initEventListeners();
    initFeedbackSliderInteractions();
    initPressedStateInteractions();
}

// ==========================================
// AUTH GATE
// ==========================================

function showAuthGate() {
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'flex';
}

function hideAuthGate() {
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'none';
}

function showGateStatus(el, message, type) {
    el.textContent = message;
    el.className = 'auth-gate-status auth-gate-status--' + type;
    el.style.display = 'block';
}

function hideGateStatus(el) {
    el.style.display = 'none';
    el.textContent = '';
    el.className = 'auth-gate-status';
}

function initAuthGateListeners() {
    const tabCode      = document.getElementById('authGateTabCode');
    const tabRegister  = document.getElementById('authGateTabRegister');
    const panelCode    = document.getElementById('authGatePanelCode');
    const panelRegister = document.getElementById('authGatePanelRegister');

    function switchTab(showCode) {
        panelCode.style.display     = showCode ? 'block' : 'none';
        panelRegister.style.display = showCode ? 'none'  : 'block';
        tabCode.classList.toggle('auth-gate-tab--active', showCode);
        tabRegister.classList.toggle('auth-gate-tab--active', !showCode);
        tabCode.setAttribute('aria-selected', String(showCode));
        tabRegister.setAttribute('aria-selected', String(!showCode));
    }

    tabCode.addEventListener('click',     () => switchTab(true));
    tabRegister.addEventListener('click', () => switchTab(false));

    // --- Code activation ---
    const codeInput  = document.getElementById('authGateCodeInput');
    const codeBtn    = document.getElementById('authGateCodeBtn');
    const codeStatus = document.getElementById('authGateCodeStatus');

    async function handleCodeActivation() {
        const code = codeInput.value.trim();
        if (!code) { showGateStatus(codeStatus, 'Please enter your access code.', 'error'); return; }

        codeBtn.disabled = true;
        codeBtn.textContent = 'Checking...';
        hideGateStatus(codeStatus);

        try {
            const result = await validateAndPersistToken(code);
            if (result.valid) {
                if (result.isFirstLogin) localStorage.setItem('justActivated', '1');
                showGateStatus(codeStatus, '✓ Activated! Loading...', 'success');
                setTimeout(() => { hideAuthGate(); bootApp(); }, 800);
            } else {
                showGateStatus(codeStatus, result.error || 'That code didn\'t work. Please check it and try again.', 'error');
                codeBtn.disabled = false;
                codeBtn.textContent = 'Activate';
            }
        } catch (err) {
            showGateStatus(codeStatus, 'Network error. Please try again in a moment.', 'error');
            codeBtn.disabled = false;
            codeBtn.textContent = 'Activate';
        }
    }

    codeBtn.addEventListener('click', handleCodeActivation);
    codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCodeActivation(); });

    // --- Signup / registration ---
    const emailInput    = document.getElementById('authGateEmailInput');
    const registerBtn   = document.getElementById('authGateRegisterBtn');
    const registerStatus = document.getElementById('authGateRegisterStatus');

    async function handleSignup() {
        const email = emailInput.value.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showGateStatus(registerStatus, 'Please enter a valid email address.', 'error');
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = 'Sending...';
        hideGateStatus(registerStatus);

        try {
            const result = await signupForAccess(email);
            if (result.ok) {
                if (result.status === 'waitlisted' || result.status === 'already_waitlisted') {
                    showGateStatus(registerStatus, 'The Beta is currently full — you are on the waitlist. We will email you the moment a spot opens up.', 'warning');
                } else {
                    showGateStatus(registerStatus, 'Your token is on the way. Please check your inbox in a moment.', 'success');
                }
                emailInput.value = '';
            } else {
                showGateStatus(registerStatus, result.error || 'Something went wrong. Please try again in a moment.', 'error');
            }
        } catch (err) {
            showGateStatus(registerStatus, 'Network error. Please try again in a moment.', 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Request access';
        }
    }

    registerBtn.addEventListener('click', handleSignup);
    emailInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSignup(); });
}

// Main initialization function
async function initApp() {
    // Handle magic link token from email — must run first so a fresh token is already set
    await handleMagicLink();

    if (getToken()) {
        bootApp();
    } else {
        showAuthGate();
        initAuthGateListeners();
    }
}

// Run on DOM ready
// Note: ES modules are deferred by default, so DOMContentLoaded may have already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
