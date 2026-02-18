// ==========================================
// COFFEE CARD RENDERING
// Coffee card HTML template rendering
// ==========================================

import { coffeeAmount, sanitizeHTML } from './state.js';
import { getBrewRecommendations, boldWeights } from './brew-engine.js';
import { getRoastFreshnessBadge } from './freshness.js';
import { ensureInitialValues } from './feedback.js';
import './brew-timer.js';
import './card-editor.js';

export function renderCoffeeCard(coffee, index) {
    ensureInitialValues(coffee);
    const brewParams = getBrewRecommendations(coffee);
    const amount = coffee.customAmount || coffeeAmount;

    // Roastery: nur anzeigen wenn Wert vorhanden
    const roasteryHTML = coffee.roastery
        ? `<div class="coffee-roastery" id="roastery-display-${index}">${sanitizeHTML(coffee.roastery)}</div>`
        : `<div class="coffee-roastery" id="roastery-display-${index}" style="display:none;"></div>`;

    return `
        <div class="coffee-card" data-original-index="${index}">
            <div class="coffee-header">
                <div>
                    ${roasteryHTML}
                    <div class="coffee-name" id="name-display-${index}">${sanitizeHTML(coffee.name)}</div>
                    <div class="coffee-origin" id="origin-display-${index}">${sanitizeHTML(coffee.origin)}</div>
                </div>
                <button class="favorite-btn ${coffee.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${index});">
                    <svg class="star-icon" viewBox="0 0 24 24">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
                <button class="edit-btn" id="edit-btn-${index}" onclick="event.stopPropagation(); toggleEditMode(${index});">
                    <svg class="edit-icon" id="edit-icon-${index}" viewBox="0 0 24 24">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                </button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteCoffee(${index});">
                    <svg class="delete-icon" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
            
            <div class="process-freshness-row">
                <div class="coffee-process-small">${sanitizeHTML(coffee.process)}</div>
                <div class="freshness-badge-inline" id="freshness-badge-${index}">
                    ${getRoastFreshnessBadge(coffee.roastDate)}
                </div>
            </div>
            
            <div class="brew-params">
                <div class="roast-date-section">
                    <div class="roast-date-input-wrapper">
                        <svg class="roast-icon" viewBox="0 0 24 24">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                        </svg>
                        <span class="roast-label">Roast Date</span>
                        <input type="date" id="roastDate-${index}" class="roast-date-input"
                            value="${coffee.roastDate || ''}"
                            onchange="updateRoastDate(${index}, this.value); event.stopPropagation();"
                            onclick="event.stopPropagation();" />
                    </div>
                </div>
                
                <div class="ratio-control">
                    <h4 id="amount-header-${index}">Coffee Amount – Ratio 1:${brewParams.ratioNumber}</h4>
                    <div class="ratio-slider">
                        <div class="ratio-value-display">
                            <span class="ratio-value" id="ratioValue-${index}">${amount}g</span>
                        </div>
                        <div class="slider-track">
                            <span>10g</span>
                            <input type="range" min="10" max="30" value="${amount}" 
                                oninput="updateCoffeeAmountLive(this.value, ${index}); event.stopPropagation();" 
                                onmousedown="event.stopPropagation();"
                                ontouchstart="event.stopPropagation();"
                                onclick="event.stopPropagation();">
                            <span>30g</span>
                        </div>
                    </div>
                </div>
                
                <div class="param-grid">
                    <div class="param-box">
                        <div class="param-label">${brewParams.grinderLabel}</div>
                        <div class="param-value-row">
                            <div class="param-value" id="grind-value-${index}">${brewParams.grindSetting}</div>
                            <div class="param-adjust">
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustGrindManual(${index}, 1);">+</button>
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustGrindManual(${index}, -1);">−</button>
                            </div>
                        </div>
                    </div>
                    <div class="param-box">
                        <div class="param-label">Temperature</div>
                        <div class="param-value-row">
                            <div class="param-value" id="temp-value-${index}">${brewParams.temperature}</div>
                            <div class="param-adjust">
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustTempManual(${index}, 1);">+</button>
                                <button class="adjust-btn" onclick="event.stopPropagation(); adjustTempManual(${index}, -1);">−</button>
                            </div>
                        </div>
                    </div>
                    <div class="param-box">
                        <div class="param-label">Water</div>
                        <div class="param-value" id="water-value-${index}">${brewParams.waterAmountMl}ml</div>
                    </div>
                    <div class="param-box">
                        <div class="param-label">Target Time</div>
                        <div class="param-value">${brewParams.targetTime}</div>
                    </div>
                </div>
                
                <div class="brew-timer-section">
                    <div class="timer-display" id="brew-timer-display-${index}">00:00</div>
                    <div class="timer-controls-main">
                        <button class="timer-btn start-brew" id="start-brew-${index}" onclick="event.stopPropagation(); startBrewTimer(${index});">
                            Start Brew
                        </button>
                    </div>
                    <div class="timer-controls-secondary">
                        <button class="timer-btn timer-btn-secondary" id="pause-brew-${index}" onclick="event.stopPropagation(); pauseBrewTimer(${index});" disabled>Pause</button>
                        <button class="timer-btn timer-btn-secondary" id="reset-brew-${index}" onclick="event.stopPropagation(); resetBrewTimer(${index});" disabled>Reset</button>
                    </div>
                </div>
                
                <div class="brew-steps">
                    <h4>${brewParams.method === 'aeropress' ? 'AeroPress Brew Steps' : brewParams.method === 'chemex' ? 'Chemex Pour-Over Steps' : 'V60 Pour-Over Steps'}</h4>
                    ${brewParams.steps.map((step, stepIndex) => `
                        <div class="step">
                            <div class="step-time">${step.time}</div>
                            <div class="step-action">${boldWeights(step.action)}</div>
                            <div class="step-progress">
                                <div class="step-progress-bar" id="progress-bar-${index}-${stepIndex}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="feedback-section">
                    <h4>Brew Feedback</h4>
                    <div class="feedback-cupping-note">Cupping-style quick rating (low / balanced / high).</div>
                    <div class="feedback-group">
                        <div class="feedback-label">Bitterness</div>
                        <div class="feedback-scale">
                            ${['low', 'balanced', 'high'].map(v => `
                                <div class="scale-option ${coffee.feedback?.bitterness === v ? 'selected' : ''}" 
                                     data-feedback="${index}-bitterness" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'bitterness', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-group">
                        <div class="feedback-label">Sweetness</div>
                        <div class="feedback-scale">
                            ${['low', 'balanced', 'high'].map(v => `
                                <div class="scale-option ${coffee.feedback?.sweetness === v ? 'selected' : ''}" 
                                     data-feedback="${index}-sweetness" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'sweetness', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-group">
                        <div class="feedback-label">Acidity</div>
                        <div class="feedback-scale">
                            ${['low', 'balanced', 'high'].map(v => `
                                <div class="scale-option ${coffee.feedback?.acidity === v ? 'selected' : ''}" 
                                     data-feedback="${index}-acidity" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'acidity', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-group">
                        <div class="feedback-label">Body</div>
                        <div class="feedback-scale">
                            ${['low', 'balanced', 'high'].map(v => `
                                <div class="scale-option ${coffee.feedback?.body === v ? 'selected' : ''}" 
                                     data-feedback="${index}-body" data-value="${v}"
                                     onclick="event.stopPropagation(); selectFeedback(${index}, 'body', '${v}');">
                                    ${v.charAt(0).toUpperCase() + v.slice(1)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="feedback-suggestion hidden" id="suggestion-${index}"></div>
                    <button class="history-btn" onclick="event.stopPropagation(); openFeedbackHistory(${index});">View Adjustment History</button>
                    <button class="reset-adjustments-btn" onclick="event.stopPropagation(); resetCoffeeAdjustments(${index});">Reset Adjustments</button>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 8px; font-size: 0.9rem;">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <svg style="width: 18px; height: 18px; flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                            <path d="M9 18h6"></path><path d="M10 22h4"></path>
                        </svg>
                        <div>
                            <strong style="color: var(--accent); display: block; margin-bottom: 6px;">Tip:</strong>
                            <span style="color: var(--text-secondary); line-height: 1.5;">${brewParams.notes}</span>
                        </div>
                    </div>
                </div>
                
                ${coffee.cultivar && coffee.cultivar !== 'Unknown' ? `
                <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                    <strong>Variety:</strong> ${sanitizeHTML(coffee.cultivar)} | <strong>Altitude:</strong> ${sanitizeHTML(coffee.altitude)} masl
                </div>` : ''}
                
                <div style="margin-top: 16px; color: var(--text-secondary); font-size: 0.9rem;">
                    <strong>Tasting Notes:</strong> ${sanitizeHTML(coffee.tastingNotes)}
                </div>
            </div>
        </div>
    `;
}
