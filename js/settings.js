// ==========================================
// SETTINGS & DEVICE ACTIVATION
// Settings panel, activation code, decaf modal
// ==========================================

import { CONFIG } from './config.js';
import { coffees, sanitizeHTML } from './state.js';

export function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    const token = localStorage.getItem('token');
    const statusDiv = document.getElementById('activationStatus');

    if (token) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(40, 167, 69, 0.1)';
        statusDiv.style.border = '1px solid rgba(40, 167, 69, 0.3)';
        statusDiv.style.color = '#5fda7d';
        statusDiv.innerHTML = '✅ Device already activated';
    } else {
        statusDiv.style.display = 'none';
    }
}

export function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function showActivationError(message) {
    const statusDiv = document.getElementById('activationStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = 'rgba(220, 53, 69, 0.1)';
    statusDiv.style.border = '1px solid rgba(220, 53, 69, 0.3)';
    statusDiv.style.color = '#ff6b7a';
    statusDiv.innerHTML = '❌ ' + sanitizeHTML(message);
}

export async function activateDevice() {
    const accessCode = document.getElementById('accessCodeInput').value.trim();
    const statusDiv = document.getElementById('activationStatus');

    if (!accessCode) { showActivationError('Please enter an access code'); return; }

    const getOrCreateDeviceId = () => {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            const fingerprint = [
                navigator.userAgent, navigator.language,
                screen.width + 'x' + screen.height,
                new Date().getTimezoneOffset(),
                navigator.hardwareConcurrency || 'unknown'
            ].join('|');
            deviceId = 'device-' + btoa(fingerprint).substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    };

    try {
        const deviceId = getOrCreateDeviceId();
        const response = await fetch(`${CONFIG.backendUrl}/api/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${accessCode}`,
                'X-Device-ID': deviceId
            }
        });

        if (!response.ok) {
            const error = await response.json();
            showActivationError(error.error || 'Token validation failed');
            return;
        }

        const data = await response.json();

        if (data.valid) {
            localStorage.setItem('token', accessCode);
            localStorage.setItem('deviceId', deviceId);

            statusDiv.style.display = 'block';
            statusDiv.style.background = 'rgba(40, 167, 69, 0.1)';
            statusDiv.style.border = '1px solid rgba(40, 167, 69, 0.3)';
            statusDiv.style.color = '#5fda7d';
            statusDiv.innerHTML = '✅ Success! Device linked.<br>You can now use all features.';

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
    const decafListEl = document.getElementById('decafList');
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

    const sorted = deletedCoffees.sort((a, b) => {
        return new Date(b.coffee.deletedAt || 0).getTime() - new Date(a.coffee.deletedAt || 0).getTime();
    });

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
