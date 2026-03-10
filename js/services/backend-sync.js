// ==========================================
// BACKEND-SYNC MODULE
// Token validation, coffee sync, preference sync
// ==========================================

import { CONFIG } from '../config.js';
import { dedupeCoffees } from '../state.js';

// ==========================================
// DEVICE ID
// ==========================================

/**
 * Get or create a stable device ID stored in localStorage.
 * Exported so settings.js can import this instead of its own copy.
 */
export function getOrCreateDeviceId() {
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
        console.log('[sync] New device ID created:', deviceId);
    }
    return deviceId;
}

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

export function saveToken(token) { localStorage.setItem('token', token); console.log('[sync] Token saved'); }
export function getToken()       { return localStorage.getItem('token'); }
export function clearToken()     { localStorage.removeItem('token'); console.log('[sync] Token cleared'); }

// ==========================================
// FETCH HELPER
// ==========================================

/**
 * fetch() wrapper with AbortController timeout.
 * Prevents silent hangs on Railway cold starts (default: 10s).
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ==========================================
// FEEDBACK HISTORY GUARD
// ==========================================

function hasFeedbackHistoryCoverage(coffeeList = []) {
    if (!Array.isArray(coffeeList) || coffeeList.length === 0) return true;
    return coffeeList.some(coffee => Array.isArray(coffee.feedbackHistory));
}

// ==========================================
// BACKEND API CALLS
// ==========================================

export async function checkUserStatus() {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) return { valid: false, error: 'No token found' };
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/auth/validate`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
        });
        const data = await response.json();
        return response.ok && data.valid
            ? { valid: true, user: data.user }
            : { valid: false, error: data.error || 'Validation failed' };
    } catch (error) {
        console.error('[sync] Token validation error:', error.message);
        return { valid: false, error: 'Network error' };
    }
}

export async function fetchCoffeesFromBackend() {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) return null;
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/coffees`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
        });
        const data = await response.json();
        if (response.ok && data.success) {
            const remote = Array.isArray(data.coffees) ? data.coffees : [];
            console.log(`[sync] ${remote.length} coffees loaded from backend`);
            return dedupeCoffees(remote, 'fetchCoffeesFromBackend');
        }
        console.error('[sync] Backend fetch failed:', data.error);
        return null;
    } catch (error) {
        console.error('[sync] Fetch coffees error:', error.message);
        return null;
    }
}

export async function syncCoffeesToBackend(coffees) {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) { console.log('[sync] No token â€” coffee sync skipped'); return false; }
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/coffees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            body: JSON.stringify({ coffees })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            console.log(`[sync] ${data.saved} coffees synced to backend`);
            return true;
        }
        console.warn(`[sync] /api/coffees rejected (${response.status}): ${data?.error || 'unknown'}`);
        return false;
    } catch (error) {
        console.error('[sync] Sync error:', error.message);
        return false;
    }
}

export async function syncGrinderPreference(grinder) {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) { console.log('[sync] No token â€” grinder sync skipped'); return false; }
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/user/grinder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            body: JSON.stringify({ grinder })
        });
        const data = await response.json();
        if (response.ok && data.success) { console.log('[sync] Grinder synced:', grinder); return true; }
        console.error('[sync] Grinder sync failed:', data.error);
        return false;
    } catch (error) {
        console.error('[sync] Grinder sync error:', error.message);
        return false;
    }
}

export async function fetchGrinderPreference() {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) return null;
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/user/grinder`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
        });
        const data = await response.json();
        if (response.ok && data.success && data.grinder) {
            console.log('[sync] Grinder loaded from backend:', data.grinder);
            return data.grinder;
        }
        return null;
    } catch (error) {
        console.error('[sync] Fetch grinder error:', error.message);
        return null;
    }
}

export async function syncWaterHardness(hardnessValue) {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) { console.log('[sync] No token â€” water hardness sync skipped'); return false; }
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/user/water-hardness`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId },
            body: JSON.stringify({ waterHardness: hardnessValue })
        });
        const data = await response.json();
        if (response.ok && data.success) { console.log(`[sync] Water hardness synced: ${hardnessValue} dH`); return true; }
        console.error('[sync] Water hardness sync failed:', data.error);
        return false;
    } catch (error) {
        console.error('[sync] Water hardness sync error:', error.message);
        return false;
    }
}

export async function fetchWaterHardness() {
    const token    = getToken();
    const deviceId = getOrCreateDeviceId();
    if (!token) return null;
    try {
        const response = await fetchWithTimeout(`${CONFIG.backendUrl}/api/user/water-hardness`, {
            headers: { 'Authorization': `Bearer ${token}`, 'X-Device-ID': deviceId }
        });
        const data = await response.json();
        if (response.ok && data.success && data.waterHardness !== null) {
            console.log(`[sync] Water hardness loaded from backend: ${data.waterHardness} dH`);
            return data.waterHardness;
        }
        return null;
    } catch (error) {
        console.error('[sync] Fetch water hardness error:', error.message);
        return null;
    }
}

// ==========================================
// INITIALIZATION
// ==========================================

export async function initBackendSync() {
    const initialLocalCoffeesSnapshot = localStorage.getItem('coffees') || '[]';

    try {
        console.log('[sync] Initializing backend sync...');
        const status = await checkUserStatus();

        if (status.valid) {
            console.log(`[sync] Logged in as: ${status.user.username}`);

            // Load grinder preference
            const remoteGrinder = await fetchGrinderPreference();
            if (remoteGrinder) {
                window.preferredGrinder = remoteGrinder;
                localStorage.setItem('preferredGrinder', remoteGrinder);
                if (typeof initGlobalGrinder === 'function') initGlobalGrinder();
            }

            // Load water hardness (manual override)
            const remoteWaterHardness = await fetchWaterHardness();
            if (remoteWaterHardness !== null) {
                const manualHardness = {
                    value: remoteWaterHardness,
                    category: null,
                    region: 'Manual Entry',
                    source: 'User Input (Synced)',
                    isManual: true
                };
                window.manualWaterHardness = manualHardness;
                localStorage.setItem('manualWaterHardness', JSON.stringify(manualHardness));
                if (typeof window.waterHardness === 'undefined' || window.waterHardness === null) {
                    window.waterHardness = manualHardness;
                }
            }

            // Load coffees
            const remoteCoffees = await fetchCoffeesFromBackend();
            if (Array.isArray(remoteCoffees)) {
                const localCoffees = (() => {
                    try {
                        const parsed = JSON.parse(localStorage.getItem('coffees') || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch (_) { return []; }
                })();

                const normalized = dedupeCoffees(remoteCoffees, 'initBackendSync-remote');
                const looksIncomplete = normalized.length > 0 && !hasFeedbackHistoryCoverage(remoteCoffees);

                const localChangedDuringSync = (localStorage.getItem('coffees') || '[]') !== initialLocalCoffeesSnapshot;

                if (looksIncomplete && localCoffees.length > 0) {
                    console.warn('[sync] Remote coffees missing feedbackHistory â€” keeping local data');
                } else if (localChangedDuringSync) {
                    console.warn('[sync] Local coffees changed during startup sync â€” skipping remote overwrite');
                } else {
                    window.coffees = normalized;
                    localStorage.setItem('coffees', JSON.stringify(normalized));
                    // renderCoffees is an ES module export - call via window if exposed
                    if (typeof window.renderCoffees === 'function') {
                        window.renderCoffees();
                    } else {
                        // Fallback: trigger a soft reload of the coffee list
                        document.dispatchEvent(new CustomEvent('coffees-updated', { detail: { coffees: normalized } }));
                    }
                }
            }
        } else {
            console.log('[sync] No valid token. Enter access code in Settings.');
        }
    } catch (error) {
        // Non-fatal â€” app continues in local mode
        console.warn('[sync] Backend sync failed:', error.message);
        console.log('[sync] App continues in local mode.');
    }
}
// ==========================================
// GLOBAL EXPORT (for non-module scripts)
// ==========================================

window.backendSync = {
    syncCoffeesToBackend,
    syncGrinderPreference,
    fetchGrinderPreference,
    syncWaterHardness,
    fetchWaterHardness,
    checkUserStatus,
    getToken,
    getOrCreateDeviceId,
    initBackendSync
};
