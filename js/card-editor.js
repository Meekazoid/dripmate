// ==========================================
// CARD INLINE EDITOR
// Toggle edit mode, save changes via PATCH
// ==========================================

import { CONFIG } from './config.js';
import { getToken } from './services/backend-sync.js';
import { coffees, saveCoffeesAndSync, sanitizeHTML } from './state.js';

// SVG paths for edit/save icon toggle
const PENCIL_SVG = '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>';
const CHECK_SVG  = '<polyline points="20 6 9 17 4 12"></polyline>';

function formatCoffeeOrigin(origin = '') {
    const originText = String(origin || '').trim();
    if (!originText) return '';

    const parts = originText
        .split(/[•,]/)
        .map(part => part.trim())
        .filter(Boolean);

    const normalized = parts.length > 1
        ? `${parts[0]} • ${parts.slice(1).join(' ')}`
        : parts[0];

    return normalized.toLocaleUpperCase('de-DE');
}

/**
 * Toggle between display and edit mode for a coffee card.
 * Called from inline onclick handlers in the card template.
 */
export function toggleEditMode(index) {
    const card = document.querySelector(`.coffee-card[data-original-index="${index}"]`);
    if (!card) return;
    card.classList.contains('editing') ? saveEdits(index, card) : enterEditMode(index, card);
}

/**
 * Enter edit mode: swap display divs for text inputs.
 */
function enterEditMode(index, card) {
    const coffee = coffees[index];
    card.classList.add('editing');

    // Swap icon: Pencil — Checkmark
    const iconEl = document.getElementById(`edit-icon-${index}`);
    if (iconEl) iconEl.innerHTML = CHECK_SVG;

    const btnEl = document.getElementById(`edit-btn-${index}`);
    if (btnEl) btnEl.classList.add('editing');

    // Roastery — Input
    const roasteryDisplay = document.getElementById(`roastery-display-${index}`);
    if (roasteryDisplay) {
        roasteryDisplay.outerHTML = `
            <input type="text"
                   class="inline-edit-input edit-roastery"
                   id="roastery-edit-${index}"
                   value="${escapeAttr(coffee.roastery || '')}"
                   placeholder="Roastery"
                   onclick="event.stopPropagation();"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); toggleEditMode(${index});}"
            />`;
    }

    // Name — Input
    const nameDisplay = document.getElementById(`name-display-${index}`);
    if (nameDisplay) {
        nameDisplay.outerHTML = `
            <input type="text"
                   class="inline-edit-input edit-name"
                   id="name-edit-${index}"
                   value="${escapeAttr(coffee.name)}"
                   placeholder="Coffee name"
                   onclick="event.stopPropagation();"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); toggleEditMode(${index});}"
            />`;
    }

    // Origin — Input
    const originDisplay = document.getElementById(`origin-display-${index}`);
    if (originDisplay) {
        originDisplay.outerHTML = `
            <input type="text"
                   class="inline-edit-input edit-origin"
                   id="origin-edit-${index}"
                   value="${escapeAttr(formatCoffeeOrigin(coffee.origin))}"
                   placeholder="Origin"
                   onclick="event.stopPropagation();"
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); toggleEditMode(${index});}"
            />`;

        const originInput = document.getElementById(`origin-edit-${index}`);
        if (originInput) {
            originInput.addEventListener('input', () => {
                originInput.value = formatCoffeeOrigin(originInput.value);
            });
            originInput.addEventListener('blur', () => {
                originInput.value = formatCoffeeOrigin(originInput.value);
            });
        }
    }

    // No auto-focus: on Android, calling focus() immediately triggers the blue
    // text selection highlight, which looks unintentional. The user taps the
    // field they want to edit themselves.
}

/**
 * Save edits: optimistic UI update then backend PATCH.
 */
