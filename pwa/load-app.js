// Set up Flutter config BEFORE loading flutter_bootstrap.js
window._flutter = window._flutter || {};
window._flutter.loader = window._flutter.loader || {};

// Override loader.load to inject the correct entrypointBaseUrl
const originalLoad = window._flutter.loader.load;
window._flutter.loader.load = function(config) {
    config = config || {};
    config.config = config.config || {};
    
    // Set the correct base URL for PWA files
    config.config.entrypointBaseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'pwa/';
    
    console.log('Flutter loading with entrypointBaseUrl:', config.config.entrypointBaseUrl);
    
    // Call the original load with updated config
    if (typeof originalLoad === 'function') {
        return originalLoad.call(window._flutter.loader, config);
    }
};

// Now load flutter_bootstrap.js
const script = document.createElement('script');
script.src = 'flutter_bootstrap.js?v=' + Date.now();
script.async = true;
document.head.appendChild(script);
