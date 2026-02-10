// Centralized shared state for BrewBuddy (ES module)
// Expose legacy window.* values for compatibility with non-module scripts.

// Load persisted values from localStorage
export let coffees = JSON.parse(localStorage.getItem('coffees') || '[]');
export let coffeeAmount = parseInt(localStorage.getItem('coffeeAmount')) || 15;
export let preferredGrinder = localStorage.getItem('preferredGrinder') || 'fellow';
export let manualWaterHardness = (() => {
  try {
    return JSON.parse(localStorage.getItem('manualWaterHardness')) || null;
  } catch (e) {
    return null;
  }
})();
export let apiWaterHardness = null;
export let userZipCode = localStorage.getItem('userZipCode') || '';

// Expose legacy globals so root-level scripts (backend-sync.js) continue to work
// Mirror names intentionally chosen to match previous globals
window.coffees = coffees;
window.coffeeAmount = coffeeAmount;
window.preferredGrinder = preferredGrinder;
window.manualWaterHardness = manualWaterHardness;
window.apiWaterHardness = apiWaterHardness;
window.userZipCode = userZipCode;

// Setters that update module state, localStorage and keep window.* in sync
export function setCoffees(value) {
  coffees = value || [];
  try {
    localStorage.setItem('coffees', JSON.stringify(coffees));
  } catch (e) {
    console.warn('Failed to persist coffees to localStorage', e);
  }
  window.coffees = coffees;
}

export function setCoffeeAmount(value) {
  coffeeAmount = Number(value) || 0;
  localStorage.setItem('coffeeAmount', String(coffeeAmount));
  window.coffeeAmount = coffeeAmount;
}

export function setPreferredGrinder(value) {
  preferredGrinder = String(value || 'fellow');
  localStorage.setItem('preferredGrinder', preferredGrinder);
  window.preferredGrinder = preferredGrinder;
}

export function setManualWaterHardness(value) {
  manualWaterHardness = value;
  try {
    localStorage.setItem('manualWaterHardness', JSON.stringify(manualWaterHardness));
  } catch (e) {
    console.warn('Failed to persist manualWaterHardness', e);
  }
  window.manualWaterHardness = manualWaterHardness;
}

export function setApiWaterHardness(value) {
  apiWaterHardness = value;
  window.apiWaterHardness = apiWaterHardness;
}

export function setUserZipCode(value) {
  userZipCode = String(value || '');
  localStorage.setItem('userZipCode', userZipCode);
  window.userZipCode = userZipCode;
}

// Helper to add a coffee at the front of the list
export function addCoffee(coffee) {
  if (!coffee) return;
  coffees = [coffee, ...(coffees || [])];
  setCoffees(coffees);
}

// Optional: small convenience to replace entire state (used by import/sync flows)
export function replaceState(partialState = {}) {
  if (partialState.coffees) setCoffees(partialState.coffees);
  if (partialState.coffeeAmount !== undefined) setCoffeeAmount(partialState.coffeeAmount);
  if (partialState.preferredGrinder) setPreferredGrinder(partialState.preferredGrinder);
  if (partialState.manualWaterHardness !== undefined) setManualWaterHardness(partialState.manualWaterHardness);
  if (partialState.apiWaterHardness !== undefined) setApiWaterHardness(partialState.apiWaterHardness);
  if (partialState.userZipCode !== undefined) setUserZipCode(partialState.userZipCode);
}

// Runtime state for brew timers (not persisted)
export let brewTimers = {};
export let animationFrames = {};

// Save coffees to localStorage and sync to backend if token exists
export async function saveCoffeesAndSync() {
  setCoffees(coffees);
  if (window.backendSync?.getToken?.()) {
    try {
      await window.backendSync.syncCoffeesToBackend(coffees);
    } catch (error) {
      console.warn('Failed to sync coffees to backend:', error);
    }
  }
}

// Sanitize HTML to prevent XSS attacks
export function sanitizeHTML(str) {
  if (!str) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(str).replace(/[&<>"']/g, char => map[char]);
}