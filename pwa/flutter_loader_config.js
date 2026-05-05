// Configure Flutter to work from /teacher-eval/pwa/ subdirectory
window._flutter = window._flutter || {};
window._flutter.loader = window._flutter.loader || {};

// Store the original load function
const _originalLoad = window._flutter.loader.load ? window._flutter.loader.load.bind(window._flutter.loader) : null;

// Intercept the load call to fix paths
window._flutter.loader.load = function(opts) {
    opts = opts || {};
    opts.config = opts.config || {};
    
    // Force entrypointBaseUrl to be /teacher-eval/pwa/
    opts.config.entrypointBaseUrl = '/teacher-eval/pwa/';
    
    console.log('Flutter loader configured with entrypointBaseUrl:', opts.config.entrypointBaseUrl);
    
    if (_originalLoad) {
        return _originalLoad(opts);
    }
};

// Also set buildConfig if needed
window._flutter.buildConfig = {
    "engineRevision": "425cfb54d01a9472b3e81d9e76fd63a4a44cfbcb",
    "builds": [{
        "compileTarget": "dart2js",
        "renderer": "canvaskit",
        "mainJsPath": "main.dart.js"
    }]
};
