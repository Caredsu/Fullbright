/**
 * API Redirect Fix + Teacher Filtering
 * 1. Intercepts hardcoded IP-based API calls and redirects to relative paths
 * 2. Filters out already-evaluated teachers from the teachers list
 * Must be loaded BEFORE Flutter app initializes
 */

/**
 * API Redirect Fix + Teacher Filtering
 * 1. Intercepts ANY IP-based API calls and redirects to relative paths
 * 2. Filters out already-evaluated teachers from the teachers list
 * Works on ANY IP/hostname (localhost, 127.0.0.1, any LAN IP, production domain)
 * Must be loaded BEFORE Flutter app initializes
 */

(function() {
    // Get the base path from <base> tag (most reliable)
    let API_BASE = '/teacher-eval';
    const baseTag = document.querySelector('base');
    if (baseTag && baseTag.href) {
        const basePath = new URL(baseTag.href).pathname;
        API_BASE = basePath.replace(/\/$/, ''); // Remove trailing slash
    }
    
    console.log('🌐 API Redirect initialized:', {
        currentHost: window.location.hostname,
        protocol: window.location.protocol,
        pathname: window.location.pathname,
        apiBase: API_BASE,
        baseTag: baseTag ? baseTag.href : 'not found'
    });
    
    // Store original fetch
    const originalFetch = window.fetch;
    window.fetch.__originalFetch__ = originalFetch; // Save for other scripts to use
    
    /**
     * Get evaluated teacher IDs from window.alreadyEvaluatedModal (already loaded from server)
     * Falls back to localStorage if modal not available
     */
    function getEvaluatedTeacherIds() {
        try {
            // Prefer data from modal handler (loaded from server)
            if (window.alreadyEvaluatedModal && window.alreadyEvaluatedModal.submittedTeachers) {
                return Object.keys(window.alreadyEvaluatedModal.submittedTeachers);
            }
            
            // Fallback to localStorage
            const submitted = localStorage.getItem('teacher_eval_submitted');
            if (!submitted) return [];
            
            const data = JSON.parse(submitted);
            return Object.keys(data);
        } catch (e) {
            console.error('Error reading evaluated teachers:', e);
            return [];
        }
    }
    
    /**
     * Add evaluated teacher IDs to teacher requests
     */
    function addTeacherFilter(url) {
        // Only filter teachers API calls (not specific teacher by ID)
        if (!url.includes('/api/teachers') || url.includes('/teachers/')) {
            return url;
        }
        
        const evaluatedIds = getEvaluatedTeacherIds();
        if (evaluatedIds.length === 0) return url;
        
        const separator = url.includes('?') ? '&' : '?';
        const filterParam = `evaluated_ids=${evaluatedIds.join(',')}`;
        const newUrl = url + separator + filterParam;
        
        console.log('📚 Teacher Status Filter Applied:', {
            evaluatedCount: evaluatedIds.length,
            teachers: evaluatedIds
        });
        
        return newUrl;
    }
    
    /**
     * Check if a hostname is a development/local IP address
     */
    function isDevIP(hostname) {
        const devIpPatterns = [
            'localhost',
            '127.0.0.1',
            /^192\.168\./,      // Private network 192.168.x.x
            /^10\./,             // Private network 10.x.x.x
            /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private network 172.16-31.x.x
            /^169\.254\./        // Link-local 169.254.x.x
        ];
        
        return devIpPatterns.some(pattern => {
            if (typeof pattern === 'string') {
                return hostname === pattern;
            }
            return pattern.test(hostname);
        });
    }
    
    // Override fetch globally
    window.fetch = function(resource, config) {
        let url = typeof resource === 'string' ? resource : resource.url;
        
        // Check if URL is an absolute URL (ANY host, any port)
        const absUrlMatch = url.match(/^https?:\/\/([^\/]+)(\/[^?]*)(.*)$/i);
        
        if (absUrlMatch) {
            const requestedHost = absUrlMatch[1].split(':')[0]; // Remove port if present
            const fullPath = absUrlMatch[2] + (absUrlMatch[3] || '');
            
            // Check if this is a dev IP and the path includes API calls
            if (isDevIP(requestedHost) && fullPath.includes('/api/')) {
                // Extract the API path (could be /api/... or /teacher-eval/api/...)
                const apiPathMatch = fullPath.match(/(.*(\/teacher-eval)?\/api\/.*)$/);
                if (apiPathMatch) {
                    const apiPath = apiPathMatch[1];
                    let newUrl = API_BASE + apiPath;
                    
                    // Add teacher filter if applicable
                    newUrl = addTeacherFilter(newUrl);
                    
                    console.log('🔄 API Redirect (dev IP → relative):', {
                        from: url,
                        to: newUrl,
                        detectedHost: requestedHost,
                        isDevIP: true
                    });
                    
                    // Replace the URL
                    if (typeof resource === 'string') {
                        return originalFetch.call(window, newUrl, config);
                    } else {
                        resource.url = newUrl;
                        return originalFetch.call(window, resource, config);
                    }
                }
            }
            
            // Even for non-dev IPs, if trying to reach /api/, redirect to relative path
            // This handles the case where the app was built pointing to wrong domain
            if (fullPath.includes('/api/') && requestedHost !== window.location.hostname) {
                const apiPathMatch = fullPath.match(/(.*(\/teacher-eval)?\/api\/.*)$/);
                if (apiPathMatch) {
                    const apiPath = apiPathMatch[1];
                    let newUrl = API_BASE + apiPath;
                    newUrl = addTeacherFilter(newUrl);
                    
                    console.log('🔄 API Redirect (cross-origin → relative):', {
                        from: url,
                        to: newUrl,
                        fromHost: requestedHost,
                        currentHost: window.location.hostname
                    });
                    
                    if (typeof resource === 'string') {
                        return originalFetch.call(window, newUrl, config);
                    } else {
                        resource.url = newUrl;
                        return originalFetch.call(window, resource, config);
                    }
                }
            }
        }
        
        // No IP redirect needed - but still apply teacher filter if applicable
        if (typeof resource === 'string') {
            const filteredUrl = addTeacherFilter(url);
            if (filteredUrl !== url) {
                return originalFetch.call(window, filteredUrl, config);
            }
        }
        
        // No changes needed
        return originalFetch.call(window, resource, config);
    };
    
    // Copy over any properties from original fetch
    Object.setPrototypeOf(window.fetch, originalFetch);
    
    /**
     * Also intercept XMLHttpRequest for compatibility
     */
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        let finalUrl = url;
        
        if (typeof url === 'string') {
            const absUrlMatch = url.match(/^https?:\/\/([^\/]+)(\/[^?]*)(.*)$/i);
            
            if (absUrlMatch) {
                const requestedHost = absUrlMatch[1].split(':')[0];
                const fullPath = absUrlMatch[2] + (absUrlMatch[3] || '');
                
                // Check if this is a dev IP and includes API calls
                if (isDevIP(requestedHost) && fullPath.includes('/api/')) {
                    const apiPathMatch = fullPath.match(/(.*(\/teacher-eval)?\/api\/.*)$/);
                    if (apiPathMatch) {
                        finalUrl = API_BASE + apiPathMatch[1];
                        console.log('🔄 XMLHttpRequest Redirect (dev IP):', {
                            from: url,
                            to: finalUrl,
                            method: method
                        });
                    }
                } else if (fullPath.includes('/api/') && requestedHost !== window.location.hostname) {
                    // Cross-origin API call
                    const apiPathMatch = fullPath.match(/(.*(\/teacher-eval)?\/api\/.*)$/);
                    if (apiPathMatch) {
                        finalUrl = API_BASE + apiPathMatch[1];
                        console.log('🔄 XMLHttpRequest Redirect (cross-origin):', {
                            from: url,
                            to: finalUrl,
                            method: method
                        });
                    }
                }
            }
        }
        
        return originalXHROpen.call(this, method, finalUrl, ...args);
    };
    
    console.log('✅ API Redirect + Teacher Filter initialized. Base path:', API_BASE);
})();
