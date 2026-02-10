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
        'very_soft': 'SEHR WEICH',
        'soft': 'WEICH',
        'medium': 'MITTEL',
        'hard': 'HART',
        'very_hard': 'SEHR HART'
    };
    
    const category = hardness.category || getWaterHardnessCategory(hardness.value);
    const categoryText = hardness.category_de ? hardness.category_de.toUpperCase() : categoryMap[category];
    
    document.getElementById('hardnessValueDisplay').textContent = `${hardness.value} °dH`;
    document.getElementById('hardnessCategoryDisplay').textContent = categoryText;
    
    // Display source badge
    const sourceDisplay = document.getElementById('hardnessSourceDisplay');
    if (source === 'manual') {
        sourceDisplay.textContent = '✏️ MANUAL OVERRIDE';
        sourceDisplay.style.background = 'rgba(76, 175, 80, 0.15)';
        sourceDisplay.style.color = '#4CAF50';
    } else {
        sourceDisplay.textContent = '📍 AUTO-DETECTED';
        sourceDisplay.style.background = 'rgba(212, 165, 116, 0.15)';
        sourceDisplay.style.color = 'var(--accent)';
    }
    
    document.getElementById('hardnessRegion').textContent = hardness.region || 'Manual Entry';
    document.getElementById('hardnessSource').textContent = hardness.source || 'User Input';
    document.getElementById('hardnessDescriptionDisplay').textContent = 
        hardness.description || getHardnessDescription(category);
    document.getElementById('waterHardnessDisplay').style.display = 'block';
}

function getHardnessDescription(category) {
    const descriptions = {
        'very_soft': 'Sehr weiches Wasser - feinerer Mahlgrad und höhere Temperatur empfohlen',
        'soft': 'Weiches Wasser - leicht feinerer Mahlgrad empfohlen',
        'medium': 'Mittelhartes Wasser - Standard-Einstellungen funktionieren gut',
        'hard': 'Hartes Wasser - gröberer Mahlgrad und niedrigere Temperatur empfohlen',
        'very_hard': 'Sehr hartes Wasser - deutlich gröberer Mahlgrad, Filterung empfohlen'
    };
    return descriptions[category] || '';
}

export async function saveWaterHardness() {
    const zipCode = document.getElementById('zipCodeInput').value.trim();

    if (!zipCode) { alert('Please enter a postal code.'); return; }
    if (!/^\d{5}$/.test(zipCode)) { alert('Please enter a valid 5-digit postal code.'); return; }
    if (typeof WaterHardness === 'undefined') { alert('Water hardness module not loaded. Please reload the page.'); return; }

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
            alert('Note: Manual water hardness override is active. ZIP-based value saved as fallback.');
        }

        const waterBtn = document.getElementById('waterControlBtn');
        if (waterBtn) waterBtn.classList.add('active');

        renderCoffees();
    } catch (error) {
        alert(`Error loading water hardness:\n${error.message}`);
    }
}

export async function saveManualWaterHardness() {
    const manualInput = document.getElementById('manualHardnessInput');
    const value = parseFloat(manualInput.value);
    
    if (!value || value < 0 || value > 50) {
        alert('Please enter a valid water hardness value between 0 and 50 °dH.');
        return;
    }
    
    // Create manual hardness object
    const manualHardness = {
        value: value,
        category: getWaterHardnessCategory(value),
        region: 'Manual Entry',
        source: 'User Input',
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
    
    alert(`✓ Manual water hardness saved: ${value} °dH\n\nYour brew parameters have been adjusted.`);
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
