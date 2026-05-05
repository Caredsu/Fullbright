// Fix asset paths for Flutter web app - dynamically detect base path
(function() {
    // Use the path detected in index.html, or detect it here as fallback
    function getBasePath() {
        if (window.PWA_BASE_PATH) {
            return window.PWA_BASE_PATH;
        }
        
        // Get the current pathname
        const pathname = window.location.pathname;
        
        // If we're in /pwa/, the base path is the part before /pwa/
        const pwaIndex = pathname.indexOf('/pwa/');
        if (pwaIndex !== -1) {
            return pathname.substring(0, pwaIndex + 5); // Include '/pwa/'
        }
        
        // Fallback to hardcoded paths for known deployment scenarios
        if (pathname.includes('/teacher-eval/')) {
            return '/teacher-eval/pwa/';
        }
        
        // Default fallback
        return '/pwa/';
    }
    
    const BASE_PATH = getBasePath();
    console.log('[AssetFix] Using BASE_PATH:', BASE_PATH);
    window.ASSET_BASE_PATH = BASE_PATH; // Export for other scripts
    
    // Override fetch to fix asset paths
    const originalFetch = window.fetch;
    window.fetch = function(resource, config) {
        let url = resource;
        if (typeof resource === 'string') {
            // If it's trying to load assets, make sure they have the full path
            if (resource.startsWith('assets/')) {
                url = BASE_PATH + resource;
                console.log('[AssetFix] Fetch:', resource, '→', url);
            }
        }
        return originalFetch(url, config);
    };

    // Also fix XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        let fixedUrl = url;
        if (typeof url === 'string' && url.startsWith('assets/')) {
            fixedUrl = BASE_PATH + url;
            console.log('[AssetFix] XHR:', url, '→', fixedUrl);
        }
        return originalOpen.call(this, method, fixedUrl);
    };
    
    // Override Image loading
    const OriginalImage = Image;
    const ImageProxy = function() {
        const img = new OriginalImage();
        const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set;
        
        Object.defineProperty(img, 'src', {
            get() {
                return img._src || '';
            },
            set(value) {
                if (typeof value === 'string' && value.startsWith('assets/')) {
                    const newValue = BASE_PATH + value;
                    console.log('[AssetFix] Image src:', value, '→', newValue);
                    originalSrcSetter.call(img, newValue);
                    img._src = newValue;
                } else {
                    originalSrcSetter.call(img, value);
                    img._src = value;
                }
            }
        });
        return img;
    };
    ImageProxy.prototype = Image.prototype;
    window.Image = ImageProxy;
    
    console.log('[AssetFix] Initialized with BASE_PATH:', BASE_PATH);
})();
