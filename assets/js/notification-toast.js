/**
 * Notification Toast System
 * Shows professional toast notifications for real-time events
 */

class NotificationToast {
    constructor() {
        this.container = null;
        this.initContainer();
    }

    initContainer() {
        // Create toast container if it doesn't exist
        this.container = document.getElementById('notification-toasts');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-toasts';
            this.container.className = 'notification-toasts-container';
            document.body.appendChild(this.container);
        }
    }

    show(options) {
        const {
            type = 'info', // success, error, warning, info
            title = '',
            message = '',
            duration = 5000, // milliseconds (0 = persistent)
            icon = null,
            action = null
        } = options;

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `notification-toast notification-toast-${type}`;

        let iconHtml = '';
        if (icon) {
            iconHtml = `<span class="toast-icon">${icon}</span>`;
        } else {
            const icons = {
                success: '✓',
                error: '✕',
                warning: '⚠',
                info: 'ℹ'
            };
            iconHtml = `<span class="toast-icon">${icons[type]}</span>`;
        }

        let actionHtml = '';
        if (action) {
            actionHtml = `<button class="toast-action">${action.label}</button>`;
        }

        toast.innerHTML = `
            <div class="toast-content">
                ${iconHtml}
                <div class="toast-text">
                    ${title ? `<div class="toast-title">${title}</div>` : ''}
                    ${message ? `<div class="toast-message">${message}</div>` : ''}
                </div>
            </div>
            <button class="toast-close">✕</button>
            ${actionHtml}
        `;

        this.container.appendChild(toast);

        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toastId);
        });

        // Action button handler
        if (action) {
            toast.querySelector('.toast-action').addEventListener('click', () => {
                if (action.onClick) action.onClick();
                this.remove(toastId);
            });
        }

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toastId);
            }, duration);
        }

        return toastId;
    }

    remove(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.add('removing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    success(title, message, duration = 3000) {
        return this.show({ type: 'success', title, message, duration });
    }

    error(title, message, duration = 5000) {
        return this.show({ type: 'error', title, message, duration });
    }

    warning(title, message, duration = 4000) {
        return this.show({ type: 'warning', title, message, duration });
    }

    info(title, message, duration = 3000) {
        return this.show({ type: 'info', title, message, duration });
    }
}

// Initialize globally
window.toast = new NotificationToast();
