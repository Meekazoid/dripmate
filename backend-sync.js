// ==========================================
// BREWBUDDY BACKEND SYNC MODULE
// Füge das in dein index.html ein (vor dem schließenden </script> Tag)
// ==========================================

// Backend Configuration
const BACKEND_CONFIG = {
    url: 'https://brew-buddy-backend-production.up.railway.app',
    syncEnabled: true,
    offlineFirst: true
};

// ==========================================
// DEVICE ID MANAGEMENT
// ==========================================

function getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
        // Generiere eindeutige Device-ID basierend auf Browser-Fingerprint
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency || 'unknown'
        ].join('|');
        
        // Hash zu Device-ID
        deviceId = 'device-' + btoa(fingerprint).substring(0, 32).replace(/[^a-zA-Z0-9]/g, '');
        localStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
}

// ==========================================
// TOKEN VALIDATION
// ==========================================

async function validateAndSaveToken(token) {
    const deviceId = getOrCreateDeviceId();
    
    try {
        const response = await fetch(
            `${BACKEND_CONFIG.url}/api/auth/validate?token=${token}&deviceId=${deviceId}`
        );
        const data = await response.json();
        
        if (data.valid) {
            // Token ist gültig, speichern
            localStorage.setItem('token', token);
            localStorage.setItem('deviceId', deviceId);
            
            console.log('✅ Token erfolgreich validiert und gespeichert');
            return { success: true, user: data.user };
        } else {
            console.error('❌ Token ungültig:', data.error);
            return { success: false, error: data.error || 'Invalid token' };
        }
    } catch (err) {
        console.error('❌ Token-Validierung fehlgeschlagen:', err);
        return { success: false, error: 'Network error' };
    }
}

// ==========================================
// USER MANAGEMENT (Simplified - No Auto-Register)
// ==========================================

async function checkUserStatus() {
    const token = localStorage.getItem('token');
    const deviceId = getOrCreateDeviceId();
    
    if (!token) {
        console.log('⚠️ Kein Token vorhanden - Aktivierung erforderlich');
        return { hasToken: false };
    }
    
    // Token validieren
    try {
        const response = await fetch(
            `${BACKEND_CONFIG.url}/api/auth/validate?token=${token}&deviceId=${deviceId}`
        );
        const data = await response.json();
        
        if (data.valid) {
            console.log('✅ Token gültig');
            return { hasToken: true, valid: true, user: data.user };
        } else {
            console.log('❌ Token ungültig oder Device-Mismatch');
            return { hasToken: true, valid: false, error: data.error };
        }
    } catch (err) {
        console.error('❌ Token-Check fehlgeschlagen:', err);
        return { hasToken: true, valid: false, error: 'Network error' };
    }
}

// ==========================================
// SYNC FUNCTIONS
// ==========================================

