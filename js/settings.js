// ==========================================
// SETTINGS & DEVICE ACTIVATION
// Settings panel, activation code, decaf modal
// ==========================================

import { CONFIG } from './config.js';
import { coffees, sanitizeHTML } from './state.js';
import { getOrCreateDeviceId, getToken, saveToken } from './services/backend-sync.js';

export function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    const token       = getToken();
    const statusDiv   = document.getElementById('activationStatus');
    const subtitle    = document.getElementById('activationSubtitle');
    const inputWrap   = document.getElementById('activationInputWrap');
    const activateBtn = document.getElementById('activateDeviceBtn');

    const magicSection  = document.getElementById('magicLinkSection');
    const emailSection   = document.getElementById('emailRecoverySection');

    if (token) {
        if (subtitle)      { subtitle.textContent = 'Device already activated'; subtitle.style.color = '#5fda7d'; }
        if (inputWrap)     inputWrap.style.display = 'none';
        if (activateBtn)   activateBtn.style.display = 'none';
        if (magicSection)  magicSection.style.display = 'none';
        if (emailSection)  emailSection.style.display = 'block';
        statusDiv.style.display = 'none';
    } else {
        if (subtitle)      { subtitle.textContent = 'Enter the code you received to activate this device.'; subtitle.style.color = ''; }
        if (inputWrap)     inputWrap.style.display = 'block';
        if (activateBtn)   activateBtn.style.display = 'block';
        if (magicSection)  magicSection.style.display = 'block';
        if (emailSection)  emailSection.style.display = 'none';
        statusDiv.style.display = 'none';
    }
}

export function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function showActivationError(message) {
    const statusDiv = document.getElementById('activationStatus');
    statusDiv.style.display  = 'block';
    statusDiv.style.background = 'rgba(220, 53, 69, 0.1)';
    statusDiv.style.border   = '1px solid rgba(220, 53, 69, 0.3)';
    statusDiv.style.color    = '#ff6b7a';
    statusDiv.innerHTML = '&#x2715; ' + sanitizeHTML(message);
}

export async function activateDevice() {
    const accessCode = document.getElementById('accessCodeInput').value.trim();
    const statusDiv  = document.getElementById('activationStatus');

    if (!accessCode) { showActivationError('Please enter an access code'); return; }

    try {
        const deviceId = getOrCreateDeviceId();

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
            response = await fetch(`${CONFIG.backendUrl}/api/auth/validate`, {
                headers: { 'Authorization': `Bearer ${accessCode}`, 'X-Device-ID': deviceId },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
        }

        if (!response.ok) {
            const error = await response.json();
            showActivationError(error.error || 'Token validation failed');
            return;
        }

        const data = await response.json();

        if (data.valid) {
            saveToken(accessCode);
            localStorage.setItem('deviceId', deviceId);

            statusDiv.style.display    = 'block';
            statusDiv.style.background = 'rgba(40, 167, 69, 0.1)';
            statusDiv.style.border     = '1px solid rgba(40, 167, 69, 0.3)';
            statusDiv.style.color      = '#5fda7d';
            statusDiv.innerHTML = '&#x2713; Device linked. You can now use all features.';

            if (typeof initBackendSync === 'function') await initBackendSync();
            setTimeout(() => { closeSettings(); location.reload(); }, 2000);
        } else {
            showActivationError(data.error || 'Invalid access code');
        }
    } catch (error) {
        showActivationError(error.message || 'Activation failed');
    }
}

export function openDecafModal() {
    renderDecafList();
    document.getElementById('decafModal').classList.add('active');
}

export function closeDecafModal() {
    document.getElementById('decafModal').classList.remove('active');
}

export function renderDecafList() {
    const decafListEl  = document.getElementById('decafList');
    const decafEmptyEl = document.getElementById('decafEmpty');

    const deletedCoffees = coffees
        .map((coffee, index) => ({ coffee, index }))
        .filter(item => item.coffee.deleted === true);

    if (deletedCoffees.length === 0) {
        decafListEl.innerHTML = '';
        decafEmptyEl.style.display = 'block';
        return;
    }

    decafEmptyEl.style.display = 'none';

    const sorted = deletedCoffees.sort((a, b) =>
        new Date(b.coffee.deletedAt || 0).getTime() - new Date(a.coffee.deletedAt || 0).getTime()
    );

    decafListEl.innerHTML = sorted.map(item => `
        <div class="decaf-card">
            <div class="decaf-card-info">
                <div class="decaf-card-name">${sanitizeHTML(item.coffee.name)}</div>
                <div class="decaf-card-origin">${sanitizeHTML(item.coffee.origin)}</div>
            </div>
            <div class="decaf-card-actions">
                <button class="restore-btn" onclick="restoreCoffee(${item.index})">Restore</button>
                <button class="permanent-delete-btn" onclick="permanentDeleteCoffee(${item.index})">Delete</button>
            </div>
        </div>
    `).join('');
}

// ==========================================
// MAGIC LINK — Auto-login from URL token
// Called once on app start from app.js:
//   import { handleMagicLink } from './settings.js';
//   handleMagicLink();
// ==========================================

export async function handleMagicLink() {
    const params = new URLSearchParams(window.location.search);
    const magic  = params.get('magic');
    if (!magic) return;

    // Clean URL immediately
    window.history.replaceState({}, document.title, window.location.pathname);

    try {
        // Step 1: Redeem the one-time magic token → get the permanent user token
        const redeemRes  = await fetch(`${CONFIG.backendUrl}/api/auth/magic-link/redeem?magic=${magic}`);
        const redeemData = await redeemRes.json();

        if (!redeemData.success || !redeemData.token) {
            console.warn('[settings] Magic link invalid or expired');
            return;
        }

        const token    = redeemData.token;
        const deviceId = getOrCreateDeviceId();

        // Already logged in with the same token - skip
        if (getToken() === token) return;

        // Step 2: Validate token and bind new device
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
            response = await fetch(`${CONFIG.backendUrl}/api/auth/validate`, {
                headers: { 'Authorization': Bearer , 'X-Device-ID': deviceId },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
        }

        const data = await response.json();

        if (data.valid) {
            saveToken(token);
            localStorage.setItem('deviceId', deviceId);
            showActivationPopup();
            if (typeof initBackendSync === 'function') await initBackendSync();
        }
    } catch (err) {
        console.error('[settings] Magic link error:', err.message);
    }
}

function showActivationPopup() {
    const existing = document.getElementById('activation-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'activation-popup';
    popup.style.cssText = `
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 16px;
        padding: 20px 24px;
        max-width: 340px;
        width: calc(100% - 48px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        z-index: 9999;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: 'Sora', sans-serif;
    `;

    popup.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="font-size:1.6rem;flex-shrink:0;">&#x2615;</div>
            <div>
                <p style="margin:0 0 6px;font-size:0.85rem;font-weight:600;color:#1a1a1a;letter-spacing:0.02em;">
                    dripmate activated!
                </p>
                <p style="margin:0;font-size:0.78rem;color:#666666;line-height:1.6;font-weight:300;">
                    You can now add your first Coffee Card and start your experience with dripmate.
                </p>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            popup.style.opacity = '1';
            popup.style.transform = 'translateX(-50%) translateY(0)';
        });
    });

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => popup.remove(), 400);
    }, 5000);
}


