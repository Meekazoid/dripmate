// ==========================================
// SERVICE WORKER REGISTRATION
// Registers /sw.js for offline PWA support.
// ==========================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SW_VERSION') {
            const el = document.getElementById('sw-version-display');
            if (el) el.textContent = event.data.version;
        }
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration.scope);
                registration.update();

                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                            console.log('New Service Worker activated - reloading for updates');
                            window.location.reload();
                        }
                    });
                });
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });

        navigator.serviceWorker.ready.then(reg => {
            if (reg.active) reg.active.postMessage({ type: 'GET_VERSION' });
        });
    });
}