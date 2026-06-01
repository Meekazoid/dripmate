// ==========================================
// THEME MANAGEMENT
// Dark/light theme toggle logic
// ==========================================

export function initTheme() {
    const stored = localStorage.getItem('theme');
    // First run: default to light; never overwrite an existing choice
    const savedTheme = stored !== null ? stored : 'light';
    if (stored === null) localStorage.setItem('theme', 'light');
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

// Match logo height to combined height of title + subtitle
export function alignHeader() {
    const logoDark  = document.getElementById('header-logo-dark');
    const logoLight = document.getElementById('header-logo-light');
    const title     = document.getElementById('brand-title');
    const subtitle  = document.getElementById('brand-subtitle');
    if (!title || !subtitle) return;

    const gap    = parseInt(getComputedStyle(subtitle).marginTop) || 2;
    const totalH = title.offsetHeight + subtitle.offsetHeight + gap;

    if (logoDark)  logoDark.style.height  = totalH + 'px';
    if (logoLight) logoLight.style.height = totalH + 'px';
}