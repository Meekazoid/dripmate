import { enforceCanonicalSchema } from './coffee-schema.js';

// ==========================================
// CENTRALIZED SHARED STATE V5.2
// ES module · Expose legacy window.* values
// ==========================================

function safeParseStoredCoffees() {
  try {
    const parsed = JSON.parse(localStorage.getItem('coffees') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse coffees from localStorage. Falling back to empty list.', e);
    return [];
  }
}

export function createStableCoffeeId(coffee = {}, fallbackIndex = 0) {
  if (coffee.id) return String(coffee.id);

  const normalizedName = String(coffee.name || '').trim().toLowerCase();
  const normalizedRoaster = String(coffee.roastery || coffee.roaster || '').trim().toLowerCase();
  const normalizedOrigin = String(coffee.origin || '').trim().toLowerCase();
  const stableDate = String(coffee.addedDate || coffee.savedAt || coffee.createdAt || '').trim();
  const fallbackDate = stableDate || new Date().toISOString();
  const fallbackSeed = `${normalizedName}|${normalizedRoaster}|${normalizedOrigin}|${fallbackDate}|${fallbackIndex}`;
  const safeSeed = fallbackSeed.replace(/[^a-z0-9|:-]/g, '');

  return `coffee-${safeSeed || Date.now()}`;
}

export function normalizeCoffeeRecord(inputCoffee = {}, fallbackIndex = 0) {
  const canonicalCoffee = enforceCanonicalSchema(inputCoffee);
  const coffee = { ...canonicalCoffee };
  coffee.id = createStableCoffeeId(coffee, fallbackIndex);
  coffee.feedback = coffee.feedback && typeof coffee.feedback === 'object' ? coffee.feedback : {};
  coffee.feedbackHistory = Array.isArray(coffee.feedbackHistory) ? coffee.feedbackHistory : [];
  return coffee;
}

export function dedupeCoffees(inputCoffees = [], source = 'unknown') {
  const deduped = [];
  const seenKeys = new Set();
  let removed = 0;

  inputCoffees.forEach((rawCoffee, index) => {
    const hadOriginalId = Boolean(rawCoffee && rawCoffee.id);
    const coffee = normalizeCoffeeRecord(rawCoffee, index);
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

export let coffees = dedupeCoffees(safeParseStoredCoffees(), 'state-init');
export let coffeeAmount = parseInt(localStorage.getItem('coffeeAmount')) || 15;
export let preferredGrinder = localStorage.getItem('preferredGrinder') || 'fellow';
export let preferredMethod = localStorage.getItem('preferredMethod') || 'v60';
export let waterHardness = null;
export let manualWaterHardness = (() => {
  try { return JSON.parse(localStorage.getItem('manualWaterHardness')) || null; } catch (e) { return null; }
})();
export let brewTimers = {};
export let animationFrames = {};

window.coffees = coffees;
window.coffeeAmount = coffeeAmount;
window.preferredGrinder = preferredGrinder;
window.preferredMethod = preferredMethod;
window.waterHardness = waterHardness;
window.manualWaterHardness = manualWaterHardness;
window.brewTimers = brewTimers;
window.animationFrames = animationFrames;

export function setCoffees(value) {
  coffees = dedupeCoffees(Array.isArray(value) ? value : [], 'setCoffees');
  try { localStorage.setItem('coffees', JSON.stringify(coffees)); } catch (e) { console.warn('Failed to persist coffees', e); }
  window.coffees = coffees;
}

export function setCoffeeAmount(value) {
  coffeeAmount = Number(value) || 0;
  try { localStorage.setItem('coffeeAmount', String(coffeeAmount)); } catch (e) { console.warn('Failed to persist coffeeAmount', e); }
  window.coffeeAmount = coffeeAmount;
}

export function setPreferredGrinder(value) {
  preferredGrinder = String(value || 'fellow');
  try { localStorage.setItem('preferredGrinder', preferredGrinder); } catch (e) { console.warn('Failed to persist preferredGrinder', e); }
  window.preferredGrinder = preferredGrinder;
}

export function setPreferredMethod(value) {
  preferredMethod = String(value || 'v60');
  try { localStorage.setItem('preferredMethod', preferredMethod); } catch (e) { console.warn('Failed to persist preferredMethod', e); }
  window.preferredMethod = preferredMethod;
}

export function setWaterHardness(value) { waterHardness = value; window.waterHardness = waterHardness; }

export function setManualWaterHardness(value) {
  manualWaterHardness = value;
  try { localStorage.setItem('manualWaterHardness', JSON.stringify(manualWaterHardness)); } catch (e) { console.warn('Failed to persist manualWaterHardness', e); }
  window.manualWaterHardness = manualWaterHardness;
}

export function setBrewTimers(value) { brewTimers = value || {}; window.brewTimers = brewTimers; }
export function setAnimationFrames(value) { animationFrames = value || {}; window.animationFrames = animationFrames; }

export async function saveCoffeesAndSync() {
  setCoffees(coffees);
  if (typeof window.backendSync !== 'undefined' && typeof window.backendSync.syncCoffeesToBackend === 'function') {
    try { await window.backendSync.syncCoffeesToBackend(coffees); } catch (e) { console.warn('backendSync threw:', e); }
  }
  window.coffees = coffees;
}

export function addCoffee(coffee) {
  if (!coffee) return;
  const activeSortOrders = coffees
      .filter(c => c.deleted !== true && c.sortOrder !== undefined)
      .map(c => c.sortOrder);
  const minOrder = activeSortOrders.length > 0 ? Math.min(...activeSortOrders) : 0;
  coffee.sortOrder = minOrder - 1;
  coffee.stackId = null;
  coffee.stackPos = 0;
  coffees = [normalizeCoffeeRecord(coffee), ...(coffees || [])];
  setCoffees(coffees);
}

export function migrateOrderFields() {
  // One-time additive migration: assign sortOrder/stackId/stackPos to coffees that lack them.
  // sortOrder is assigned based on the previous favorite-then-addedDate display order so nothing jumps.
  const active = coffees
      .filter(c => c.deleted !== true)
      .sort((a, b) => {
          const aFav = a.favorite === true;
          const bFav = b.favorite === true;
          if (aFav && !bFav) return -1;
          if (!aFav && bFav) return 1;
          if (aFav && bFav) {
              return new Date(b.favoritedAt || 0).getTime() - new Date(a.favoritedAt || 0).getTime();
          }
          return new Date(b.addedDate || 0).getTime() - new Date(a.addedDate || 0).getTime();
      });

  let changed = false;

  active.forEach((coffee, i) => {
      if (coffee.sortOrder === undefined) {
          coffee.sortOrder = i;
          changed = true;
      }
  });

  let nextOrder = active.length;
  coffees.forEach(coffee => {
      if (coffee.deleted === true && coffee.sortOrder === undefined) {
          coffee.sortOrder = nextOrder++;
          changed = true;
      }
      if (coffee.stackId === undefined) {
          coffee.stackId = null;
          changed = true;
      }
      if (coffee.stackPos === undefined) {
          coffee.stackPos = 0;
          changed = true;
      }
  });

  if (changed) {
      try { localStorage.setItem('coffees', JSON.stringify(coffees)); } catch (e) { console.warn('Failed to persist order migration', e); }
  }
}

export function replaceState(partialState = {}) {
  if (partialState.coffees) setCoffees(partialState.coffees);
  if (partialState.coffeeAmount !== undefined) setCoffeeAmount(partialState.coffeeAmount);
  if (partialState.preferredGrinder) setPreferredGrinder(partialState.preferredGrinder);
  if (partialState.preferredMethod) setPreferredMethod(partialState.preferredMethod);
  if (partialState.waterHardness !== undefined) setWaterHardness(partialState.waterHardness);
  if (partialState.manualWaterHardness !== undefined) setManualWaterHardness(partialState.manualWaterHardness);
  if (partialState.brewTimers !== undefined) setBrewTimers(partialState.brewTimers);
  if (partialState.animationFrames !== undefined) setAnimationFrames(partialState.animationFrames);
}

export function sanitizeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
