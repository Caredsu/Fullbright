/**
 * Form Validation System
 * Real-time validation with error messages
 */

class FormValidator {
    constructor() {
        this.rules = {};
        this.errors = {};
        this.init();
    }

    init() {
        this.setupValidationRules();
        this.attachListeners();
    }

    setupValidationRules() {
        // Teacher evaluation form rules
        this.rules = {
            rating: {
                required: true,
                validate: (value) => value >= 1 && value <= 5,
                message: 'Please select a rating (1-5 stars)'
            },
            feedback: {
                minLength: 10,
                maxLength: 1000,
                message: {
                    minLength: 'Feedback must be at least 10 characters',
                    maxLength: 'Feedback cannot exceed 1000 characters'
                }
            },
            teacher_id: {
                required: true,
                message: 'Please select a teacher'
            }
        };
    }

    attachListeners() {
        // Rating stars
        const ratingInputs = document.querySelectorAll('input[name="rating"]');
        ratingInputs.forEach(input => {
            input.addEventListener('change', () => this.validateField('rating', input.value));
        });

        // Feedback textarea
        const feedbackInput = document.getElementById('feedback');
        if (feedbackInput) {
            feedbackInput.addEventListener('input', (e) => {
                this.validateField('feedback', e.target.value);
                this.updateCharCount(e.target);
            });
        }

        // Teacher select
        const teacherSelect = document.getElementById('teacher_id');
        if (teacherSelect) {
            teacherSelect.addEventListener('change', () => {
                this.validateField('teacher_id', teacherSelect.value);
            });
        }

        // Form submission
        const form = document.getElementById('evaluation-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm()) {
                    e.preventDefault();
                    this.showValidationSummary();
                }
            });
        }
    }

    validateField(fieldName, value) {
        const rule = this.rules[fieldName];
        if (!rule) return true;

        const errorContainer = document.getElementById(`${fieldName}-error`);
        let isValid = true;
        let errorMessage = '';

        // Required validation
        if (rule.required && !value) {
            isValid = false;
            errorMessage = rule.message || 'This field is required';
        }

        // Custom validation function
        if (isValid && rule.validate && !rule.validate(value)) {
            isValid = false;
            errorMessage = rule.message || 'Invalid input';
        }

        // Min length
        if (isValid && rule.minLength && value.length < rule.minLength) {
            isValid = false;
            errorMessage = rule.message.minLength || `Minimum ${rule.minLength} characters required`;
        }

        // Max length
        if (isValid && rule.maxLength && value.length > rule.maxLength) {
            isValid = false;
            errorMessage = rule.message.maxLength || `Maximum ${rule.maxLength} characters allowed`;
        }

        // Update error display
        if (errorContainer) {
            if (isValid) {
                errorContainer.textContent = '';
                errorContainer.style.display = 'none';
                document.getElementById(fieldName)?.classList.remove('is-invalid');
            } else {
                errorContainer.textContent = errorMessage;
                errorContainer.style.display = 'block';
                document.getElementById(fieldName)?.classList.add('is-invalid');
            }
        }

        this.errors[fieldName] = isValid ? null : errorMessage;
        return isValid;
    }

    validateForm() {
        let isValid = true;
        for (const fieldName of Object.keys(this.rules)) {
            const input = document.getElementById(fieldName);
            if (input) {
                const value = input.type === 'radio' 
                    ? document.querySelector(`input[name="${fieldName}"]:checked`)?.value || ''
                    : input.value;
                if (!this.validateField(fieldName, value)) {
                    isValid = false;
                }
            }
        }
        return isValid;
    }

    showValidationSummary() {
        const errorCount = Object.values(this.errors).filter(e => e !== null).length;
        if (errorCount > 0) {
            if (window.toast) {
                window.toast.error(
                    'Form Validation Failed',
                    `Please fix ${errorCount} error${errorCount > 1 ? 's' : ''} before submitting`,
                    5000
                );
            }
        }
    }

    updateCharCount(textarea) {
        const count = textarea.value.length;
        const counter = textarea.nextElementSibling;
        if (counter && counter.classList.contains('char-count')) {
            counter.textContent = `${count}/1000`;
            counter.style.color = count > 900 ? '#ef4444' : '#cbd5e1';
        }
    }

    showSuccessMessage() {
        if (window.toast) {
            window.toast.success(
                'Evaluation Submitted!',
                'Thank you for completing this evaluation.',
                3000
            );
        }
    }

    showErrorMessage(message) {
        if (window.toast) {
            window.toast.error('Submission Failed', message, 5000);
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.formValidator = new FormValidator();
});
