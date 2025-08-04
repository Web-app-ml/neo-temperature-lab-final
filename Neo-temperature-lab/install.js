let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const wrapper = document.getElementById('install-wrapper');

// SVG icon markup (used everywhere)
const svgIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 16L8 12h3V4h2v8h3l-4 4zM5 20h14v-2H5v2z"/>
  </svg>`;

// Auto-hide if already installed
if (localStorage.getItem('pwa_installed_once') === 'true') {
    if (wrapper) wrapper.style.display = 'none';
    if (installBtn) installBtn.remove();
}

// Utility: temporary hint
function showHint(message) {
    if (!installBtn) return;
    if (document.getElementById('install-hint')) return;
    const hint = document.createElement('div');
    hint.id = 'install-hint';
    hint.textContent = message;
    hint.style.cssText = `
    position: fixed;
    bottom: 90px;
    right: 20px;
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 13px;
    z-index: 10001;
    backdrop-filter: blur(6px);
    box-shadow: 0 12px 40px rgba(246,214,107,0.35);
    max-width: 260px;
    opacity: 1;
    transition: opacity .3s ease;
  `;
    document.body.appendChild(hint);
    setTimeout(() => {
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 300);
    }, 2500);
}

// Listen for beforeinstallprompt and cache it
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // prevent automatic banner
    deferredPrompt = e;

    if (localStorage.getItem('pwa_installed_once') !== 'true' && installBtn) {
        installBtn.innerHTML = svgIcon;
        installBtn.classList.add('show');
        installBtn.disabled = false;
    }
});

// Click handler: user gesture triggers prompt
installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) {
        showHint('Install prompt not available. Try refreshing.');
        return;
    }

    installBtn.disabled = true; // prevent double clicks
    try {
        // Must call prompt() directly inside click handler
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            localStorage.setItem('pwa_installed_once', 'true');
            if (installBtn) installBtn.remove();
            if (wrapper) wrapper.style.display = 'none';
            deferredPrompt = null; // clear for safety
        } else {
            // user dismissed / cancelled
            installBtn.disabled = false;
            showHint('Installation canceled. Tap again to retry.');
            setTimeout(() => {
                showHint('If prompt doesn’t reappear, refresh to try again.');
            }, 2000);
        }
    } catch (err) {
        console.warn('Install prompt error', err);
        installBtn.disabled = false;
        showHint('Could not show install prompt. Try again later.');
    }
});

// Fired when PWA is installed
window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwa_installed_once', 'true');
    if (installBtn) installBtn.remove();
    if (wrapper) wrapper.style.display = 'none';
});

// iOS fallback: only mark installed on confirmation
function isiOS() {
    return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}
if (isiOS() && localStorage.getItem('pwa_installed_once') !== 'true') {
    if (installBtn) {
        installBtn.innerHTML = svgIcon;
        installBtn.classList.add('show');
        installBtn.addEventListener('click', () => {
            const confirmed = confirm(
                'To install: tap the share icon and select "Add to Home Screen".\n\nDid you complete that step?'
            );
            if (confirmed) {
                localStorage.setItem('pwa_installed_once', 'true');
                if (installBtn) installBtn.remove();
                if (wrapper) wrapper.style.display = 'none';
            } else {
                showHint('You can install via share menu. Tap again when ready.');
            }
        });
    }
}
