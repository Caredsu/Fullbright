/**
 * Teacher Evaluation UI Handler
 * Disables and grays out teachers that have already been evaluated
 */

class TeacherEvaluationUIHandler {
    constructor() {
        this.evaluatedTeachers = {};
        this.observerRunning = false;
        
        // Load from modal handler (already has server data)
        this.loadEvaluatedTeachersFromModal();
    }

    /**
     * Load evaluated teachers from AlreadyEvaluatedModalHandler (server data)
     */
    loadEvaluatedTeachersFromModal() {
        if (window.alreadyEvaluatedModal && window.alreadyEvaluatedModal.submittedTeachers) {
            this.evaluatedTeachers = window.alreadyEvaluatedModal.submittedTeachers;
            console.log('📊 Loaded evaluated teachers from modal:', Object.keys(this.evaluatedTeachers));
        } else {
            // Fallback to localStorage
            this.evaluatedTeachers = this.loadEvaluatedTeachersFromLocalStorage();
        }
    }

    /**
     * Load evaluated teachers from localStorage (FALLBACK ONLY)
     */
    loadEvaluatedTeachersFromLocalStorage() {
        try {
            const submitted = localStorage.getItem('teacher_eval_submitted');
            if (!submitted) return {};
            return JSON.parse(submitted);
        } catch (e) {
            console.error('Error loading evaluated teachers:', e);
            return {};
        }
    }

    /**
     * Check if a teacher has been evaluated
     */
    isTeacherEvaluated(teacherId) {
        return !!this.evaluatedTeachers[teacherId];
    }

    /**
     * Get list of evaluated teacher IDs
     */
    getEvaluatedTeacherIds() {
        return Object.keys(this.evaluatedTeachers);
    }

    /**
     * Mark a teacher as evaluated and update UI immediately
     */
    markTeacherAsEvaluated(teacherId) {
        this.evaluatedTeachers[teacherId] = {
            timestamp: new Date().toISOString(),
            marked_at: new Date().getTime()
        };
        localStorage.setItem('teacher_eval_submitted', JSON.stringify(this.evaluatedTeachers));
        
        // Immediately disable in UI
        this.disableTeacherInUI(teacherId);
        console.log('✅ Teacher marked as evaluated:', teacherId);
    }

    /**
     * Disable teacher in the UI (gray out, add disabled class)
     */
    disableTeacherInUI(teacherId) {
        // Try Flutter approach
        if (window.flutter_inappwebview && window.flutter_inappwebview.callHandler) {
            window.flutter_inappwebview.callHandler('disableTeacher', teacherId);
            return;
        }

        // Fallback: Find teacher element and disable it
        const teacherElements = document.querySelectorAll(`[data-teacher-id="${teacherId}"], [data-id="${teacherId}"]`);
        
        teacherElements.forEach(element => {
            element.classList.add('teacher-evaluated', 'disabled');
            element.style.opacity = '0.5';
            element.style.pointerEvents = 'none';
            element.style.cursor = 'not-allowed';
            
            // Add badge
            let badge = element.querySelector('.evaluated-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'evaluated-badge';
                badge.innerHTML = '✓ Already Evaluated';
                badge.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    z-index: 10;
                `;
                element.style.position = 'relative';
                element.appendChild(badge);
            }
        });

        console.log(`🔒 Disabled ${teacherElements.length} teacher element(s) for ID: ${teacherId}`);
    }

    /**
     * Watch for new teachers being loaded and apply disabled state
     */
    observeTeacherUpdates() {
        if (this.observerRunning) return;
        this.observerRunning = true;

        // For Flutter web apps using mutation observer
        const uiStateObserver = new MutationObserver(() => {
            this.applyDisabledStateToAll();
        });

        uiStateObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });

        // Initial application
        this.applyDisabledStateToAll();

        console.log('👁️ Teacher UI Observer started');
    }

    /**
     * Apply disabled state to all evaluated teachers in current DOM
     */
    applyDisabledStateToAll() {
        this.getEvaluatedTeacherIds().forEach(teacherId => {
            this.disableTeacherInUI(teacherId);
        });
    }

    /**
     * Store submission and immediately disable
     */
    onSubmissionSuccess(teacherId, evaluationData) {
        this.markTeacherAsEvaluated(teacherId);
        return {
            success: true,
            message: '✅ Evaluation submitted! This teacher is now disabled.',
            teacherId: teacherId
        };
    }

    /**
     * Handle evaluation errors
     */
    onEvaluationError(teacherId, error) {
        const errorMsg = error.message || 'Unknown error';
        
        if (errorMsg.includes('already evaluated')) {
            this.markTeacherAsEvaluated(teacherId);
            return {
                success: false,
                message: '❌ You already evaluated this teacher',
                code: 'duplicate'
            };
        }

        return {
            success: false,
            message: errorMsg,
            code: 'error'
        };
    }

    /**
     * Add CSS styles for disabled teacher state
     */
    injectStyles() {
        const styleId = 'teacher-evaluation-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            .teacher-card.teacher-evaluated,
            .teacher-item.teacher-evaluated,
            [data-teacher-id].teacher-evaluated {
                opacity: 0.5 !important;
                filter: grayscale(100%) !important;
                position: relative;
            }

            .teacher-card.disabled,
            .teacher-item.disabled,
            .teacher-evaluated.disabled {
                cursor: not-allowed !important;
                pointer-events: none !important;
            }

            .teacher-card.teacher-evaluated::after {
                content: '✓ Already Evaluated';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(34, 197, 94, 0.95);
                color: white;
                padding: 8px 16px;
                border-radius: 6px;
                font-weight: 600;
                font-size: 13px;
                z-index: 100;
                white-space: nowrap;
            }

            .evaluated-badge {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(34, 197, 94, 0.9);
                color: white;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                z-index: 10;
            }
        `;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = css;
        document.head.appendChild(style);

        console.log('✅ Teacher evaluation styles injected');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.teacherEvaluationUI = new TeacherEvaluationUIHandler();
        window.teacherEvaluationUI.injectStyles();
        window.teacherEvaluationUI.observeTeacherUpdates();
    });
} else {
    window.teacherEvaluationUI = new TeacherEvaluationUIHandler();
    window.teacherEvaluationUI.injectStyles();
    window.teacherEvaluationUI.observeTeacherUpdates();
}
