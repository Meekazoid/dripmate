// ==========================================
// MANUAL ENTRY
// Manual coffee entry form
// ==========================================

import { coffees, saveCoffeesAndSync } from './state.js';
import { renderCoffees } from './coffee-list.js';
import { showMessage } from './messages.js';

export async function saveCoffeeManual() {
    const name = document.getElementById('name').value.trim();
    const origin = document.getElementById('origin').value.trim();
    const process = document.getElementById('process').value;
    const cultivar = document.getElementById('cultivar').value.trim();
    const altitude = document.getElementById('altitude').value.trim();
    const roaster = document.getElementById('roaster').value.trim();
    const tastingNotes = document.getElementById('tastingNotes').value.trim();

    if (!name || !origin || !process) {
        alert('Please fill in at least Name, Origin and Processing Method.');
        return;
    }

    coffees.unshift({
        name, origin, process,
        cultivar: cultivar || 'Unknown',
        altitude: altitude || '1500',
        roaster: roaster || 'Unknown',
        tastingNotes: tastingNotes || 'No notes',
        addedDate: new Date().toISOString()
    });

    saveCoffeesAndSync();

    // Clear form
    ['name', 'origin', 'process', 'cultivar', 'altitude', 'roaster', 'tastingNotes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    document.querySelector('.manual-section')?.classList.add('hidden');
    renderCoffees();
    showMessage('success', '✓ Coffee added successfully!');
}
