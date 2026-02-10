// ==========================================
// BREW TIMER
// Pour-over timer logic with pause/resume
// ==========================================

import { coffees, brewTimers, animationFrames } from './state.js';
import { getBrewRecommendations } from './brew-engine.js';

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
    const brewParams = getBrewRecommendations(coffees[index]);

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

    brewTimers[index] = { startTime: performance.now(), steps, isRunning: true, isPaused: false };

    const startBtn = document.getElementById(`start-brew-${index}`);
    const pauseBtn = document.getElementById(`pause-brew-${index}`);
    const resetBtn = document.getElementById(`reset-brew-${index}`);

    if (startBtn) { startBtn.textContent = 'Brewing...'; startBtn.classList.add('brewing'); startBtn.disabled = true; }
    if (pauseBtn) pauseBtn.disabled = false;
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
        timer.startTime = performance.now() - (timer.pausedAt || 0);
        timer.isPaused = false;
        timer.isRunning = true;
        updateBrewProgress(index);
        const pauseBtn = document.getElementById(`pause-brew-${index}`);
        if (pauseBtn) pauseBtn.textContent = 'Pause';
    } else {
        timer.pausedAt = performance.now() - timer.startTime;
        timer.isPaused = true;
        timer.isRunning = false;
        if (animationFrames[index]) cancelAnimationFrame(animationFrames[index]);
        const pauseBtn = document.getElementById(`pause-brew-${index}`);
        if (pauseBtn) pauseBtn.textContent = 'Resume';
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

    if (startBtn) { startBtn.textContent = 'Start Brew'; startBtn.classList.remove('brewing'); startBtn.disabled = false; }
    if (pauseBtn) { pauseBtn.textContent = 'Pause'; pauseBtn.disabled = true; }
    if (resetBtn) resetBtn.disabled = true;

    delete brewTimers[index];
    delete animationFrames[index];
}

function updateBrewProgress(index) {
    const timer = brewTimers[index];
    if (!timer || !timer.isRunning) return;

    const elapsedMs = performance.now() - timer.startTime;
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

    animationFrames[index] = requestAnimationFrame(() => updateBrewProgress(index));
}

// Register functions on window for onclick handlers
window.startBrewTimer = startBrewTimer;
window.pauseBrewTimer = pauseBrewTimer;
window.resetBrewTimer = resetBrewTimer;
