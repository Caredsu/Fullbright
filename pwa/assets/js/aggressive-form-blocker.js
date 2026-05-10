/**
 * AGGRESSIVE Form Display Blocker (PWA Version)
 * Detects ANY evaluation form being displayed and hides it if teacher already evaluated
 * Works AUTOMATICALLY without relying on Flutter calling any methods
 */

class AggressiveFormBlocker {
    constructor() {
        this.blockerActive = false;
        this.blockedForms = new Set();
        console.log('🔴 AGGRESSIVE FORM BLOCKER - Starting up');
        this.waitForDependencies();
    }

    async waitForDependencies() {
        let attempts = 0;
        while (!window.alreadyEvaluatedModal && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.alreadyEvaluatedModal) {
            console.log('✅ Dependencies ready, starting blocking');
            this.activateBlocking();
        } else {
            console.warn('⚠️ Modal not ready, activating anyway');
            this.activateBlocking();
        }
    }

    activateBlocking() {
        this.blockerActive = true;
        this.setupPeriodicScan();
        console.log('🔴 AGGRESSIVE FORM BLOCKER ACTIVATED');
    }

    setupPeriodicScan() {
        const self = this;
        
        setInterval(() => {
            if (!self.blockerActive) return;
            
            document.querySelectorAll('[class*="form"], [class*="evaluation"], [class*="question"], [class*="rating"], [class*="feedback"]').forEach(el => {
                self.checkAndBlockForm(el);
            });

            document.querySelectorAll('[id*="form"], [id*="evaluation"], [id*="question"], [id*="rating"]').forEach(el => {
                self.checkAndBlockForm(el);
            });

            document.querySelectorAll('[data-teacher-id]').forEach(el => {
                self.checkAndBlockForm(el);
            });
        }, 100);

        console.log('✅ Periodic form scan active');
    }

    checkAndBlockForm(element) {
        if (!element || !this.blockerActive) return;
        
        const formId = element.getAttribute('id') || element.className;
        if (this.blockedForms.has(formId)) return;
        
        const teacherId = this.extractTeacherIdFromElement(element);
        if (!teacherId) return;
        
        if (!window.alreadyEvaluatedModal) return;
        
        const evaluatedTeachers = window.alreadyEvaluatedModal.submittedTeachers || {};
        
        if (evaluatedTeachers[teacherId]) {
            console.log('🚫 BLOCKING FORM - Teacher already evaluated:', teacherId);
            
            this.blockedForms.add(formId);
            
            element.style.display = 'none';
            element.style.visibility = 'hidden';
            element.style.opacity = '0';
            element.style.height = '0';
            element.style.overflow = 'hidden';
            
            element.innerHTML = '';
            
            const teacherName = element.getAttribute('data-teacher-name') || 'Teacher';
            
            if (window.alreadyEvaluatedModal) {
                window.alreadyEvaluatedModal.showModal(teacherName);
            }
            
            return true;
        }
        
        return false;
    }

    extractTeacherIdFromElement(element) {
        let teacherId = element.getAttribute('data-teacher-id') ||
                       element.getAttribute('data-id') ||
                       element.getAttribute('data-teacherId');

        if (teacherId) return teacherId;

        const descendants = element.querySelectorAll('[data-teacher-id], [data-id], [data-teacherId]');
        for (let desc of descendants) {
            teacherId = desc.getAttribute('data-teacher-id') ||
                       desc.getAttribute('data-id') ||
                       desc.getAttribute('data-teacherId');
            if (teacherId) return teacherId;
        }

        return null;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.aggressiveFormBlocker) {
            window.aggressiveFormBlocker = new AggressiveFormBlocker();
        }
    });
} else {
    if (!window.aggressiveFormBlocker) {
        window.aggressiveFormBlocker = new AggressiveFormBlocker();
    }
}

