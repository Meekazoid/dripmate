// ==========================================
// ROAST DATE & FRESHNESS
// Freshness badge calculation
// ==========================================

import { coffees, saveCoffeesAndSync } from './state.js';

export function updateRoastDate(index, dateValue) {
    coffees[index].roastDate = dateValue;
    saveCoffeesAndSync();

    const roastInput = document.getElementById(`roastDate-${index}`);
    if (roastInput) {
        roastInput.classList.toggle('has-date', Boolean(dateValue));
    }

    const badgeWrapper = document.getElementById(`freshness-badge-${index}`);
    if (badgeWrapper) {
        badgeWrapper.innerHTML = getRoastFreshnessBadge(coffees[index].roastDate);
    }
}

export function getRoastFreshnessBadge(roastDate) {
    if (!roastDate) return '';

    const roastTime = new Date(roastDate).getTime();
    const currentTime = Date.now();
    const daysDiff = Math.floor((currentTime - roastTime) / (1000 * 60 * 60 * 24));

    const flameIcon = `<svg class="freshness-icon" viewBox="0 0 24 24">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
    </svg>`;

    let category, label, gradientStyle = '';

    if (daysDiff < 7) {
        category = 'resting';
        label = 'Still Resting';
    } else if (daysDiff < 30) {
        category = 'sweet';
        label = 'Sweet Spot';

        if (daysDiff < 10) {
            const progress = (daysDiff - 7) / 3;
            const blueOpacity = 0.15 * (1 - progress);
            const orangeOpacity = 0.15 * progress;
            gradientStyle = `background: linear-gradient(135deg, rgba(33, 150, 243, ${blueOpacity}) 0%, rgba(255, 152, 0, ${orangeOpacity}) 100%);`;
        } else if (daysDiff >= 25) {
            const progress = (daysDiff - 25) / 5;
            const orangeOpacity = 0.15 * (1 - progress);
            const grayOpacity = 0.15 * progress;
            gradientStyle = `background: linear-gradient(135deg, rgba(255, 152, 0, ${orangeOpacity}) 0%, rgba(158, 158, 158, ${grayOpacity}) 100%);`;
        }
    } else {
        category = 'fading';
        label = 'Fading';
    }

    return `<div class="freshness-badge ${category}" style="${gradientStyle}">${flameIcon}${label}</div>`;
}
