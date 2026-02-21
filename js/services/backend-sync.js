// ==========================================
// BACKEND-SYNC MODULE
// Handles token validation and syncing
// UPDATED: Water Hardness Sync Support
// ==========================================

const BACKEND_URL = 'https://dripmate-backend-production.up.railway.app';

// ==========================================
// DEVICE ID GENERATION
// ==========================================

function getOrCreateDeviceId() {
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


function createBackendStableCoffeeId(coffee = {}, fallbackIndex = 0) {
    if (coffee.id) return String(coffee.id);

    const normalizedName = String(coffee.name || '').trim().toLowerCase();
    const normalizedRoaster = String(coffee.roaster || '').trim().toLowerCase();
    const normalizedOrigin = String(coffee.origin || '').trim().toLowerCase();
    const stableDate = String(coffee.addedDate || coffee.savedAt || coffee.createdAt || '').trim();
    const fallbackDate = stableDate || new Date().toISOString();
    const fallbackSeed = `${normalizedName}|${normalizedRoaster}|${normalizedOrigin}|${fallbackDate}|${fallbackIndex}`;
    const safeSeed = fallbackSeed.replace(/[^a-z0-9|:-]/g, '');

    return `coffee-${safeSeed || Date.now()}`;
}

function normalizeBackendCoffeeRecord(inputCoffee = {}, fallbackIndex = 0) {
    const coffee = { ...(inputCoffee || {}) };
    coffee.id = createBackendStableCoffeeId(coffee, fallbackIndex);
    coffee.feedback = coffee.feedback && typeof coffee.feedback === 'object' ? coffee.feedback : {};
    coffee.feedbackHistory = Array.isArray(coffee.feedbackHistory) ? coffee.feedbackHistory : [];
    return coffee;
}

function dedupeBackendCoffees(inputCoffees = [], source = 'backend') {
    const deduped = [];
    const seenKeys = new Set();
    let removed = 0;

    inputCoffees.forEach((rawCoffee, index) => {
        const hadOriginalId = Boolean(rawCoffee && rawCoffee.id);
        const coffee = normalizeBackendCoffeeRecord(rawCoffee, index);
        const fallbackKey = [
            String(coffee.name || '').trim().toLowerCase(),
            String(coffee.roaster || '').trim().toLowerCase(),
            String(coffee.origin || '').trim().toLowerCase(),
            String(coffee.addedDate || coffee.savedAt || '')
        ].join('|');
        const stableKey = hadOriginalId ? String(coffee.id) : (fallbackKey || `index:${index}`);

        if (seenKeys.has(stableKey)) {
            removed += 1;
            return;
        }

        seenKeys.add(stableKey);
        deduped.push(coffee);
    });

    if (removed > 0) {
        console.warn(`⚠️ Deduplication removed ${removed} duplicate coffee entr${removed === 1 ? 'y' : 'ies'} (${source}).`);
    }

    return deduped;
}

function hasFeedbackHistoryCoverage(coffeeList = []) {
    if (!Array.isArray(coffeeList) || coffeeList.length === 0) return true;
    return coffeeList.some(coffee => Array.isArray(coffee.feedbackHistory));
}

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
            const remoteCoffees = Array.isArray(data.coffees) ? data.coffees : [];
            console.log(`📦 ${remoteCoffees.length} coffees loaded from backend`);
            return dedupeBackendCoffees(remoteCoffees, 'fetchCoffeesFromBackend');
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
            const reason = data?.error || data?.message || 'Unknown backend rejection';
            console.warn(`⚠️ /api/coffees rejected payload or sync failed (${response.status}): ${reason}`);
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
            if (Array.isArray(remoteCoffees)) {
                const localCoffees = (() => {
                    try {
                        const parsed = JSON.parse(localStorage.getItem('coffees') || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (_) {
                        return [];
                    }
                })();

                const normalizedRemote = dedupeBackendCoffees(remoteCoffees, 'initBackendSync-remote');
                const remoteLooksIncomplete = normalizedRemote.length > 0 && !hasFeedbackHistoryCoverage(remoteCoffees);

                if (remoteLooksIncomplete && localCoffees.length > 0) {
                    console.warn('⚠️ Remote coffees seem to miss feedbackHistory on initial sync. Keeping local data to avoid accidental overwrite.');
                } else {
                    window.coffees = normalizedRemote;
                    localStorage.setItem('coffees', JSON.stringify(window.coffees));
                    if (typeof renderCoffees === 'function') renderCoffees();
                }
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
// AUTO-INIT
// ==========================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initBackendSync();
    });
} else {
    initBackendSync();
}

// Export functions for use in app.js and global access
window.backendSync = {
    syncCoffeesToBackend,
    syncGrinderPreference,
    fetchGrinderPreference,
    syncWaterHardness,
    fetchWaterHardness,
    checkUserStatus,
    getToken
};
