// ==========================================
// BREW TIMER STUBS
// Global wrapper functions that delegate to
// the module-loaded timer once app.js is ready.
// Must be loaded as a plain script (not module)
// so window.startBrewTimer etc. are globally
// available to inline onclick handlers in
// dynamically rendered coffee cards.
// ==========================================

window.startBrewTimer = function(index) {
    if (window._startBrewTimer) return window._startBrewTimer(index);
    console.error('startBrewTimer not yet loaded');
};

window.resetBrewTimer = function(index) {
    if (window._resetBrewTimer) return window._resetBrewTimer(index);
};

window.finishBrewTimer = function(index) {
    if (window._finishBrewTimer) return window._finishBrewTimer(index);
};