// ==========================================
// EMAIL SAVE - Speichert E-Mail für Magic Link Recovery
// ==========================================

export async function saveEmailForRecovery(email) {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) return { success: false, error: 'Not activated' };

    try {
        const response = await fetch(`${CONFIG.backendUrl}/api/auth/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Device-ID':   deviceId
            },
            body: JSON.stringify({ email })
        });
        return await response.json();
    } catch (err) {
        console.error('[settings] Email save error:', err.message);
        return { success: false, error: 'Network error' };
    }
}

// ==========================================
// MAGIC LINK REQUEST - Sendet Login-Link per E-Mail
// ==========================================

export async function requestMagicLink(email) {
    try {
        const response = await fetch(`${CONFIG.backendUrl}/api/auth/magic-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return await response.json();
    } catch (err) {
        console.error('[settings] Magic link request error:', err.message);
        return { success: false, error: 'Network error' };
    }
}
// ==========================================
// MAGIC LINK & EMAIL RECOVERY — Event Listeners
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    // Toggle magic link form visibility
    const showMagicBtn = document.getElementById('showMagicLinkBtn');
    if (showMagicBtn) {
        showMagicBtn.addEventListener('click', () => {
            const form = document.getElementById('magicLinkForm');
            if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Send magic link
    const sendMagicBtn = document.getElementById('sendMagicLinkBtn');
    if (sendMagicBtn) {
        sendMagicBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('magicLinkEmailInput');
            const statusDiv  = document.getElementById('magicLinkStatus');
            const email      = emailInput?.value?.trim();

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (statusDiv) { statusDiv.style.display = 'block'; statusDiv.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.'; statusDiv.style.color = '#ff6b7a'; }
                return;
            }

            sendMagicBtn.disabled = true;
            sendMagicBtn.textContent = 'Wird gesendet…';

            const result = await requestMagicLink(email);

            sendMagicBtn.disabled = false;
            sendMagicBtn.textContent = 'Login-Link senden';

            if (statusDiv) {
                statusDiv.style.display = 'block';
                if (result.success) {
                    statusDiv.textContent = '✓ E-Mail gesendet — prüfe deinen Posteingang.';
                    statusDiv.style.color = '#5fda7d';
                } else {
                    statusDiv.textContent = result.error || 'Fehler beim Senden.';
                    statusDiv.style.color = '#ff6b7a';
                }
            }
        });
    }

    // Save email for recovery (shown when already activated)
    const saveEmailBtn = document.getElementById('saveRecoveryEmailBtn');
    if (saveEmailBtn) {
        saveEmailBtn.addEventListener('click', async () => {
            const emailInput = document.getElementById('recoveryEmailInput');
            const statusDiv  = document.getElementById('recoveryEmailStatus');
            const email      = emailInput?.value?.trim();

            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                if (statusDiv) { statusDiv.style.display = 'block'; statusDiv.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.'; statusDiv.style.color = '#ff6b7a'; }
                return;
            }

            saveEmailBtn.disabled = true;
            saveEmailBtn.textContent = 'Wird gespeichert…';

            const result = await saveEmailForRecovery(email);

            saveEmailBtn.disabled = false;
            saveEmailBtn.textContent = 'Speichern';

            if (statusDiv) {
                statusDiv.style.display = 'block';
                if (result.success) {
                    statusDiv.textContent = '✓ E-Mail gespeichert.';
                    statusDiv.style.color = '#5fda7d';
                } else {
                    statusDiv.textContent = result.error || 'Fehler beim Speichern.';
                    statusDiv.style.color = '#ff6b7a';
                }
            }
        });
    }
});
