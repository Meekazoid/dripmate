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
        if (magicSection)  magicSection.style.display = 'block';
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

            await maybeInitBackendSync();
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

// ------------------------------------------
// MAGIC LINK — Auto-login from URL token
// Called once on app start from app.js:
//   import { handleMagicLink } from './settings.js';
//   handleMagicLink();
// ------------------------------------------

export async function handleMagicLink() {
    const params = new URLSearchParams(window.location.search);
    const magic  = params.get('magic');

    if (!magic) return;

    trackAuthBootstrap('auth_bootstrap_magic_attempt');

    try {
        const redeemRes = await fetch(`${CONFIG.backendUrl}/api/auth/magic-link/redeem?magic=${encodeURIComponent(magic)}`);
        const redeemData = await redeemRes.json().catch(() => ({}));

        if (redeemRes.status === 401) {
            trackAuthBootstrap('auth_bootstrap_magic_fail_401');
            showAuthRecoveryMessage('Link invalid or expired');
            return;
        }

        if (!redeemRes.ok || !redeemData.success || !redeemData.token) {
            showAuthRecoveryMessage(redeemData.error || 'Link invalid or expired');
            return;
        }

        const validateResult = await validateAndPersistToken(redeemData.token);

        if (validateResult.valid) {
            trackAuthBootstrap('auth_bootstrap_magic_success');
            const popupMode = validateResult.isFirstLogin ? 'firstLogin' : 'recovery';
            showActivationPopup(popupMode);
            await maybeInitBackendSync();
            return;
        }

        showAuthRecoveryMessage(validateResult.error || 'Link invalid or expired');
    } catch (err) {
        console.error('[settings] Magic link error:', err.message);
        showAuthRecoveryMessage('Link invalid or expired');
    } finally {
        cleanAuthParamsFromUrl();
    }
}

function cleanAuthParamsFromUrl() {
    window.history.replaceState({}, document.title, window.location.pathname);
}

async function validateAndPersistToken(token) {
    const deviceId = getOrCreateDeviceId();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${CONFIG.backendUrl}/api/auth/validate`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            signal: controller.signal
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.valid) {
            return { valid: false, error: data.error || 'Token validation failed' };
        }

        saveToken(token);
        localStorage.setItem('deviceId', deviceId);
        return { valid: true, isFirstLogin: Boolean(data.isFirstLogin) };
    } finally {
        clearTimeout(timer);
    }
}

function showAuthRecoveryMessage(message) {
    openSettings();

    const status = document.getElementById('magicLinkStatus');
    const form = document.getElementById('magicLinkForm');

    if (form) form.style.display = 'block';
    if (status) {
        status.style.display = 'block';
        status.textContent = message;
    }
}

function trackAuthBootstrap(eventName) {
    console.log(`[telemetry] ${eventName}`);
}

async function maybeInitBackendSync() {
    if (window.backendSync && typeof window.backendSync.initBackendSync === 'function') {
        await window.backendSync.initBackendSync();
    }
}

function showActivationPopup(mode = 'firstLogin') {
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

    const popupCopy = mode === 'recovery'
        ? {
            title: 'Welcome back to dripmate!',
            message: 'Your previous Coffee Cards and brew adjustments are already saved and will be available again.'
        }
        : {
            title: 'dripmate activated!',
            message: 'You can now add your first Coffee Card and start your experience with dripmate.'
        };

    popup.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:14px;">
            <div style="font-size:1.6rem;flex-shrink:0;">&#x2615;</div>
            <div>
                <p style="margin:0 0 6px;font-size:0.85rem;font-weight:600;color:#1a1a1a;letter-spacing:0.02em;">
                    ${popupCopy.title}
                </p>
                <p style="margin:0;font-size:0.78rem;color:#666666;line-height:1.6;font-weight:300;">
                    ${popupCopy.message}
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

        if (response.status === 503) {
            return { success: false, error: 'Email service temporarily unavailable' };
        }

        return await response.json();
    } catch (err) {
        console.error('[settings] Magic link request error:', err.message);
        return { success: false, error: 'Network error' };
    }
}
