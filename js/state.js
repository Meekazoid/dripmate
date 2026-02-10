// ==========================================
// STATE MANAGEMENT
// Central shared mutable state
// ==========================================

// Core state variables
export let coffees = JSON.parse(localStorage.getItem('coffees') || '[]');
export let coffeeAmount = parseInt(localStorage.getItem('coffeeAmount')) || 15;
export let preferredGrinder = localStorage.getItem('preferredGrinder') || 'fellow';
export let waterHardness = null; // Current active water hardness (manual or API)
export let manualWaterHardness = JSON.parse(localStorage.getItem('manualWaterHardness') || 'null');
export let apiWaterHardness = null; // Water hardness from ZIP lookup
export let userZipCode = localStorage.getItem('userZipCode') || '';

// Brew timer state (per-card)
export let brewTimers = {};
export let animationFrames = {};

// Setter functions with localStorage persistence
export function setCoffees(value) {
    coffees = value;
    localStorage.setItem('coffees', JSON.stringify(coffees));
}

export function setCoffeeAmount(value) {
    coffeeAmount = value;
    localStorage.setItem('coffeeAmount', value);
}

export function setPreferredGrinder(value) {
    preferredGrinder = value;
    localStorage.setItem('preferredGrinder', value);
}

export function setWaterHardness(value) {
    waterHardness = value;
}

export function setManualWaterHardness(value) {
    manualWaterHardness = value;
    localStorage.setItem('manualWaterHardness', JSON.stringify(value));
}

export function setApiWaterHardness(value) {
    apiWaterHardness = value;
}

export function setUserZipCode(value) {
    userZipCode = value;
    localStorage.setItem('userZipCode', value);
}

export function setBrewTimers(value) {
    brewTimers = value;
}

export function setAnimationFrames(value) {
    animationFrames = value;
}

// Sync coffees to backend and localStorage
export function saveCoffeesAndSync() {
    localStorage.setItem('coffees', JSON.stringify(coffees));
    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncCoffeesToBackend) {
        window.backendSync.syncCoffeesToBackend(coffees);
    }
}

// Utility to sanitize HTML for XSS protection
export function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    // IMPORTANT: Ampersand must be replaced first to avoid double-encoding
    // (e.g., if we replace < first, then &, we'd turn &lt; into &amp;lt;)
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
