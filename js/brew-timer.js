// ==========================================
// BREW TIMER
// Pour-over timer logic with finish/reset
// ==========================================

import { coffees, brewTimers, animationFrames, coffeeAmount, saveCoffeesAndSync } from './state.js';
import { getBrewRecommendations } from './brew-engine.js';
import { METHODS } from './data/methods.js';

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
    const methodLabel = (METHODS[brewParams.method] || METHODS.v60).timerLabel;
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
        brewSnapshot,
        brewAmount: String(brewAmount),
        brewMethod: methodLabel,
        brewGrind: String(brewGrind),
        brewTemp: String(brewTemp),
    };

    const startBtn = document.getElementById(`start-brew-${index}`);
    const finishBtn = document.getElementById(`finish-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) {
        const iconSpan = startBtn.querySelector('.brew-btn-icon');
        const iconHTML = iconSpan ? iconSpan.outerHTML : '';
        startBtn.innerHTML = iconHTML + ' Brewing...';
        startBtn.classList.add('brewing');
        startBtn.disabled = true;
    }
    if (finishBtn) finishBtn.disabled = false;
    if (resetBtn) resetBtn.disabled = false;

    // Smooth scroll to brew block (vitals visible at top)
    const card = document.querySelector(`.coffee-card[data-original-index="${index}"]`);
    if (card) {
        const brewBlock = card.querySelector('.brew-block');
        if (brewBlock) {
            const elementPosition = brewBlock.getBoundingClientRect().top;
            window.scrollTo({ top: elementPosition + window.pageYOffset - 20, behavior: 'smooth' });
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
        if (bar) { bar.style.width = '0%'; bar.classList.remove('is-active', 'is-complete'); }
    });

    const display = document.getElementById(`brew-timer-display-${index}`);
    if (display) display.textContent = '00:00';

    const startBtn = document.getElementById(`start-brew-${index}`);
    const finishBtn = document.getElementById(`finish-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) {
        const iconSpan = startBtn.querySelector('.brew-btn-icon');
        const iconHTML = iconSpan ? iconSpan.outerHTML : '';
        startBtn.innerHTML = iconHTML + ' Start Brew';
        startBtn.classList.remove('brewing');
        startBtn.disabled = false;
    }
    if (finishBtn) finishBtn.disabled = true;
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
        bar.classList.toggle('is-active', pct > 0 && pct < 100);
        bar.classList.toggle('is-complete', pct >= 100);
    });

    // 30s safety net logger (runs even if phone sleeps; finishBrewTimer adds duration on top)
    if (elapsedMs >= 30000 && !timer.historyLogged) {
        timer.historyLogged = true;
        const brewEntry = {
            timestamp: new Date().toISOString(),
            brewStart: true,
            brewLabel: timer.brewSnapshot,
            brewAmount: timer.brewAmount,
            brewMethod: timer.brewMethod,
            brewGrind: timer.brewGrind,
            brewTemp: timer.brewTemp,
        };
        addBrewHistoryEntry(coffees[index], brewEntry);
        timer.historyEntry = brewEntry;
        saveCoffeesAndSync();
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

export function finishBrewTimer(index) {
    const timer = brewTimers[index];
    if (!timer) return;

    timer.isRunning = false;
    if (animationFrames[index]) cancelAnimationFrame(animationFrames[index]);

    const elapsedMs = timer.isPaused ? (timer.pausedAt || 0) : (Date.now() - timer.startTime);
    const durationStr = formatTime(Math.floor(elapsedMs / 1000));

    if (timer.historyLogged && timer.historyEntry) {
        timer.historyEntry.brewDuration = durationStr;
    } else {
        const entry = {
            timestamp: new Date().toISOString(),
            brewStart: true,
            brewLabel: timer.brewSnapshot,
            brewDuration: durationStr,
            brewAmount: timer.brewAmount,
            brewMethod: timer.brewMethod,
            brewGrind: timer.brewGrind,
            brewTemp: timer.brewTemp,
        };
        addBrewHistoryEntry(coffees[index], entry);
        timer.historyEntry = entry;
        timer.historyLogged = true;
    }
    saveCoffeesAndSync();

    const startBtn = document.getElementById(`start-brew-${index}`);
    const finishBtn = document.getElementById(`finish-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) {
        const iconSpan = startBtn.querySelector('.brew-btn-icon');
        const iconHTML = iconSpan ? iconSpan.outerHTML : '';
        startBtn.innerHTML = iconHTML + ' Start Brew';
        startBtn.classList.remove('brewing');
        startBtn.disabled = false;
    }
    if (finishBtn) finishBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = false;
}

// Register real functions — stubs delegate to these
window._startBrewTimer = startBrewTimer;
window._resetBrewTimer = resetBrewTimer;
window._finishBrewTimer = finishBrewTimer;
