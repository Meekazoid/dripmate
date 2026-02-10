// ==========================================
// GRINDER SELECTION
// Fellow Ode, Comandante, Timemore S3
// ==========================================

import { preferredGrinder, setPreferredGrinder } from './state.js';

export function initGlobalGrinder() {
    const fellowBtn = document.getElementById('global-fellow');
    const comandanteBtn = document.getElementById('global-comandante');
    const timemoreBtn = document.getElementById('global-timemore');

    // Reset all states
    fellowBtn.classList.remove('active');
    comandanteBtn.classList.remove('active');
    timemoreBtn.classList.remove('active');

    // Set active state based on preference
    if (preferredGrinder === 'comandante') {
        comandanteBtn.classList.add('active');
    } else if (preferredGrinder === 'timemore') {
        timemoreBtn.classList.add('active');
    } else {
        fellowBtn.classList.add('active');
    }

    // Bind event listeners
    fellowBtn.addEventListener('click', () => switchGlobalGrinder('fellow'));
    comandanteBtn.addEventListener('click', () => switchGlobalGrinder('comandante'));
    timemoreBtn.addEventListener('click', () => switchGlobalGrinder('timemore'));
}

export async function switchGlobalGrinder(grinder) {
    const fellowBtn = document.getElementById('global-fellow');
    const comandanteBtn = document.getElementById('global-comandante');
    const timemoreBtn = document.getElementById('global-timemore');

    // Remove all active states
    fellowBtn.classList.remove('active');
    comandanteBtn.classList.remove('active');
    timemoreBtn.classList.remove('active');

    // Set active state for selected grinder
    if (grinder === 'fellow') {
        fellowBtn.classList.add('active');
    } else if (grinder === 'comandante') {
        comandanteBtn.classList.add('active');
    } else if (grinder === 'timemore') {
        timemoreBtn.classList.add('active');
    }

    setPreferredGrinder(grinder);

    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncGrinderPreference) {
        await window.backendSync.syncGrinderPreference(grinder);
    }

    // Import renderCoffees dynamically to avoid circular dependency
    // Cache the function reference for better performance
    if (!switchGlobalGrinder._renderCoffees) {
        const module = await import('./coffee-list.js');
        switchGlobalGrinder._renderCoffees = module.renderCoffees;
    }
    switchGlobalGrinder._renderCoffees();

    if (navigator.vibrate) {
        navigator.vibrate(10);
    }

    console.log(`✓ Grinder switched to: ${grinder}`);
}

export function getGrinderLabel(grinder) {
    if (grinder === 'comandante') return 'Comandante';
    if (grinder === 'timemore') return 'Timemore S3';
    return 'Fellow Ode';
}
