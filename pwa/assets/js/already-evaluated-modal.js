/**
 * Already Evaluated Modal Handler
 * Shows modal dialog when user clicks on teacher they already evaluated
 * Prevents form from opening for duplicate evaluations
 */

class AlreadyEvaluatedModalHandler {
    constructor() {
        this.submittedTeachers = {};
        this.modalCreated = false;
        this.loadingFromServer = true;
        
        console.log('🚀 AlreadyEvaluatedModalHandler initialized');
        
        // Load evaluated teachers from SERVER (database) to prevent false positives
        this.loadEvaluatedTeachersFromServer().then(() => {
            this.loadingFromServer = false;
            console.log('✅ Evaluated teachers loaded from server');
            this.setupClickInterception();
        }).catch((error) => {
            console.warn('⚠️ Failed to load from server, using localStorage as fallback:', error);
            this.loadingFromServer = false;
            // Fallback to localStorage if server fails
            this.submittedTeachers = this.loadSubmittedTeachersFromLocalStorage();
            this.setupClickInterception();
        });
    }

    /**
     * Load evaluated teachers from SERVER (database) - most accurate
     * This prevents false positives where localStorage has stale data
     */
    async loadEvaluatedTeachersFromServer() {
        try {
            // Get device ID
            const deviceId = this.getOrCreateDeviceId();
            
            // Get the base path from <base> tag (most reliable)
            let apiBase = '/teacher-eval';
            const baseTag = document.querySelector('base');
            if (baseTag && baseTag.href) {
                const basePath = new URL(baseTag.href).pathname;
                apiBase = basePath.replace(/\/$/, ''); // Remove trailing slash
            }
            
            // Build the URL
            const apiUrl = `${apiBase}/api/check-evaluated-teachers?device_id=${encodeURIComponent(deviceId)}`;
            
            console.log('📡 Fetching evaluated teachers from:', apiUrl);
            
            // Use original fetch (not wrapped by api-redirect)
            const fetchToUse = window.fetch.__originalFetch__ || window.fetch;
            const response = await fetchToUse(apiUrl);
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.data && Array.isArray(data.data.evaluated_teachers)) {
                // Convert array of IDs to object format for compatibility
                this.submittedTeachers = {};
                data.data.evaluated_teachers.forEach(teacherId => {
                    this.submittedTeachers[teacherId] = {
                        timestamp: new Date().toISOString(),
                        source: 'server' // Mark as from server (database)
                    };
                });
                
                console.log('📊 Evaluated teachers from DATABASE:', data.data.evaluated_teachers);
                console.log('📊 Count:', data.data.count);
                
                // Sync localStorage with server data
                this.syncLocalStorageWithServer();
            }
        } catch (error) {
            console.error('❌ Error loading from server:', error);
            throw error;
        }
    }

    /**
     * Sync localStorage with server data
     * Clears any stale entries that aren't in the database
     */
    syncLocalStorageWithServer() {
        localStorage.setItem('teacher_eval_submitted', JSON.stringify(this.submittedTeachers));
        console.log('🔄 localStorage synchronized with server data');
    }

    /**
     * Get or create device ID
     */
    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('teacher_eval_device_id');
        
        if (!deviceId) {
            deviceId = this.generateUniqueId();
            localStorage.setItem('teacher_eval_device_id', deviceId);
            console.log('📱 New device ID created:', deviceId);
        }
        
        return deviceId;
    }

    /**
     * Generate random unique ID
     */
    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `dev_${timestamp}_${random}`;
    }

    /**
     * Load list of teachers already evaluated from localStorage (FALLBACK ONLY)
     */
    loadSubmittedTeachersFromLocalStorage() {
        const stored = localStorage.getItem('teacher_eval_submitted');
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Get list of evaluated teacher IDs
     */
    getEvaluatedTeacherIds() {
        return Object.keys(this.submittedTeachers);
    }

    /**
     * Check if teacher was already evaluated
     */
    isTeacherAlreadyEvaluated(teacherId) {
        return !!this.submittedTeachers[teacherId];
    }

    /**
     * Create and inject modal CSS styles
     */
    injectModalStyles() {
        const styleId = 'already-evaluated-modal-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* Modal Overlay */
            .already-evaluated-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.3s ease-in-out;
            }

            .already-evaluated-overlay.show {
                display: flex;
            }

            /* Modal Container */
            .already-evaluated-modal {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 90%;
                padding: 32px;
                text-align: center;
                animation: slideUp 0.3s ease-out;
                position: relative;
            }

            /* Icon */
            .already-evaluated-modal-icon {
                font-size: 64px;
                margin-bottom: 16px;
                animation: bounce 0.6s ease-in-out;
            }

            /* Title */
            .already-evaluated-modal h2 {
                font-size: 24px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 12px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            /* Message */
            .already-evaluated-modal p {
                font-size: 14px;
                color: #6b7280;
                margin: 0 0 24px 0;
                line-height: 1.6;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            /* Teacher Name */
            .already-evaluated-modal-teacher {
                background: #f3f4f6;
                padding: 12px 16px;
                border-radius: 8px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 24px;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            /* Footer */
            .already-evaluated-modal-footer {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            /* Close Button */
            .already-evaluated-close-btn {
                padding: 10px 24px;
                border: 2px solid #e5e7eb;
                background: white;
                color: #1f2937;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            }

            .already-evaluated-close-btn:hover {
                background: #f9fafb;
                border-color: #d1d5db;
            }

            .already-evaluated-close-btn:active {
                transform: scale(0.98);
            }

            /* Disabled teacher styles */
            [data-teacher-id].already-evaluated-disabled,
            [data-id].already-evaluated-disabled {
                opacity: 0.6 !important;
                filter: grayscale(80%) !important;
                pointer-events: none !important;
                cursor: not-allowed !important;
            }

            /* Animations */
            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);

        console.log('✅ Already Evaluated Modal styles injected');
    }

    /**
     * Create the modal HTML structure
     */
    createModal() {
        if (this.modalCreated) return;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'already-evaluated-overlay';
        overlay.className = 'already-evaluated-overlay';

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'already-evaluated-modal';

        modal.innerHTML = `
            <div class="already-evaluated-modal-icon">✓</div>
            <h2>Tapos na!</h2>
            <p>You have already evaluated this teacher.</p>
            <div class="already-evaluated-modal-teacher" id="modal-teacher-name"></div>
            <p style="font-size: 12px; color: #9ca3af; margin-bottom: 24px;">One evaluation per teacher, per device</p>
            <div class="already-evaluated-modal-footer">
                <button class="already-evaluated-close-btn" id="modal-close-btn">OK, Got it</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Close button handler
        document.getElementById('modal-close-btn').addEventListener('click', () => {
            this.hideModal();
        });

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideModal();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('show')) {
                this.hideModal();
            }
        });

        this.modalCreated = true;
        console.log('✅ Already Evaluated Modal created');
    }

    /**
     * Show modal with teacher info
     */
    showModal(teacherName) {
        this.createModal();

        const overlay = document.getElementById('already-evaluated-overlay');
        const teacherElement = document.getElementById('modal-teacher-name');

        if (teacherElement) {
            teacherElement.textContent = teacherName || 'This Teacher';
        }

        overlay.classList.add('show');
        console.log('📢 Showing "Already Evaluated" modal for:', teacherName);
    }

    /**
     * Hide modal
     */
    hideModal() {
        const overlay = document.getElementById('already-evaluated-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            console.log('🚫 Hiding "Already Evaluated" modal');
        }
    }

    /**
     * Set up click interception on teacher elements
     */
    setupClickInterception() {
        // Inject styles first
        this.injectModalStyles();

        console.log('🔍 Setting up EXTREME click interception...');
        console.log('📊 Currently evaluated teachers:', Object.keys(this.submittedTeachers));

        // Store reference for access in handlers
        const self = this;

        // ============================================================
        // METHOD 1: CAPTURE PHASE - Intercept at earliest possible point
        // ============================================================
        document.addEventListener('click', function(e) {
            const teacherInfo = self.findTeacherInClickEvent(e);
            
            if (teacherInfo && teacherInfo.teacherId && self.isTeacherAlreadyEvaluated(teacherInfo.teacherId)) {
                console.log('🚫 METHOD 1 (CAPTURE) - BLOCKING CLICK:', teacherInfo);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                self.showModal(teacherInfo.teacherName);
                return false;
            }
        }, true); // CAPTURE phase

        // ============================================================
        // METHOD 2: BUBBLE PHASE - Secondary catch for events that escape capture
        // ============================================================
        document.addEventListener('click', function(e) {
            const teacherInfo = self.findTeacherInClickEvent(e);
            
            if (teacherInfo && teacherInfo.teacherId && self.isTeacherAlreadyEvaluated(teacherInfo.teacherId)) {
                console.log('🚫 METHOD 2 (BUBBLE) - BLOCKING CLICK:', teacherInfo);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                self.showModal(teacherInfo.teacherName);
                return false;
            }
        }, false); // BUBBLE phase

        // ============================================================
        // METHOD 3: POINTER EVENTS - Disable clicking on evaluated teachers entirely
        // ============================================================
        this.disableEvaluatedTeachersPointerEvents();

        // ============================================================
        // METHOD 4: GLOBAL MOUSEDOWN - Catch before click event
        // ============================================================
        document.addEventListener('mousedown', function(e) {
            const teacherInfo = self.findTeacherInClickEvent(e);
            
            if (teacherInfo && teacherInfo.teacherId && self.isTeacherAlreadyEvaluated(teacherInfo.teacherId)) {
                console.log('🚫 METHOD 4 (MOUSEDOWN) - BLOCKING:', teacherInfo);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }
        }, true);

        // ============================================================
        // METHOD 5: Flutter-specific - Watch for teacher card interactions
        // ============================================================
        if (window.flutter_inappwebview) {
            console.log('📱 Flutter detected - setting up Flutter-specific interception');
            // Override any Flutter navigation handlers
            window.blockFlutterNavigation = function(teacherId) {
                if (self.isTeacherAlreadyEvaluated(teacherId)) {
                    return true; // Block navigation
                }
                return false;
            };
        }

        console.log('✅ EXTREME click interception set up with 5 methods!');
    }

    /**
     * Find teacher info from click event (helper method)
     */
    findTeacherInClickEvent(e) {
        const target = e.target;
        let teacherElement = null;
        let teacherId = null;
        let teacherName = null;

        // Try to find teacher element using closest()
        teacherElement = target.closest('[data-teacher-id], [data-id], .teacher-card, .teacher-item, [data-teacher-name]');
        
        // Fallback: Walk up DOM tree
        if (!teacherElement) {
            let parent = target;
            let depth = 0;
            while (parent && depth < 10) {
                const dTeacherId = parent.getAttribute?.('data-teacher-id');
                const dId = parent.getAttribute?.('data-id');
                const dataTeacherName = parent.getAttribute?.('data-teacher-name');
                
                if (dTeacherId || dId || dataTeacherName) {
                    teacherElement = parent;
                    teacherId = dTeacherId || dId || dataTeacherName;
                    break;
                }
                parent = parent.parentElement;
                depth++;
            }
        }

        if (teacherElement) {
            // Extract teacher ID
            teacherId = teacherElement.getAttribute('data-teacher-id') || 
                       teacherElement.getAttribute('data-id') ||
                       teacherElement.id;
            
            // Extract teacher name
            teacherName = teacherElement.getAttribute('data-teacher-name') ||
                         teacherElement.textContent?.split('\n')[0]?.trim() ||
                         'This Teacher';

            return {
                teacherId: teacherId,
                teacherName: teacherName,
                element: teacherElement
            };
        }

        return null;
    }

    /**
     * Disable pointer events on already-evaluated teachers
     */
    disableEvaluatedTeachersPointerEvents() {
        const self = this;

        // Apply pointer-events immediately (don't wait for mutations)
        const applyPointerEventLock = () => {
            this.getEvaluatedTeacherIds().forEach(teacherId => {
                const elements = document.querySelectorAll(
                    `[data-teacher-id="${teacherId}"], [data-id="${teacherId}"]`
                );
                
                elements.forEach(el => {
                    // FORCE pointer-events: none with !important
                    el.style.setProperty('pointer-events', 'none', 'important');
                    el.style.setProperty('opacity', '0.6', 'important');
                    el.style.setProperty('cursor', 'not-allowed', 'important');
                    el.style.setProperty('user-select', 'none', 'important');
                    
                    el.classList.add('already-evaluated-disabled');
                    
                    // ALSO disable ALL children
                    const children = el.querySelectorAll('*');
                    children.forEach(child => {
                        child.style.setProperty('pointer-events', 'none', 'important');
                    });
                    
                    console.log('🔒 Locked teacher element:', {
                        teacherId: teacherId,
                        elementTag: el.tagName,
                        pointerEvents: el.style.pointerEvents
                    });
                });
            });
        };

        // Apply immediately
        applyPointerEventLock();

        // Watch for DOM changes and reapply
        const pointerEventObserver = new MutationObserver(() => {
            // Re-apply locks in case new teacher elements appeared
            applyPointerEventLock();
        });

        pointerEventObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also add a periodic check to ensure locks stay applied
        setInterval(() => {
            applyPointerEventLock();
        }, 500);

        console.log('🔒 Pointer events permanently disabled with 500ms refresh');
    }

    /**
     * Update when new teacher is evaluated
     */
    updateSubmittedTeachers() {
        this.submittedTeachers = this.loadSubmittedTeachers();
        console.log('🔄 Updated submitted teachers list:', Object.keys(this.submittedTeachers));
        
        // Re-apply pointer events to newly evaluated teachers
        this.disableEvaluatedTeachersPointerEvents();
    }
}

/**
 * Intercept evaluation form submission
 * Prevents submission if teacher already evaluated
 */
function setupFormSubmissionInterception() {
    // Store the current fetch (might already be wrapped by api-redirect)
    const nextFetch = window.fetch;
    
    window.fetch = function(...args) {
        const [resource, config] = args;
        const url = typeof resource === 'string' ? resource : resource.url;
        
        // Check if this is an evaluation submission
        if (url && url.includes('/api/evaluations') && config && config.method === 'POST') {
            let teacherId = null;
            
            // Try to extract teacher ID from request body
            try {
                let body = config.body;
                
                // Handle FormData
                if (body instanceof FormData) {
                    teacherId = body.get('teacher_id') || body.get('teacherId');
                } 
                // Handle JSON string
                else if (typeof body === 'string') {
                    try {
                        const data = JSON.parse(body);
                        teacherId = data.teacher_id || data.teacherId || data.id;
                    } catch (e) {
                        // Not JSON, might be form encoded
                    }
                }
                
                console.log('📊 Evaluation submission detected:', {
                    url: url,
                    teacherId: teacherId,
                    bodyType: body ? body.constructor.name : 'none'
                });
            } catch (e) {
                console.error('Error parsing submission body:', e);
            }
            
            // Check if already evaluated
            if (teacherId && window.alreadyEvaluatedModal && 
                window.alreadyEvaluatedModal.isTeacherAlreadyEvaluated(teacherId)) {
                
                console.log('🚫 BLOCKING evaluation submission - teacher already evaluated:', teacherId);
                
                // Get teacher name from DOM or localStorage
                const evaluatedData = window.alreadyEvaluatedModal.submittedTeachers[teacherId];
                const storedName = evaluatedData ? evaluatedData.name : null;
                const teacherName = storedName || 'This Teacher';
                
                // Show modal
                window.alreadyEvaluatedModal.showModal(teacherName);
                
                // Return rejected promise with detailed error
                return Promise.reject({
                    status: 400,
                    message: 'You have already evaluated this teacher',
                    code: 'duplicate_teacher',
                    teacherId: teacherId
                });
            }
        }
        
        // Call next fetch (might be wrapped by api-redirect)
        return nextFetch.apply(this, args);
    };
    
    console.log('✅ Form submission interception set up');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModal);
} else {
    initializeModal();
}

function initializeModal() {
    if (!window.alreadyEvaluatedModal) {
        window.alreadyEvaluatedModal = new AlreadyEvaluatedModalHandler();
    }
    setupFormSubmissionInterception();
    
    // Setup debug console
    setupDebugConsole();
    
    // Add debug function to window
    window.debugAlreadyEvaluated = function() {
        console.log('=== ALREADY EVALUATED DEBUG ===');
        console.log('Submitted teachers:', window.alreadyEvaluatedModal.submittedTeachers);
        console.log('Modal exists:', !!window.alreadyEvaluatedModal);
        console.log('localStorage teacher_eval_submitted:', localStorage.getItem('teacher_eval_submitted'));
        console.log('Teacher elements with data-teacher-id:', document.querySelectorAll('[data-teacher-id]').length);
        console.log('Teacher elements with data-id:', document.querySelectorAll('[data-id]').length);
        console.log('All teacher elements:', {
            '.teacher-card': document.querySelectorAll('.teacher-card').length,
            '.teacher-item': document.querySelectorAll('.teacher-item').length
        });
        console.log('First few elements:', Array.from(document.querySelectorAll('[data-teacher-id], [data-id]')).slice(0, 3).map(el => ({
            tag: el.tagName,
            id: el.getAttribute('data-teacher-id') || el.getAttribute('data-id'),
            text: el.textContent.substring(0, 30)
        })));
    };
}

/**
 * Setup floating debug console
 */
function setupDebugConsole() {
    // Don't setup twice
    if (document.getElementById('debug-modal-console')) return;
    
    const debugStyle = document.createElement('style');
    debugStyle.textContent = `
        #debug-modal-console {
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 350px;
            max-height: 250px;
            background: #1a1a1a;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            font-family: monospace;
            font-size: 11px;
            color: #4CAF50;
            overflow-y: auto;
            z-index: 99998;
            padding: 10px;
            box-shadow: 0 0 15px rgba(76, 175, 80, 0.5);
        }
        
        .debug-line {
            margin: 2px 0;
            word-break: break-all;
            white-space: pre-wrap;
        }
        
        .debug-line.error { color: #FF5252; }
        .debug-line.warn { color: #FFC107; }
        .debug-line.success { color: #4CAF50; }
        .debug-line.info { color: #2196F3; }
        
        #debug-modal-btn {
            position: fixed;
            bottom: 10px;
            right: 370px;
            padding: 10px 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
            z-index: 99998;
            font-size: 12px;
        }
        
        #debug-modal-btn:hover {
            background: #45a049;
        }
        
        #debug-modal-clear {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #666;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        }
    `;
    document.head.appendChild(debugStyle);
    
    const debugConsole = document.createElement('div');
    debugConsole.id = 'debug-modal-console';
    
    const clearBtn = document.createElement('button');
    clearBtn.id = 'debug-modal-clear';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
        debugConsole.innerHTML = '<button id="debug-modal-clear">Clear</button><div class="debug-line success">🟢 Console cleared</div>';
    });
    
    debugConsole.appendChild(clearBtn);
    const line = document.createElement('div');
    line.className = 'debug-line success';
    line.textContent = '🟢 Modal Debug Console Ready - Click Debug button or type: debugAlreadyEvaluated()';
    debugConsole.appendChild(line);
    document.body.appendChild(debugConsole);
    
    const btn = document.createElement('button');
    btn.id = 'debug-modal-btn';
    btn.textContent = '🔍 Debug Modal';
    btn.addEventListener('click', () => {
        const modal = window.alreadyEvaluatedModal;
        if (!modal) {
            addDebugLine('❌ Modal not initialized', 'error');
            return;
        }
        const msg = `✅ Modal Status:
📋 Evaluated: ${JSON.stringify(modal.getEvaluatedTeacherIds())}
📊 Count: ${modal.getEvaluatedTeacherIds().length}
💾 Loading: ${modal.loadingFromServer ? 'Yes' : 'No'}
🏪 Source: ${Object.values(modal.submittedTeachers)[0]?.source || 'unknown'}`;
        addDebugLine(msg, 'info');
    });
    document.body.appendChild(btn);
    
    // Override console.log to capture important messages
    const originalLog = console.log;
    console.log = function(...args) {
        originalLog.apply(console, args);
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
        if (msg.includes('🚫') || msg.includes('BLOCKING')) {
            addDebugLine(msg, 'error');
        } else if (msg.includes('✅') || msg.includes('METHOD')) {
            addDebugLine(msg, 'success');
        } else if (msg.includes('⚠️') || msg.includes('Failed')) {
            addDebugLine(msg, 'warn');
        }
    };
    
    window.addDebugLine = addDebugLine;
}

function addDebugLine(msg, type = 'info') {
    const console = document.getElementById('debug-modal-console');
    if (!console) return;
    
    const line = document.createElement('div');
    line.className = `debug-line ${type}`;
    line.textContent = msg;
    
    // Find the clear button and insert after it
    const clearBtn = console.querySelector('#debug-modal-clear');
    if (clearBtn) {
        clearBtn.parentNode.insertBefore(line, clearBtn.nextSibling);
    } else {
        console.appendChild(line);
    }
    
    console.scrollTop = console.scrollHeight;
    
    // Keep only last 30 lines
    const lines = console.querySelectorAll('.debug-line');
    while (lines.length > 30) {
        lines[0].remove();
        console.querySelectorAll('.debug-line')[0].remove();
    }
}

