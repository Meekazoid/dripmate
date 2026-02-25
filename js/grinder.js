// ==========================================
// GRINDER & METHOD SELECTION (V5.2)
// Chip + Bottom-Sheet Picker
// ==========================================

import { preferredGrinder, setPreferredGrinder, preferredMethod, setPreferredMethod } from './state.js';

// ── Grinder metadata (alphabetical) ──
const GRINDER_INFO = {
    '1zpresso':     { label: '1Zpresso JX' },
    baratza:        { label: 'Baratza Encore' },
    comandante_mk3: { label: 'Comandante C40 MK3' },
    comandante_mk4: { label: 'Comandante C40 MK4' },
    fellow_gen1:    { label: 'Fellow Ode Gen 1' },
    fellow_gen2:    { label: 'Fellow Ode Gen 2' },
    timemore_c2:    { label: 'Timemore Chestnut C2' },
    timemore_s3:    { label: 'Timemore Chestnut S3' },
};

const METHOD_INFO = {
    aeropress: { label: 'AeroPress' },
    chemex:    { label: 'Chemex' },
    v60:       { label: 'V60' },
};

// ── Migration: old keys → new ──
const GRINDER_MIGRATION = {
    'fellow':     'fellow_gen2',
    'comandante': 'comandante_mk3',
    'timemore':   'timemore_s3',
};

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

    document.querySelectorAll('#grinder-picker-list .picker-option').forEach(btn => {
        btn.addEventListener('click', () => selectGrinder(btn.dataset.value));
    });
    document.querySelectorAll('#method-picker-list .picker-option').forEach(btn => {
        btn.addEventListener('click', () => selectMethod(btn.dataset.value));
    });
}

// ==========================================
// CHIP LABELS
// ==========================================

// Chip-only abbreviations (full names stay in picker popup)
function abbreviateGrinderName(name) {
    return name
        .replace('Fellow Ode Gen 1', 'Fellow Gen 1')
        .replace('Fellow Ode Gen 2', 'Fellow Gen 2')
        .replace('Baratza Encore', 'Baratza')
        .replace('Comandante C40 MK3', 'Comandante MK3')
        .replace('Comandante C40 MK4', 'Comandante MK4')
        .replace('Timemore Chestnut C2', 'Timemore C2')
        .replace('Timemore Chestnut S3', 'Timemore S3');
}

function updateChipLabels() {
    const gLabel = document.getElementById('grinder-chip-label');
    const mLabel = document.getElementById('method-chip-label');
    if (gLabel) gLabel.textContent = abbreviateGrinderName(getGrinderLabel(preferredGrinder));
    if (mLabel) mLabel.textContent = getMethodLabel(preferredMethod || 'v60');
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
    return GRINDER_INFO[grinder]?.label || GRINDER_INFO.fellow_gen2.label;
}

function getMethodLabel(method) {
    return METHOD_INFO[method]?.label || 'V60';
}
