// ==========================================
// BREW TIMER
// Pour-over timer logic with pause/resume
// ==========================================

import { coffees, brewTimers, animationFrames, coffeeAmount } from './state.js';
import { getBrewRecommendations } from './brew-engine.js';

// Local implementation to avoid circular dependency with feedback.js
function addBrewHistoryEntry(coffee, entry) {
    if (!coffee.feedbackHistory) coffee.feedbackHistory = [];
    coffee.feedbackHistory.unshift(entry);
    if (coffee.feedbackHistory.length > 30) {
        coffee.feedbackHistory = coffee.feedbackHistory.slice(0, 30);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

export function startBrewTimer(index) {
    const coffee = coffees[index];
    const brewParams = getBrewRecommendations(coffee);

    if (!brewTimers[index]) brewTimers[index] = {};
    const brewStartedAt = Date.now();

    const steps = brewParams.steps.map((step, i) => ({
        ...step,
        startSeconds: parseTimeToSeconds(step.time),
        index: i
    }));

    const totalBrewTime = steps[steps.length - 1].startSeconds + 60;

    steps.forEach((step, i) => {
        step.endSeconds = i < steps.length - 1 ? steps[i + 1].startSeconds : totalBrewTime;
        step.duration = step.endSeconds - step.startSeconds;
    });

    // Snapshot brew parameters at start time
    const methodLabels = { v60: 'V60', chemex: 'Chemex', aeropress: 'AeroPress' };
    const methodLabel = methodLabels[brewParams.method] || brewParams.method || 'V60';
    const brewAmount = coffee.customAmount || coffeeAmount;
    const brewGrind = brewParams.grindSetting || '-';
    const brewTemp = coffee.customTemp || brewParams.temperature || '-';
    const brewSnapshot = `Brewed ${brewAmount}g on ${methodLabel}  ›  Grind ${brewGrind}  ›  ${brewTemp}`;

    // WICHTIG: Wir nutzen jetzt Date.now() für absolute, echte Zeitsynchronisation
    brewTimers[index] = { 
        startTime: Date.now(), // <-- Background-Proof
        steps, 
        isRunning: true, 
        isPaused: false, 
        brewStartedAt,
        historyLogged: false,
        brewSnapshot: brewSnapshot // Für den Auto-Log gespeichert
    };

    const startBtn = document.getElementById(`start-brew-${index}`);
    const pauseBtn = document.getElementById(`pause-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) {
        const iconSpan = startBtn.querySelector('.brew-btn-icon');
        const iconHTML = iconSpan ? iconSpan.outerHTML : '';
        startBtn.innerHTML = iconHTML + ' Brewing...';
        startBtn.classList.add('brewing');
        startBtn.disabled = true;
    }
    if (pauseBtn) { pauseBtn.disabled = false; pauseBtn.classList.remove('resume-active'); }
    if (resetBtn) resetBtn.disabled = false;

    // Smooth scroll to pour-over steps
    const card = document.querySelector(`.coffee-card[data-original-index="${index}"]`);
    if (card) {
        const brewSteps = card.querySelector('.brew-steps');
        if (brewSteps) {
            const targetTimeBox = card.querySelector('.param-grid');
            const offset = targetTimeBox ? targetTimeBox.offsetHeight + 60 : 100;
            const elementPosition = brewSteps.getBoundingClientRect().top;
            window.scrollTo({ top: elementPosition + window.pageYOffset - offset, behavior: 'smooth' });
        }
    }

    updateBrewProgress(index);
}

export function pauseBrewTimer(index) {
    const timer = brewTimers[index];
    if (!timer) return;

    if (timer.isPaused) {
        // Resume: Verschiebe die Startzeit um die Zeit, die wir pausiert haben
        timer.startTime = Date.now() - (timer.pausedAt || 0);
        timer.isPaused = false;
        timer.isRunning = true;
        updateBrewProgress(index);
        const pauseBtn = document.getElementById(`pause-brew-${index}`);
        if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.classList.remove('resume-active'); }
    } else {
        // Pause: Speichere, wie viele Millisekunden vergangen waren, bevor wir pausiert haben
        timer.pausedAt = Date.now() - timer.startTime;
        timer.isPaused = true;
        timer.isRunning = false;
        if (animationFrames[index]) cancelAnimationFrame(animationFrames[index]);
        const pauseBtn = document.getElementById(`pause-brew-${index}`);
        if (pauseBtn) { pauseBtn.textContent = 'Resume'; pauseBtn.classList.add('resume-active'); }
    }
}

export function resetBrewTimer(index) {
    const timer = brewTimers[index];
    if (!timer) return;

    timer.isRunning = false;
    if (animationFrames[index]) cancelAnimationFrame(animationFrames[index]);

    timer.steps.forEach((_, i) => {
        const bar = document.getElementById(`progress-bar-${index}-${i}`);
        if (bar) bar.style.width = '0%';
    });

    const display = document.getElementById(`brew-timer-display-${index}`);
    if (display) display.textContent = '00:00';

    const startBtn = document.getElementById(`start-brew-${index}`);
    const pauseBtn = document.getElementById(`pause-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) {
        const iconSpan = startBtn.querySelector('.brew-btn-icon');
        const iconHTML = iconSpan ? iconSpan.outerHTML : '';
        startBtn.innerHTML = iconHTML + ' Start Brew';
        startBtn.classList.remove('brewing');
        startBtn.disabled = false;
    }
    if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.disabled = true; pauseBtn.classList.remove('resume-active'); }
    if (resetBtn) resetBtn.disabled = true;

    delete brewTimers[index];
    delete animationFrames[index];
}

function updateBrewProgress(index) {
    const timer = brewTimers[index];
    if (!timer || !timer.isRunning) return;

    // Echte Zeitdifferenz berechnen (ignoriert Standby/Background-Throttling)
    const elapsedMs = Date.now() - timer.startTime;
    const elapsedSeconds = elapsedMs / 1000;

    const display = document.getElementById(`brew-timer-display-${index}`);
    if (display) display.textContent = formatTime(Math.floor(elapsedSeconds));

    timer.steps.forEach((step, i) => {
        const bar = document.getElementById(`progress-bar-${index}-${i}`);
        if (!bar) return;

        let pct = 0;
        if (elapsedSeconds >= step.endSeconds) {
            pct = 100;
        } else if (elapsedSeconds > step.startSeconds) {
            pct = Math.min(100, ((elapsedSeconds - step.startSeconds) / step.duration) * 100);
        }
        bar.style.width = `${pct.toFixed(2)}%`;
    });

    // NEU: Der 30s-Logger, der auch funktioniert, wenn das Handy schläft!
    if (elapsedMs >= 30000 && !timer.historyLogged) {
        timer.historyLogged = true;
        addBrewHistoryEntry(coffees[index], {
            timestamp: new Date().toISOString(),
            brewStart: true,
            brewLabel: timer.brewSnapshot
        });
        try { localStorage.setItem('coffees', JSON.stringify(coffees)); } catch(e) {}
    }

    animationFrames[index] = requestAnimationFrame(() => updateBrewProgress(index));
}

// Globaler "Wake-Up"-Trigger: Wenn man aus einer anderen App / dem Standby zurückkehrt
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        Object.keys(brewTimers).forEach(index => {
            const timer = brewTimers[index];
            if (timer && timer.isRunning && !timer.isPaused) {
                // Einmal manuell triggern, um die Anzeige sofort zu korrigieren
                updateBrewProgress(index);
            }
        });
    }
});

// Register real functions — stubs in index.html delegate to these
window._startBrewTimer = startBrewTimer;
window._pauseBrewTimer = pauseBrewTimer;
window._resetBrewTimer = resetBrewTimer;
