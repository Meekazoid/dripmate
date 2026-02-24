// ==========================================
// MANUAL ENTRY
// Manual coffee entry form with process picker
// ==========================================
import { addCoffee, saveCoffeesAndSync } from './state.js';
import { renderCoffees } from './coffee-list.js';
import { showMessage } from './messages.js';

// ==========================================
// PROCESS PICKER
// ==========================================

const PROCESS_LABELS = {
    '': '– optional –',
    'washed': 'Washed',
    'natural': 'Natural',
    'honey': 'Honey',
    'anaerobic natural': 'Anaerobic Natural',
    'anaerobic washed': 'Anaerobic Washed',
    'carbonic maceration': 'Carbonic Maceration',
    'yeast inoculated natural': 'Yeast Inoculated Natural',
    'nitro washed': 'Nitro Washed',
    'extended fermentation': 'Extended Fermentation'
};

function openProcessPicker() {
    const modal = document.getElementById('processModal');
    const currentValue = document.getElementById('process').value;
    markActiveProcessOption(currentValue);
    modal.classList.add('active');
}

function closeProcessPicker() {
    document.getElementById('processModal').classList.remove('active');
}

function selectProcess(value) {
    const hiddenInput = document.getElementById('process');
    const chipLabel = document.getElementById('process-chip-label');
    const chip = document.getElementById('process-chip');

    hiddenInput.value = value;
    chipLabel.textContent = PROCESS_LABELS[value] || PROCESS_LABELS[''];

    if (value) {
        chip.classList.add('has-value');
    } else {
        chip.classList.remove('has-value');
    }

    closeProcessPicker();
}

function markActiveProcessOption(activeValue) {
    const list = document.getElementById('process-picker-list');
    if (!list) return;
    list.querySelectorAll('.picker-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === activeValue);
    });
}

function resetProcessChip() {
    const hiddenInput = document.getElementById('process');
    const chipLabel = document.getElementById('process-chip-label');
    const chip = document.getElementById('process-chip');
    if (hiddenInput) hiddenInput.value = '';
    if (chipLabel) chipLabel.textContent = '– optional –';
    if (chip) chip.classList.remove('has-value');
}

export function initProcessPicker() {
    const chip = document.getElementById('process-chip');
    const closeBtn = document.getElementById('closeProcessBtn');
    const modal = document.getElementById('processModal');

    if (chip) chip.addEventListener('click', openProcessPicker);
    if (closeBtn) closeBtn.addEventListener('click', closeProcessPicker);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeProcessPicker();
    });

    document.querySelectorAll('#process-picker-list .picker-option').forEach(btn => {
        btn.addEventListener('click', () => selectProcess(btn.dataset.value));
    });
}

// ==========================================
// SAVE MANUAL ENTRY
// ==========================================

export async function saveCoffeeManual() {
    const name = document.getElementById('coffeeName').value.trim();
    const origin = document.getElementById('origin').value.trim();
    const process = document.getElementById('process').value;
    const cultivar = document.getElementById('cultivar').value.trim();
    const altitude = document.getElementById('altitude').value.trim();
    const roaster = document.getElementById('roaster').value.trim();
    const tastingNotes = document.getElementById('tastingNotes').value.trim();

    if (!name || !origin) {
        alert('Please fill in at least Name and Origin.');
        return;
    }

    addCoffee({
        name, origin,
        process: process || 'unknown',
        cultivar: cultivar || 'Unknown',
        altitude: altitude || '1500',
        roaster: roaster || 'Unknown',
        tastingNotes: tastingNotes || 'No notes',
        addedDate: new Date().toISOString()
    });

    saveCoffeesAndSync();

    // Clear form
    ['coffeeName', 'origin', 'cultivar', 'altitude', 'roaster', 'tastingNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    resetProcessChip();

    document.querySelector('.manual-section')?.classList.add('hidden');
    renderCoffees();
    showMessage('success', '✓ Coffee added successfully!');
}
