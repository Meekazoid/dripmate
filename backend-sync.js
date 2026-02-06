// ==========================================
// BACKEND-SYNC MODULE
// Handles token validation and syncing
// ==========================================

const BACKEND_URL = 'https://brew-buddy-backend-production.up.railway.app';

// ==========================================
// DEVICE ID GENERATION
// ==========================================

function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        // Gleicher Fingerprint wie in index.html
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown'
        ].join('|');
        
        deviceId = 'device-' + btoa(fingerprint).substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
        localStorage.setItem('deviceId', deviceId);
        console.log('🆔 Neue Device-ID erstellt:', deviceId);
    }
    return deviceId;
}

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

function saveToken(token) {
    localStorage.setItem('token', token);
    console.log('💾 Token gespeichert');
}

function getToken() {
    return localStorage.getItem('token');
}

function clearToken() {
    localStorage.removeItem('token');
    console.log('🗑️ Token gelöscht');
}

// ==========================================
// BACKEND API CALLS
// ==========================================

async function checkUserStatus() {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) {
        return { valid: false, error: 'No token found' };
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/validate?token=${token}&deviceId=${deviceId}`);
        const data = await response.json();

        if (response.ok && data.valid) {
            return { 
                valid: true, 
                user: data.user 
            };
        } else {
            return { 
                valid: false, 
                error: data.error || 'Validation failed' 
            };
        }
    } catch (error) {
        console.error('Token validation error:', error);
        return { 
            valid: false, 
            error: 'Network error' 
        };
    }
}

async function fetchCoffeesFromBackend() {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) return null;

    try {
        const response = await fetch(`${BACKEND_URL}/api/coffees?token=${token}&deviceId=${deviceId}`);
        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`📦 ${data.coffees.length} Kaffees vom Backend geladen`);
            return data.coffees;
        } else {
            console.error('Backend fetch failed:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Fetch coffees error:', error);
        return null;
    }
}

async function syncCoffeesToBackend(coffees) {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) {
        console.log('⚠️ Kein Token vorhanden. Sync übersprungen.');
        return false;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/coffees`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                deviceId,
                coffees
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`✅ ${data.saved} Kaffees zum Backend synchronisiert`);
            return true;
        } else {
            console.error('Sync failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initBackendSync() {
    try {
        console.log('🔄 Initialisiere Backend-Sync...');
        const status = await checkUserStatus();
        
        if (status.valid) {
            console.log(`✅ Eingeloggt als: ${status.user.username}`);
            // Coffees vom Backend laden
            const remoteCoffees = await fetchCoffeesFromBackend();
            if (remoteCoffees) {
                // Lokale Liste aktualisieren
                window.coffees = remoteCoffees;
                localStorage.setItem('coffees', JSON.stringify(window.coffees));
                if (typeof renderCoffees === 'function') renderCoffees();
            }
        } else {
            console.log('ℹ️ Kein gültiger Token vorhanden. Bitte in den Settings eingeben.');
        }
    } catch (error) {
        // Dieser Block ist entscheidend: Er fängt Fehler ab, damit das UI weiterlebt
        console.warn('⚠️ Backend-Sync konnte nicht initialisiert werden:', error.message);
        console.log('📦 App läuft im lokalen Modus weiter.');
    }
}

// ==========================================
// UI INTEGRATION
// ==========================================

function setupTokenUI() {
    const tokenInput = document.getElementById('tokenInput');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const clearTokenBtn = document.getElementById('clearTokenBtn');
    const tokenStatus = document.getElementById('tokenStatus');

    // Load existing token
    const existingToken = getToken();
    if (existingToken) {
        tokenInput.value = existingToken;
    }

    // Save token
    saveTokenBtn?.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        
        if (!token) {
            tokenStatus.innerHTML = '<span style="color: var(--error);">⚠️ Please enter a token</span>';
            return;
        }

        tokenStatus.innerHTML = '<span style="color: var(--text-secondary);">⏳ Validating...</span>';

        saveToken(token);
        const status = await checkUserStatus();

        if (status.valid) {
            tokenStatus.innerHTML = `<span style="color: var(--success);">✅ Connected as ${status.user.username}</span>`;
            
            // Sync data
            const remoteCoffees = await fetchCoffeesFromBackend();
            if (remoteCoffees) {
                window.coffees = remoteCoffees;
                localStorage.setItem('coffees', JSON.stringify(window.coffees));
                if (typeof renderCoffees === 'function') renderCoffees();
            }
        } else {
            clearToken();
            tokenStatus.innerHTML = `<span style="color: var(--error);">❌ ${status.error}</span>`;
        }
    });

    // Clear token
    clearTokenBtn?.addEventListener('click', () => {
        clearToken();
        tokenInput.value = '';
        tokenStatus.innerHTML = '<span style="color: var(--text-secondary);">Token cleared</span>';
    });
}

// ==========================================
// AUTO-INIT
// ==========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initBackendSync();
        setupTokenUI();
    });
} else {
    initBackendSync();
    setupTokenUI();
}

// Export functions for use in app.js
window.backendSync = {
    syncCoffeesToBackend,
    checkUserStatus,
    getToken
};
