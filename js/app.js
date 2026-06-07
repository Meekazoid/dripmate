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
    activateDevice,
    openDecafModal,
    closeDecafModal,
    handleMagicLink,
    requestMagicLink
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
    document.getElementById('activateDeviceBtn').addEventListener('click', () => { 
        activateDevice().catch(err => { 
            console.error('Activation error:', err); 
        }); 
    });

    // Magic Link Toggle (not activated state)
    const showMagicBtn = document.getElementById('showMagicLinkBtn');
    if (showMagicBtn) {
        showMagicBtn.addEventListener('click', () => {
            const form = document.getElementById('magicLinkForm');
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
    }
    // Send Magic Link
    const sendMagicBtn = document.getElementById('sendMagicLinkBtn');
    if (sendMagicBtn) {
        sendMagicBtn.addEventListener('click', async () => {
            const email  = document.getElementById('magicLinkEmailInput').value.trim();
            const status = document.getElementById('magicLinkStatus');
            if (!email) { status.textContent = 'Bitte E-Mail eingeben.'; status.style.display = 'block'; return; }
            sendMagicBtn.disabled = true;
            sendMagicBtn.textContent = 'Sending…';
            const result = await requestMagicLink(email);
            sendMagicBtn.disabled = false;
            sendMagicBtn.textContent = 'Send Login-Link';
            status.style.display = 'block';
            status.textContent = result.success
                ? '✓ Link send — check your Mail!'
                : (result.error || 'Fehler beim Senden.');
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

// Main initialization function
async function initApp() {
    // Handle magic link token from email — must run first so a fresh token is already set
    await handleMagicLink();

    bootApp();
}

// Run on DOM ready
// Note: ES modules are deferred by default, so DOMContentLoaded may have already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
