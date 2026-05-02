/**
 * Cache Buster - Force browser cache clearing and service worker refresh
 * Include this in the dashboard to ensure users get fresh versions
 */

console.log('🔧 Starting cache buster...');

// Clear all caches
if ('caches' in window) {
    caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
            caches.delete(cacheName).then(() => {
                console.log('✅ Cleared cache:', cacheName);
            });
        });
    });
}

// Force service worker unregistration and re-registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
            registration.unregister().then(() => {
                console.log('✅ Unregistered service worker');
            });
        });
        
        // Re-register with cache buster
        const swUrl = '/teacher-eval/pwa/service-worker.js?v=' + Date.now();
        navigator.serviceWorker.register(swUrl).then((reg) => {
            console.log('✅ Re-registered service worker:', swUrl);
            
            // Force update check
            reg.update().then(() => {
                console.log('✅ Checked for service worker updates');
            });
        }).catch((error) => {
            console.error('❌ Service worker registration failed:', error);
        });
    });
}

// Clear localStorage if it has old API endpoints
if (localStorage.getItem('api-cache')) {
    localStorage.removeItem('api-cache');
    console.log('✅ Cleared localStorage API cache');
}

console.log('✅ Cache buster complete!');
