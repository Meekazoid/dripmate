// ==========================================
// BACKEND-SYNC MODULE
// Handles token validation and syncing
// UPDATED: Water Hardness Sync Support
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
        const response = await fetch(`${BACKEND_URL}/api/auth/validate`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            }
        });
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
        const response = await fetch(`${BACKEND_URL}/api/coffees`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            }
        });
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            },
            body: JSON.stringify({ coffees })
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

async function syncGrinderPreference(grinder) {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) {
        console.log('⚠️ Kein Token vorhanden. Grinder-Sync übersprungen.');
        return false;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/user/grinder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            },
            body: JSON.stringify({ grinder })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`✅ Grinder-Präferenz synchronisiert: ${grinder}`);
            return true;
        } else {
            console.error('Grinder sync failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Grinder sync error:', error);
        return false;
    }
}

async function fetchGrinderPreference() {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) return null;

    try {
        const response = await fetch(`${BACKEND_URL}/api/user/grinder`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            }
        });
        const data = await response.json();

        if (response.ok && data.success && data.grinder) {
            console.log(`📦 Grinder-Präferenz vom Backend geladen: ${data.grinder}`);
            return data.grinder;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Fetch grinder preference error:', error);
        return null;
    }
}

// ==========================================
// WATER HARDNESS SYNC (NEW)
// ==========================================

async function syncWaterHardness(hardnessValue) {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) {
        console.log('⚠️ Kein Token vorhanden. Water-Hardness-Sync übersprungen.');
        return false;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/user/water-hardness`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            },
            body: JSON.stringify({ waterHardness: hardnessValue })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log(`✅ Water hardness synchronisiert: ${hardnessValue} °dH`);
            return true;
        } else {
            console.error('Water hardness sync failed:', data.error);
            return false;
        }
    } catch (error) {
        console.error('Water hardness sync error:', error);
        return false;
    }
}

async function fetchWaterHardness() {
    const token = getToken();
    const deviceId = getOrCreateDeviceId();

    if (!token) return null;

    try {
        const response = await fetch(`${BACKEND_URL}/api/user/water-hardness`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            }
        });
        const data = await response.json();

        if (response.ok && data.success && data.waterHardness !== null) {
            console.log(`📦 Water hardness vom Backend geladen: ${data.waterHardness} °dH`);
            return data.waterHardness;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Fetch water hardness error:', error);
        return null;
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
            
            // Grinder-Präferenz vom Backend laden
            const remoteGrinder = await fetchGrinderPreference();
            if (remoteGrinder) {
                window.preferredGrinder = remoteGrinder;
                localStorage.setItem('preferredGrinder', remoteGrinder);
                
                // Update UI if grinder selector exists
                if (typeof initGlobalGrinder === 'function') {
                    initGlobalGrinder();
                }
            }
            
            // Water hardness vom Backend laden (manual override)
            const remoteWaterHardness = await fetchWaterHardness();
            if (remoteWaterHardness !== null) {
                const manualHardness = {
                    value: remoteWaterHardness,
                    category: null, // Will be calculated
                    region: 'Manual Entry',
                    source: 'User Input (Synced)',
                    isManual: true
                };
                window.manualWaterHardness = manualHardness;
                localStorage.setItem('manualWaterHardness', JSON.stringify(manualHardness));
                
                // Set as active hardness if initApp hasn't run yet
                if (typeof window.waterHardness === 'undefined' || window.waterHardness === null) {
                    window.waterHardness = manualHardness;
                }
            }
            
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

    // Nur ausführen wenn die Token-UI-Elemente existieren
    // (sie existieren NICHT in der neuen index.html)
    if (!tokenInput || !saveTokenBtn || !clearTokenBtn || !tokenStatus) {
        console.log('ℹ️ Token-UI nicht gefunden (wird über Settings-Modal verwaltet)');
        return;
    }

    // Load existing token
    const existingToken = getToken();
    if (existingToken) {
        tokenInput.value = existingToken;
    }

    // Save token
    saveTokenBtn.addEventListener('click', async () => {
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
    clearTokenBtn.addEventListener('click', () => {
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
    syncGrinderPreference,
    fetchGrinderPreference,
    syncWaterHardness,
    fetchWaterHardness,
    checkUserStatus,
    getToken
};