async function saveEdits(index, card) {
    const coffee = coffees[index];

    const nameInput     = document.getElementById(`name-edit-${index}`);
    const originInput   = document.getElementById(`origin-edit-${index}`);
    const roasteryInput = document.getElementById(`roastery-edit-${index}`);

    const newName     = nameInput?.value.trim()     || coffee.name;
    const originInputValue = originInput?.value.trim();
    const newOrigin   = originInputValue
        ? formatCoffeeOrigin(originInputValue)
        : formatCoffeeOrigin(coffee.origin);
    const newRoastery = roasteryInput?.value.trim() || '';

    // Neue Farbe abrufen (wenn sie geändert wurde)
    const tempColor = card.dataset.tempColor;
    const newColor  = tempColor !== undefined ? (tempColor === '' ? null : tempColor) : coffee.colorTag;

    // Optimistic UI: update local state immediately
    coffee.name     = newName;
    coffee.origin   = newOrigin;
    coffee.roastery = newRoastery;
    if (tempColor !== undefined) {
        coffee.colorTag = newColor;
    }

    // Reset card editing state
    card.classList.remove('editing');

    // Swap icon: Checkmark — Pencil
    const iconEl = document.getElementById(`edit-icon-${index}`);
    if (iconEl) iconEl.innerHTML = PENCIL_SVG;

    const btnEl = document.getElementById(`edit-btn-${index}`);
    if (btnEl) btnEl.classList.remove('editing');

    // Replace inputs with display divs
    replaceInputWithDisplay(roasteryInput, 'coffee-roastery', `roastery-display-${index}`, sanitizeHTML(newRoastery), !newRoastery);
    replaceInputWithDisplay(nameInput,     'coffee-name',     `name-display-${index}`,     sanitizeHTML(newName));
    replaceInputWithDisplay(originInput,   'coffee-origin',   `origin-display-${index}`,   sanitizeHTML(newOrigin));

    // Temporären Farbspeicher leeren
    delete card.dataset.tempColor;

    // Persist locally
    localStorage.setItem('coffees', JSON.stringify(coffees));

    // Backend PATCH with full-sync fallback on failure
    await patchBrewToBackend(index, {
        coffee_name: newName,
        origin: newOrigin,
        roastery: newRoastery,
        colorTag: newColor
    });
}

/**
 * Replace an input element with the original display div.
 */
function replaceInputWithDisplay(inputEl, className, id, value, hidden = false) {
    if (!inputEl) return;
    const div = document.createElement('div');
    div.className = className;
    div.id        = id;
    div.textContent = value;
    if (hidden) div.style.display = 'none';
    inputEl.replaceWith(div);
}

/**
 * Escape a string for safe use in an HTML attribute value.
 */
function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * PATCH a single coffee card to the backend (partial update).
 * Falls back to a full saveCoffeesAndSync() if the PATCH fails.
 */
async function patchBrewToBackend(index, updates) {
    const token    = getToken();
    const deviceId = localStorage.getItem('deviceId');

    if (!token || !deviceId) {
        console.warn('[editor] No auth credentials — falling back to full sync');
        saveCoffeesAndSync();
        return;
    }

    const coffee   = coffees[index];
    const coffeeId = coffee.id || coffee.savedAt || String(index);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${CONFIG.backendUrl}/api/brews/${encodeURIComponent(coffeeId)}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Device-ID': deviceId
            },
            body: JSON.stringify(updates),
            signal: controller.signal
        });

        if (response.ok) {
            const data = await response.json();
            console.log('[editor] Card updated via PATCH:', data);
            if (data.coffee) {
                Object.assign(coffees[index], data.coffee);
                coffees[index].origin = formatCoffeeOrigin(coffees[index].origin);
                localStorage.setItem('coffees', JSON.stringify(coffees));
            }
        } else {
            console.warn(`[editor] PATCH failed (${response.status}) — falling back to full sync`);
            saveCoffeesAndSync();
        }
    } catch (error) {
        console.error('[editor] PATCH network error:', error.message);
        saveCoffeesAndSync();
    } finally {
        clearTimeout(timer);
    }
}

// Schließt Popups, wenn man irgendwo anders hinklickt
document.addEventListener('click', (e) => {
    if (!e.target.closest('.color-picker-popup') && !e.target.closest('.color-picker-btn')) {
        document.querySelectorAll('.color-picker-popup').forEach(p => p.classList.remove('active'));
    }
});

export function toggleColorPicker(index) {
    const popup = document.getElementById(`color-popup-${index}`);
    if (popup) {
        document.querySelectorAll('.color-picker-popup').forEach(p => {
            if (p !== popup) p.classList.remove('active');
        });
        popup.classList.toggle('active');
    }
}

export function selectColor(index, color) {
    const card = document.querySelector(`.coffee-card[data-original-index="${index}"]`);
    if (!card) return;

    // CSS-Variable direkt aktualisieren für Instant-Preview
    if (color) {
        card.style.setProperty('--card-accent-color', color);
    } else {
        card.style.removeProperty('--card-accent-color');
    }

    // Farbe temporär in Dataset speichern
    card.dataset.tempColor = color;

    // Popup schließen
    const popup = document.getElementById(`color-popup-${index}`);
    if (popup) popup.classList.remove('active');

    // Button-Icon-Farbe anpassen
    const btn = document.getElementById(`color-picker-btn-${index}`);
    if (btn) {
        if(color) {
            btn.classList.add('has-color');
            btn.style.color = color;
        } else {
            btn.classList.remove('has-color');
            btn.style.color = 'var(--text-secondary)';
        }
    }
}

// Window-Zuweisung für Inline-HTML Aufrufe
window.toggleColorPicker = toggleColorPicker;
window.selectColor = selectColor;

// Register on window for onclick handlers in card templates
window.toggleEditMode = toggleEditMode;
