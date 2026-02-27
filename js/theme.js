// ==========================================
// THEME MANAGEMENT
// Dark/light theme toggle logic
// ==========================================

export function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

export function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

export function toggleManual() {
    const manualSection = document.querySelector('.manual-section');
    manualSection.classList.toggle('hidden');
}

export function collapseManual() {
    const manualSection = document.querySelector('.manual-section');
    if (manualSection) manualSection.classList.add('hidden');
}
