// ==========================================
// GRINDER & METHOD SELECTION (V5.2)
// Chip + Bottom-Sheet Picker
// ==========================================

import { GRINDERS, GRINDER_MIGRATION } from './data/grinders.js';
import { METHODS } from './data/methods.js';
import { preferredGrinder, setPreferredGrinder, preferredMethod, setPreferredMethod } from './state.js';

// "Other" is not a registry grinder — it suppresses numeric conversion and
// shows a qualitative band label derived from the Comandante-equivalent.
const OTHER_GRINDER_KEY = 'other';

function migrateGrinderPreference() {
    if (GRINDER_MIGRATION[preferredGrinder]) {
        setPreferredGrinder(GRINDER_MIGRATION[preferredGrinder]);
    }
}

// ==========================================
// INIT
// ==========================================

export function initGlobalGrinder() {
    migrateGrinderPreference();

    // Build picker lists from registry BEFORE attaching listeners
    _renderGrinderPickerList();
    _renderMethodPickerList();

    updateChipLabels();

    const grinderChip = document.getElementById('grinder-chip');
    const methodChip = document.getElementById('method-chip');
    if (grinderChip) grinderChip.addEventListener('click', openGrinderPicker);
    if (methodChip) methodChip.addEventListener('click', openMethodPicker);

    const closeGrinder = document.getElementById('closeGrinderBtn');
    const closeMethod = document.getElementById('closeMethodBtn');
    if (closeGrinder) closeGrinder.addEventListener('click', closeGrinderPicker);
    if (closeMethod) closeMethod.addEventListener('click', closeMethodPicker);

    const grinderModal = document.getElementById('grinderModal');
    const methodModal = document.getElementById('methodModal');
    if (grinderModal) grinderModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeGrinderPicker(); });
    if (methodModal) methodModal.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeMethodPicker(); });

    // Event delegation on the rendered lists
    const grinderList = document.getElementById('grinder-picker-list');
    const methodList = document.getElementById('method-picker-list');
    if (grinderList) grinderList.addEventListener('click', (e) => {
        const btn = e.target.closest('.picker-option');
        if (btn) selectGrinder(btn.dataset.value);
    });
    if (methodList) methodList.addEventListener('click', (e) => {
        const btn = e.target.closest('.picker-option');
        if (btn) selectMethod(btn.dataset.value);
    });
}

// ==========================================
// PICKER LIST RENDERING
// ==========================================

function _renderGrinderPickerList() {
    const list = document.getElementById('grinder-picker-list');
    if (!list) return;
    list.innerHTML = Object.values(GRINDERS).map(g => `
        <button class="picker-option" data-value="${g.key}">
            <span class="picker-option-name">${g.label}</span>
            <span class="picker-option-detail">${g.pickerDetail}</span>
            <span class="picker-check">✓</span>
        </button>
    `).join('') + `
        <button class="picker-option picker-option--other" data-value="${OTHER_GRINDER_KEY}">
            <span class="picker-option-name">Other / not listed yet</span>
            <span class="picker-option-detail">Let us know via feedback</span>
            <span class="picker-check">✓</span>
        </button>
    `;
}

function _renderMethodPickerList() {
    const list = document.getElementById('method-picker-list');
    if (!list) return;
    list.innerHTML = Object.values(METHODS).map(m => `
        <button class="picker-option" data-value="${m.key}">
            <span class="picker-option-name">${m.label}</span>
            <span class="picker-option-detail">${m.pickerDetail}</span>
            <span class="picker-check">✓</span>
        </button>
    `).join('');
}

// ==========================================
// CHIP LABELS
// Shows "Select grinder/method" placeholder until setupChosen flag is set.
// ==========================================

export function updateChipLabels() {
    const gLabel = document.getElementById('grinder-chip-label');
    const mLabel = document.getElementById('method-chip-label');
    const setupChosen = localStorage.getItem('setupChosen');

    if (gLabel) {
        if (!setupChosen) {
            gLabel.textContent = 'Select grinder';
            gLabel.dataset.placeholder = '1';
        } else {
            delete gLabel.dataset.placeholder;
            if (preferredGrinder === OTHER_GRINDER_KEY) {
                gLabel.textContent = 'Other';
            } else {
                gLabel.textContent = (GRINDERS[preferredGrinder] || GRINDERS.fellow_gen2).chipLabel;
            }
        }
    }

    if (mLabel) {
        if (!setupChosen) {
            mLabel.textContent = 'Select method';
            mLabel.dataset.placeholder = '1';
        } else {
            delete mLabel.dataset.placeholder;
            mLabel.textContent = (METHODS[preferredMethod] || METHODS.v60).timerLabel;
        }
    }

    _updateOtherHint();
}

function _updateOtherHint() {
    const hint = document.getElementById('other-grinder-hint');
    if (!hint) return;
    hint.style.display = (preferredGrinder === OTHER_GRINDER_KEY && localStorage.getItem('setupChosen')) ? 'block' : 'none';
}

// ==========================================
// GRINDER PICKER
// ==========================================

function openGrinderPicker() {
    markActiveOption('grinder-picker-list', preferredGrinder);
    document.getElementById('grinderModal').classList.add('active');
}

function closeGrinderPicker() {
    document.getElementById('grinderModal').classList.remove('active');
}

async function selectGrinder(value) {
    setPreferredGrinder(value);
    localStorage.setItem('setupChosen', '1');
    updateChipLabels();
    closeGrinderPicker();

    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncGrinderPreference) {
        await window.backendSync.syncGrinderPreference(value);
    }

    if (!selectGrinder._renderCoffees) {
        const module = await import('./coffee-list.js');
        selectGrinder._renderCoffees = module.renderCoffees;
    }
    selectGrinder._renderCoffees();

    if (navigator.vibrate) navigator.vibrate(10);
    console.log(`✓ Grinder → ${value}`);
}

// ==========================================
// METHOD PICKER
// ==========================================

function openMethodPicker() {
    markActiveOption('method-picker-list', preferredMethod || 'v60');
    document.getElementById('methodModal').classList.add('active');
}

function closeMethodPicker() {
    document.getElementById('methodModal').classList.remove('active');
}

async function selectMethod(value) {
    setPreferredMethod(value);
    localStorage.setItem('setupChosen', '1');
    updateChipLabels();
    closeMethodPicker();

    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncMethodPreference) {
        await window.backendSync.syncMethodPreference(value);
    }

    if (!selectMethod._renderCoffees) {
        const module = await import('./coffee-list.js');
        selectMethod._renderCoffees = module.renderCoffees;
    }
    selectMethod._renderCoffees();

    if (navigator.vibrate) navigator.vibrate(10);
    console.log(`✓ Method → ${value}`);
}

// ==========================================
// HELPERS
// ==========================================

function markActiveOption(listId, activeValue) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.querySelectorAll('.picker-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === activeValue);
    });
}

export function getGrinderLabel(grinder) {
    if (grinder === OTHER_GRINDER_KEY) return 'Other';
    return (GRINDERS[grinder] || GRINDERS.fellow_gen2).label;
}
