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
        // Generate a cryptographically random UUID
        // Use crypto.randomUUID() if available, otherwise fallback
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            deviceId = 'device-' + crypto.randomUUID();
        } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
            // Fallback using crypto.getRandomValues (more secure than Math.random)
            const bytes = new Uint8Array(16);
            crypto.getRandomValues(bytes);
            bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
            bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
            const hex = Array.from(bytes, function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
            deviceId = 'device-' + hex.substring(0, 8) + '-' + hex.substring(8, 12) + '-' + 
                       hex.substring(12, 16) + '-' + hex.substring(16, 20) + '-' + hex.substring(20, 32);
        } else {
            // Final fallback for very old browsers (not cryptographically secure)
            console.warn('⚠️ Using Math.random() fallback for device ID - browser lacks crypto support');
            deviceId = 'device-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        localStorage.setItem('deviceId', deviceId);
        console.log('🆔 New Device-ID created:', deviceId);
    }
    return deviceId;
}

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

function saveToken(token) {
    localStorage.setItem('token', token);
    console.log('💾 Token saved');
}

function getToken() {
    return localStorage.getItem('token');
}

function clearToken() {
    localStorage.removeItem('token');
    console.log('🗑️ Token cleared');
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
            console.log(`📦 ${data.coffees.length} coffees loaded from backend`);
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
        console.log('⚠️ No token available. Sync skipped.');
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
            console.log(`☁️ ${data.saved} coffees synced to backend`);
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
        console.log('⚠️ No token available. Grinder sync skipped.');
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
            console.log(`✅ Grinder preference synced: ${grinder}`);
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
            console.log(`📦 Grinder preference loaded from backend: ${data.grinder}`);
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
        console.log('⚠️ No token available. Water hardness sync skipped.');
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
            console.log(`✅ Water hardness synced: ${hardnessValue} °dH`);
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
            console.log(`📦 Water hardness loaded from backend: ${data.waterHardness} °dH`);
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
        console.log('🔄 Initializing backend sync...');
        const status = await checkUserStatus();
        
        if (status.valid) {
            console.log(`✅ Logged in as: ${status.user.username}`);
            
            // Load grinder preference from backend
            const remoteGrinder = await fetchGrinderPreference();
            if (remoteGrinder) {
                window.preferredGrinder = remoteGrinder;
                localStorage.setItem('preferredGrinder', remoteGrinder);
                
                // Update UI if grinder selector exists
                if (typeof initGlobalGrinder === 'function') {
                    initGlobalGrinder();
                }
            }
            
            // Load water hardness from backend (manual override)
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
            
            // Load coffees from backend
            const remoteCoffees = await fetchCoffeesFromBackend();
            if (remoteCoffees) {
                // Update local list
                window.coffees = remoteCoffees;
                localStorage.setItem('coffees', JSON.stringify(window.coffees));
                if (typeof renderCoffees === 'function') renderCoffees();
            }
        } else {
            console.log('ℹ️ No valid token available. Please enter in Settings.');
        }
    } catch (error) {
        // This block is critical: it catches errors so the UI continues to work
        console.warn('⚠️ Backend sync could not be initialized:', error.message);
        console.log('📦 App continues in local mode.');
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

    // Only execute if token UI elements exist
    // (they do NOT exist in the new index.html)
    if (!tokenInput || !saveTokenBtn || !clearTokenBtn || !tokenStatus) {
        console.log('ℹ️ Token UI not found (managed via Settings modal)');
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
