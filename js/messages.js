// ==========================================
// MESSAGES
// Toast message system
// ==========================================

export function showMessage(type, message) {
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');

    if (type === 'error') {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        successEl.classList.add('hidden');
    } else if (type === 'info') {
        successEl.textContent = '⏳ ' + message;
        successEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
    } else {
        successEl.textContent = message;
        successEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
    }

    if (type !== 'info') {
        setTimeout(() => { errorEl.classList.add('hidden'); successEl.classList.add('hidden'); }, 5000);
    }
}
