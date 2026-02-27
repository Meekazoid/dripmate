// ==========================================
// CARD INLINE EDITOR
// Toggle edit mode, save changes via PATCH
// ==========================================

import { coffees, saveCoffeesAndSync, sanitizeHTML } from './state.js';

const BACKEND_URL = 'https://dripmate-backend-production.up.railway.app';

// SVG paths for icon toggle
const PENCIL_SVG = '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>';
const CHECK_SVG = '<polyline points="20 6 9 17 4 12"></polyline>';

/**
 * Toggle between display and edit mode
 */
export function toggleEditMode(index) {
    const card = document.querySelector(`.coffee-card[data-original-index="${index}"]`);
    if (!card) return;

    const isEditing = card.classList.contains('editing');

    if (isEditing) {
        saveEdits(index, card);
    } else {
        enterEditMode(index, card);
    }
}

/**
 * Enter edit mode: replace text elements with inputs
 */
function enterEditMode(index, card) {
    const coffee = coffees[index];
    card.classList.add('editing');

    // Swap icon: Pencil → Checkmark
    const iconEl = document.getElementById(`edit-icon-${index}`);
    if (iconEl) iconEl.innerHTML = CHECK_SVG;

    const btnEl = document.getElementById(`edit-btn-${index}`);
    if (btnEl) btnEl.classList.add('editing');

    // Roastery → Input
    const roasteryDisplay = document.getElementById(`roastery-display-${index}`);
    if (roasteryDisplay) {
        const currentValue = coffee.roastery || '';
        roasteryDisplay.outerHTML = `
            <input type="text" 
                   class="inline-edit-input edit-roastery" 
                   id="roastery-edit-${index}" 
                   value="${escapeAttr(currentValue)}" 
                   placeholder="Rösterei"
                   onclick="event.stopPropagation();"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); toggleEditMode(${index});}"
            />`;
    }

    // Name → Input
    const nameDisplay = document.getElementById(`name-display-${index}`);
    if (nameDisplay) {
        nameDisplay.outerHTML = `
            <input type="text" 
                   class="inline-edit-input edit-name" 
                   id="name-edit-${index}" 
                   value="${escapeAttr(coffee.name)}" 
                   placeholder="Kaffeename"
                   onclick="event.stopPropagation();"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); toggleEditMode(${index});}"
            />`;
    }

    // Origin → Input
    const originDisplay = document.getElementById(`origin-display-${index}`);
    if (originDisplay) {
        originDisplay.outerHTML = `
            <input type="text" 
                   class="inline-edit-input edit-origin" 
                   id="origin-edit-${index}" 
                   value="${escapeAttr(coffee.origin)}" 
                   placeholder="Herkunft"
                   onclick="event.stopPropagation();"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); toggleEditMode(${index});}"
            />`;
    }

    // ── Fix #5: KEIN auto-focus / auto-select ──
    // Auf Android erzeugt focus() sofort die blaue Selektion,
    // was ungewollt und irritierend wirkt. 
    // Der User tippt selbst auf das Feld, das er bearbeiten will.
}

/**
 * Save edits: optimistic UI + backend PATCH
 */
async function saveEdits(index, card) {
    const coffee = coffees[index];

    // Read values from inputs
    const nameInput = document.getElementById(`name-edit-${index}`);
    const originInput = document.getElementById(`origin-edit-${index}`);
    const roasteryInput = document.getElementById(`roastery-edit-${index}`);

    const newName = nameInput?.value.trim() || coffee.name;
    const newOrigin = originInput?.value.trim() || coffee.origin;
    const newRoastery = roasteryInput?.value.trim() || '';

    // Optimistic UI: update local state immediately
    coffee.name = newName;
    coffee.origin = newOrigin;
    coffee.roastery = newRoastery;

    // Reset card editing state
    card.classList.remove('editing');

    // Swap icon: Checkmark → Pencil
    const iconEl = document.getElementById(`edit-icon-${index}`);
    if (iconEl) iconEl.innerHTML = PENCIL_SVG;

    const btnEl = document.getElementById(`edit-btn-${index}`);
    if (btnEl) btnEl.classList.remove('editing');

    // Replace inputs with display elements
    replaceInputWithDisplay(
        roasteryInput, 'coffee-roastery', `roastery-display-${index}`,
        sanitizeHTML(newRoastery), !newRoastery
    );
    replaceInputWithDisplay(
        nameInput, 'coffee-name', `name-display-${index}`,
        sanitizeHTML(newName)
    );
    replaceInputWithDisplay(
        originInput, 'coffee-origin', `origin-display-${index}`,
        sanitizeHTML(newOrigin)
    );

    // Save locally
    localStorage.setItem('coffees', JSON.stringify(coffees));

    // Backend sync via PATCH (with full-sync fallback)
    await patchBrewToBackend(index, {
        coffee_name: newName,
        origin: newOrigin,
        roastery: newRoastery
    });
}

/**
 * Replace an input element with the original display element
 */
function replaceInputWithDisplay(inputEl, className, id, value, hidden = false) {
    if (!inputEl) return;
    const div = document.createElement('div');
    div.className = className;
    div.id = id;
    div.textContent = value;
    if (hidden) div.style.display = 'none';
    inputEl.replaceWith(div);
}

/**
 * Escape a string for use in HTML attribute values
 */
function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * PATCH a single brew to backend (partial update)
 * Falls back to full saveCoffeesAndSync() on failure
 */
async function patchBrewToBackend(index, updates) {
    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('deviceId');

    if (!token || !deviceId) {
        console.warn('⚠️ No auth credentials – falling back to full sync');
        saveCoffeesAndSync();
        return;
    }

    const coffee = coffees[index];
    const coffeeId = coffee.id || coffee.savedAt || String(index);

    try {
        const response = await fetch(`${BACKEND_URL}/api/brews/${encodeURIComponent(coffeeId)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            },
            body: JSON.stringify(updates)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Card updated via PATCH:', data);
            if (data.coffee) {
                Object.assign(coffees[index], data.coffee);
                localStorage.setItem('coffees', JSON.stringify(coffees));
            }
        } else {
            console.warn('⚠️ PATCH failed (' + response.status + '), falling back to full sync');
            saveCoffeesAndSync();
        }
    } catch (error) {
        console.error('❌ PATCH network error:', error);
        saveCoffeesAndSync();
    }
}

// Register on window for onclick handlers in templates
window.toggleEditMode = toggleEditMode;