console.log('✅ Aggressive Form Blocker loaded');
    constructor() {
        this.blockerActive = false;
        this.blockedForms = new Set();
        
        console.log('🔴 AGGRESSIVE FORM BLOCKER - Starting up');
        
        // Wait for modal handler
        this.waitForDependencies();
    }

    async waitForDependencies() {
        let attempts = 0;
        while (!window.alreadyEvaluatedModal && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.alreadyEvaluatedModal) {
            console.log('✅ Dependencies ready, starting aggressive blocking');
            this.activateBlocking();
        } else {
            console.warn('⚠️ Modal not ready, but blocker still active');
            this.activateBlocking();
        }
    }

    activateBlocking() {
        this.blockerActive = true;
        
        // Method 1: DOM Observer - detect when form elements are added
        this.setupDOMObserver();
        
        // Method 2: Periodic scan - check for existing forms every 100ms
        this.setupPeriodicScan();
        
        // Method 3: Intercept form display through style mutations
        this.setupStyleInterception();
        
        console.log('🔴 AGGRESSIVE FORM BLOCKER ACTIVATED - 3 blocking methods active');
    }

    /**
     * METHOD 1: Watch for new DOM elements (forms) being added
     */
    setupDOMObserver() {
        const self = this;
        
        const formBlockerObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if it's a form or contains form elements
                            const formElements = [
                                'FORM',
                                'DIV', // Could be a form container
                                'SECTION'
                            ];
                            
                            if (formElements.includes(node.tagName)) {
                                self.checkAndBlockForm(node);
                            }
                        }
                    });
                }
            });
        });

        formBlockerObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('✅ DOM Observer active');
    }

    /**
     * METHOD 2: Periodically scan for forms that match evaluation patterns
     */
    setupPeriodicScan() {
        const self = this;
        
        setInterval(() => {
            if (!this.blockerActive) return;
            
            // Look for common form indicators
            const formIndicators = [
                'form',
                'evaluation',
                'questions',
                'feedback',
                'rating',
                'stars',
                'submit-evaluation',
                'teacher-form'
            ];

            // Scan by class name
            document.querySelectorAll('[class*="form"], [class*="evaluation"], [class*="question"], [class*="rating"]').forEach(el => {
                self.checkAndBlockForm(el);
            });

            // Scan by ID
            document.querySelectorAll('[id*="form"], [id*="evaluation"], [id*="question"], [id*="rating"]').forEach(el => {
                self.checkAndBlockForm(el);
            });

            // Scan for visible elements with evaluation data
            document.querySelectorAll('[data-teacher-id], [data-teacher-name]').forEach(el => {
                self.checkAndBlockForm(el);
            });
        }, 100);

        console.log('✅ Periodic form scan active (100ms interval)');
    }

    /**
     * METHOD 3: Intercept style changes that might show forms
     */
    setupStyleInterception() {
        const self = this;
        
        // Override display property setter
        const originalSetProperty = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'setProperty');
        if (originalSetProperty && originalSetProperty.value) {
            const originalMethod = originalSetProperty.value;
            
            Object.defineProperty(CSSStyleDeclaration.prototype, 'setProperty', {
                value: function(prop, val, priority) {
                    // If someone is trying to show something, check if it's a form
                    if ((prop === 'display' && val !== 'none') || 
                        (prop === 'visibility' && val !== 'hidden') ||
                        (prop === 'opacity' && val !== '0')) {
                        
                        // Check the element this is being called on
                        if (this._owner && self.isFormElement(this._owner)) {
                            self.checkAndBlockForm(this._owner);
                        }
                    }
                    return originalMethod.call(this, prop, val, priority);
                }
            });
        }

        console.log('✅ Style interception active');
    }

    /**
     * Check if a form should be blocked and block it
     */
    checkAndBlockForm(element) {
        if (!element || !this.blockerActive) return;
        
        // Skip if already blocked
        const formId = element.getAttribute('id') || element.className;
        if (this.blockedForms.has(formId)) return;
        
        // Get teacher ID from element
        const teacherId = this.extractTeacherIdFromElement(element);
        
        if (!teacherId) return;
        
        // Check if teacher already evaluated
        if (!window.alreadyEvaluatedModal) return;
        
        const evaluatedTeachers = window.alreadyEvaluatedModal.submittedTeachers || {};
        
        if (evaluatedTeachers[teacherId]) {
            console.log('🚫 BLOCKING FORM - Teacher already evaluated:', teacherId);
            
            // Mark as blocked
            this.blockedForms.add(formId);
            
            // Hide the form
            element.style.display = 'none !important';
            element.style.visibility = 'hidden !important';
            element.style.opacity = '0 !important';
            element.style.height = '0 !important';
            element.style.maxHeight = '0 !important';
            element.style.overflow = 'hidden !important';
            
            // Remove all children to prevent any interaction
            element.innerHTML = '';
            
            // Get teacher name
            const teacherName = element.getAttribute('data-teacher-name') || 
                               element.textContent?.split('\n')[0] || 
                               `Teacher ${teacherId}`;
            
            // Show modal
            if (window.alreadyEvaluatedModal) {
                window.alreadyEvaluatedModal.showModal(teacherName);
                console.log('📢 Modal shown for:', teacherName);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Extract teacher ID from element
     */
    extractTeacherIdFromElement(element) {
        // Check attributes
        let teacherId = element.getAttribute?.('data-teacher-id') ||
                       element.getAttribute?.('data-id') ||
                       element.getAttribute?.('data-teacherId');

        if (teacherId) return teacherId;

        // Check in descendants
        const descendants = element.querySelectorAll?.('[data-teacher-id], [data-id], [data-teacherId]') || [];
        for (let desc of descendants) {
            teacherId = desc.getAttribute('data-teacher-id') ||
                       desc.getAttribute('data-id') ||
                       desc.getAttribute('data-teacherId');
            if (teacherId) return teacherId;
        }

        return null;
    }

    /**
     * Check if element is a form element
     */
    isFormElement(element) {
        if (!element) return false;
        
        const tag = element.tagName?.toLowerCase();
        const className = element.className?.toString().toLowerCase() || '';
        const id = element.id?.toString().toLowerCase() || '';

        const formIndicators = ['form', 'evaluation', 'questions', 'feedback', 'rating', 'survey'];
        
        return formIndicators.some(indicator => 
            tag?.includes(indicator) || 
            className.includes(indicator) || 
            id.includes(indicator)
        );
    }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.aggressiveFormBlocker) {
            console.log('🔴 Initializing Aggressive Form Blocker');
            window.aggressiveFormBlocker = new AggressiveFormBlocker();
        }
    });
} else {
    if (!window.aggressiveFormBlocker) {
        console.log('🔴 Initializing Aggressive Form Blocker');
        window.aggressiveFormBlocker = new AggressiveFormBlocker();
    }
}

console.log('✅ Aggressive Form Blocker module loaded and ready');
