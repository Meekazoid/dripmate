// ==========================================
// WATER HARDNESS
// Water hardness modal, ZIP lookup, manual input
// ==========================================

import { 
    manualWaterHardness, 
    apiWaterHardness, 
    userZipCode,
    setWaterHardness,
    setManualWaterHardness,
    setApiWaterHardness,
    setUserZipCode
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
    document.getElementById('zipCodeInput').value = userZipCode;
    
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
        displayWaterHardness(activeHardness, manualWaterHardness ? 'manual' : 'api');
    }
}

export function closeWaterModal() {
    document.getElementById('waterModal').classList.remove('active');
}

function displayWaterHardness(hardness, source = 'api') {
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
    
    // Display source badge
    const sourceDisplay = document.getElementById('hardnessSourceDisplay');
    if (source === 'manual') {
        sourceDisplay.textContent = 'MANUAL OVERRIDE';
        sourceDisplay.style.background = 'rgba(76, 175, 80, 0.15)';
        sourceDisplay.style.color = '#4CAF50';
    } else {
        sourceDisplay.textContent = 'ZIP LOOKUP';
        sourceDisplay.style.background = 'rgba(212, 165, 116, 0.15)';
        sourceDisplay.style.color = 'var(--accent)';
    }
    
    document.getElementById('hardnessRegion').textContent = hardness.region || (source === 'manual' ? 'Manual entry' : 'ZIP location');
    document.getElementById('hardnessSource').textContent = source === 'manual' ? 'Manual override' : 'Automatic ZIP lookup';
    document.getElementById('hardnessDescriptionDisplay').textContent = 
        hardness.description || getHardnessDescription(category);
    document.getElementById('waterHardnessDisplay').style.display = 'block';
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

export async function saveWaterHardness() {
    const zipCode = document.getElementById('zipCodeInput').value.trim();

    if (!zipCode) { alert('Please enter a ZIP code.'); return; }
    if (!/^\d{5}$/.test(zipCode)) { alert('Please enter a valid 5-digit ZIP code.'); return; }
    if (typeof WaterHardness === 'undefined') { alert('Water module not loaded. Please reload the page.'); return; }

    try {
        const hardness = await WaterHardness.getHardness(zipCode);
        setApiWaterHardness(hardness);
        setUserZipCode(zipCode);
        
        // Only update active hardness if no manual override exists
        if (!manualWaterHardness) {
            setWaterHardness(hardness);
            displayWaterHardness(hardness, 'api');
        } else {
            // Show API value but indicate manual is active
            displayWaterHardness(manualWaterHardness, 'manual');
            alert('Manual override is active. ZIP result was saved as fallback.');
        }

        const waterBtn = document.getElementById('waterControlBtn');
        if (waterBtn) waterBtn.classList.add('active');

        renderCoffees();
    } catch (error) {
        alert(`Could not load water hardness:\n${error.message}`);
    }
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
    displayWaterHardness(manualHardness, 'manual');
    
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
        displayWaterHardness(apiWaterHardness, 'api');
    }
    
    renderCoffees();
}
