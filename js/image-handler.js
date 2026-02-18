// ==========================================
// IMAGE HANDLING & AI ANALYSIS
// Camera capture, file upload, image compression
// ==========================================

import { CONFIG } from './config.js';
import { coffees, saveCoffeesAndSync } from './state.js';
import { renderCoffees } from './coffee-list.js';
import { showMessage } from './messages.js';

async function compressImage(file, maxSizeMB = 4.0) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                const maxDim = 1920;

                if (width > maxDim || height > maxDim) {
                    if (width > height) { height = (height / width) * maxDim; width = maxDim; }
                    else { width = (width / height) * maxDim; height = maxDim; }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.85;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                let attempts = 0;
                const targetSize = maxSizeMB * 1024 * 1024 * 1.37;
                let consecutiveResets = 0;

                while (dataUrl.length > targetSize && attempts < 10) {
                    quality -= 0.08;
                    if (quality < 0.4 && attempts > 5) {
                        consecutiveResets++;
                        if (consecutiveResets > 2) break;
                        width = Math.floor(width * 0.85);
                        height = Math.floor(height * 0.85);
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        quality = 0.7;
                    }
                    dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.1, quality));
                    attempts++;
                }

                if (dataUrl.length > targetSize) {
                    canvas.width = Math.floor(width * 0.7);
                    canvas.height = Math.floor(height * 0.7);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                }

                resolve({ dataUrl, base64: dataUrl.split(',')[1], type: 'image/jpeg', originalSize: file.size, compressedSize: Math.round(dataUrl.length * 0.75) });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function analyzeCoffeeImage(imageData, mediaType) {
    if (!CONFIG.backendUrl) throw new Error('Backend URL not configured. Please enter it in settings.');

    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('deviceId');
    if (!token || !deviceId) {
        throw new Error('Device not activated. Please add your access code in Settings (⚙️) to use AI scan.');
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('You are offline. Reconnect to the internet to analyze coffee bags.');
    }

    const response = await fetch(`${CONFIG.backendUrl}/api/analyze-coffee`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Device-ID': deviceId
        },
        body: JSON.stringify({ imageData, mediaType }),
    });

    if (!response.ok) {
        let errorPayload = null;
        try {
            errorPayload = await response.json();
        } catch (_) {
            errorPayload = null;
        }

        if (response.status === 429) {
            throw new Error('AI limit reached. Please wait and try again later (rate limit).');
        }

        if (response.status === 401 || response.status === 403) {
            throw new Error('Access invalid or expired. Please reactivate your device in Settings (⚙️).');
        }

        if (response.status === 413) {
            throw new Error('Image is too large. Please try a smaller image or crop the photo.');
        }

        const backendMessage = errorPayload?.error || errorPayload?.message;
        if (backendMessage && /blurry|unclear|illegible|cannot read|not readable/i.test(backendMessage)) {
            throw new Error('Image looks too unclear for OCR. Use better light and keep the label sharp.');
        }

        throw new Error(backendMessage || 'AI analysis failed. Please try a clearer photo.');
    }

    const result = await response.json();
    if (!result.success) {
        const backendMessage = result.error || result.message || '';
        if (/blurry|unclear|illegible|cannot read|not readable/i.test(backendMessage)) {
            throw new Error('Image looks too unclear for OCR. Use better light and keep the label sharp.');
        }
        throw new Error(backendMessage || 'AI analysis failed. Please try a clearer photo.');
    }
    return result.data;
}

export async function processImageUpload(file, uploadBtn) {
    const preview = document.getElementById('imagePreview');
    const loadingEl = document.getElementById('loadingMessage');
    const cameraBtn = document.getElementById('cameraBtn');

    loadingEl.classList.remove('hidden');
    cameraBtn.disabled = true;
    if (uploadBtn) uploadBtn.disabled = true;

    try {
        const previewReader = new FileReader();
        previewReader.onload = (event) => { preview.src = event.target.result; preview.style.display = 'block'; };
        previewReader.readAsDataURL(file);

        const fileSizeMB = file.size / (1024 * 1024);
        let imageData, mediaType;

        if (fileSizeMB > 4.0) {
            showMessage('info', `Compressing image (${fileSizeMB.toFixed(1)}MB → smaller)...`);
            const compressed = await compressImage(file);
            imageData = compressed.base64;
            mediaType = compressed.type;
        } else {
            imageData = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result.split(',')[1]);
                r.onerror = reject;
                r.readAsDataURL(file);
            });
            mediaType = file.type;
        }

        const coffeeInfo = await analyzeCoffeeImage(imageData, mediaType);
        coffees.unshift(coffeeInfo);
        saveCoffeesAndSync();
        renderCoffees();
        showMessage('success', '✓ Coffee added successfully!');
        preview.style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        const msg = error?.message || '';
        if (!msg) {
            showMessage('error', 'Scan failed. Please retry with a clear, well-lit coffee bag photo.');
        } else if (/Failed to fetch|NetworkError|network/i.test(msg)) {
            showMessage('error', 'Network problem while scanning. Check your connection and try again.');
        } else {
            showMessage('error', msg);
        }
    } finally {
        loadingEl.classList.add('hidden');
        cameraBtn.disabled = false;
        if (uploadBtn) uploadBtn.disabled = false;
    }
}
