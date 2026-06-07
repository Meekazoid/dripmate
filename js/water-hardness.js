// ==========================================
// WATER HARDNESS
// Water hardness modal, manual input
// ==========================================

import {
    manualWaterHardness,
    apiWaterHardness,
    setWaterHardness,
    setManualWaterHardness
} from './state.js';
import { renderCoffees } from './coffee-list.js';

function getWaterHardnessCategory(value) {
    if (value < 7) return 'very_soft';
    if (value < 14) return 'soft';
    if (value < 21) return 'medium';
    if (value < 28) return 'hard';
    return 'very_hard';
}

function getActiveWaterHardness() {
    return manualWaterHardness || apiWaterHardness;
}

export function openWaterModal() {
    document.getElementById('waterModal').classList.add('active');

    // Load manual hardness value if exists
    const manualInput = document.getElementById('manualHardnessInput');
    if (manualWaterHardness) {
        manualInput.value = manualWaterHardness.value;
    } else {
        manualInput.value = '';
    }
    
    // Display current active hardness
    const activeHardness = getActiveWaterHardness();
    if (activeHardness) {
        displayWaterHardness(activeHardness);
    }
}

export function closeWaterModal() {
    document.getElementById('waterModal').classList.remove('active');
}

function displayWaterHardness(hardness) {
    const categoryMap = {
        'very_soft': 'VERY SOFT',
        'soft': 'SOFT',
        'medium': 'MEDIUM',
        'hard': 'HARD',
        'very_hard': 'VERY HARD'
    };

    const category = hardness.category || getWaterHardnessCategory(hardness.value);
    const categoryText = hardness.category_de ? hardness.category_de.toUpperCase() : categoryMap[category];

    document.getElementById('hardnessValueDisplay').textContent = `${hardness.value} °dH`;
    document.getElementById('hardnessCategoryDisplay').textContent = categoryText;
    document.getElementById('waterHardnessDisplay').style.display = 'block';
    
    // Update Brew Impact box
    const brewImpactText = document.getElementById('brewImpactText');
    const brewImpactBox = document.getElementById('waterBrewImpact');
    if (brewImpactText && brewImpactBox) {
        brewImpactText.textContent = hardness.description || getHardnessDescription(category);
        brewImpactBox.style.display = 'block';
    }
}

function getHardnessDescription(category) {
    const descriptions = {
        'very_soft': 'Very soft: grind slightly finer and brew a little hotter.',
        'soft': 'Soft: grind a touch finer.',
        'medium': 'Medium: standard brew settings work well.',
        'hard': 'Hard: grind slightly coarser and brew a little cooler.',
        'very_hard': 'Very hard: go coarser and lower brew temperature slightly.'
    };
    return descriptions[category] || '';
}

export async function saveManualWaterHardness() {
    const manualInput = document.getElementById('manualHardnessInput');
    const value = parseFloat(manualInput.value);
    
    if (!value || value < 0 || value > 50) {
        alert('Please enter a value between 0 and 50 °dH.');
        return;
    }
    
    // Create manual hardness object
    const manualHardness = {
        value: value,
        category: getWaterHardnessCategory(value),
        region: 'Manual entry',
        source: 'Manual override',
        isManual: true
    };
    
    setManualWaterHardness(manualHardness);
    setWaterHardness(manualHardness);
    
    // Display updated value
    displayWaterHardness(manualHardness);
    
    // Sync to backend
    if (typeof window.backendSync !== 'undefined' && window.backendSync.syncWaterHardness) {
        await window.backendSync.syncWaterHardness(value);
    }
    
    // Update UI
    const waterBtn = document.getElementById('waterControlBtn');
    if (waterBtn) waterBtn.classList.add('active');
    
    renderCoffees();
    
    alert(`✓ Manual hardness saved: ${value} °dH`);
}

export function clearManualWaterHardness() {
    setManualWaterHardness(null);
    
    // Fallback to API value if available
    setWaterHardness(apiWaterHardness);
    
    if (apiWaterHardness) {
        displayWaterHardness(apiWaterHardness);
    }
    
    renderCoffees();
}