async function syncCoffeesToBackend(coffees) {
    if (!BACKEND_CONFIG.syncEnabled) return;
    if (!navigator.onLine) {
        console.log('⏸️ Offline - Sync pausiert');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const deviceId = localStorage.getItem('deviceId');
        
        if (!token) {
            console.log('⚠️ Kein Token - Sync nicht möglich (Aktivierung erforderlich)');
            return;
        }
        
        const response = await fetch(`${BACKEND_CONFIG.url}/api/coffees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, deviceId, coffees })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Sync erfolgreich:', data.saved, 'coffees');
            localStorage.setItem('lastSync', new Date().toISOString());
        } else {
            console.error('❌ Sync fehlgeschlagen:', data.error);
        }
    } catch (err) {
        console.error('❌ Sync Fehler:', err.message);
    }
}

async function loadCoffeesFromBackend() {
    if (!BACKEND_CONFIG.syncEnabled) return null;
    if (!navigator.onLine) {
        console.log('⏸️ Offline - Lade aus localStorage');
        return null;
    }
    
    try {
        const token = localStorage.getItem('token');
        const deviceId = localStorage.getItem('deviceId');
        
        if (!token) {
            console.log('⚠️ Kein Token - kein Backend-Load möglich');
            return null;
        }
        
        const response = await fetch(
            `${BACKEND_CONFIG.url}/api/coffees?token=${token}&deviceId=${deviceId}`
        );
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Coffees vom Backend geladen:', data.coffees.length);
            return data.coffees;
        } else {
            console.error('❌ Backend-Load fehlgeschlagen:', data.error);
            return null;
        }
    } catch (err) {
        console.error('❌ Backend-Load Fehler:', err.message);
        return null;
    }
}

// ==========================================
// MERGE STRATEGY
// ==========================================

function mergeCoffees(localCoffees, backendCoffees) {
    if (!backendCoffees || backendCoffees.length === 0) {
        return localCoffees;
    }
    
    if (!localCoffees || localCoffees.length === 0) {
        return backendCoffees;
    }
    
    // Merge: Backend hat Priorität (neuere Daten)
    // Aber behalte lokale Coffees die nicht im Backend sind
    const merged = [...backendCoffees];
    
    localCoffees.forEach(local => {
        const existsInBackend = backendCoffees.some(
            backend => backend.name === local.name && 
                       backend.addedDate === local.addedDate
        );
        
        if (!existsInBackend) {
            merged.push(local);
        }
    });
    
    return merged;
}

// ==========================================
// INITIALIZATION
// ==========================================

async function initBackendSync() {
    console.log('🔄 Initialisiere Backend-Sync...');
    
    // 1. Prüfe User-Status (kein Auto-Register!)
    const userStatus = await checkUserStatus();
    
    if (!userStatus.hasToken) {
        console.log('⚠️ Kein Token - Backend-Sync pausiert bis zur Aktivierung');
        BACKEND_CONFIG.syncEnabled = false;
        return;
    }
    
    if (!userStatus.valid) {
        console.log('⚠️ Token ungültig - Backend-Sync deaktiviert');
        BACKEND_CONFIG.syncEnabled = false;
        return;
    }
    
    // 2. Lade Coffees vom Backend
    const backendCoffees = await loadCoffeesFromBackend();
    
    // 3. Merge mit lokalem Storage
    const localCoffees = JSON.parse(localStorage.getItem('coffees') || '[]');
    const mergedCoffees = mergeCoffees(localCoffees, backendCoffees);
    
    // 4. Speichere merged version
    localStorage.setItem('coffees', JSON.stringify(mergedCoffees));
    if (typeof coffees !== 'undefined') {
        coffees = mergedCoffees;
    }
    
    // 5. Sync zurück zum Backend (falls lokale Änderungen)
    if (mergedCoffees.length > 0) {
        await syncCoffeesToBackend(mergedCoffees);
    }
    
    // 6. Re-render UI (falls renderCoffees existiert)
    if (typeof renderCoffees === 'function') {
        renderCoffees();
    }
    
    console.log('✅ Backend-Sync initialisiert');
}

// ==========================================
// AUTO-SYNC ON CHANGES
// ==========================================

// Wrapper für saveCoffeeManual
const originalSaveCoffeeManual = window.saveCoffeeManual;
window.saveCoffeeManual = async function() {
    // Call original function
    if (originalSaveCoffeeManual) {
        originalSaveCoffeeManual();
    }
    
    // Sync to backend
    await syncCoffeesToBackend(coffees);
};

// Wrapper für deleteCoffee
const originalDeleteCoffee = window.deleteCoffee;
window.deleteCoffee = async function(index) {
    // Call original function
    if (originalDeleteCoffee) {
        originalDeleteCoffee(index);
    }
    
    // Sync to backend
    await syncCoffeesToBackend(coffees);
};

// Online/Offline Detection
window.addEventListener('online', async () => {
    console.log('🌐 Verbindung wieder hergestellt');
    const localCoffees = JSON.parse(localStorage.getItem('coffees') || '[]');
    await syncCoffeesToBackend(localCoffees);
});

window.addEventListener('offline', () => {
    console.log('📴 Offline-Modus');
});

// ==========================================
// START ON PAGE LOAD
// ==========================================

// Auto-init beim Laden der Seite
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackendSync);
} else {
    initBackendSync();
}

console.log('📦 Backend-Sync Modul geladen');

// Expose functions für index.html
window.validateAndSaveToken = validateAndSaveToken;
window.checkUserStatus = checkUserStatus;
