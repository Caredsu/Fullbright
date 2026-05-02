/**
 * Global JavaScript - Main functions used across all pages
 */

// Toast Container Setup
function initializeToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '100px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.maxWidth = '400px';
        document.body.appendChild(container);
    }
}

// Show Toast Notification
function showToast(message, type = 'info', duration = 5000) {
    initializeToastContainer();
    
    const iconMap = {
        'success': { icon: 'check-circle', class: 'success' },
        'error': { icon: 'exclamation-circle', class: 'error' },
        'warning': { icon: 'exclamation-triangle', class: 'warning' },
        'info': { icon: 'info-circle', class: 'info' }
    };
    
    const config = iconMap[type] || iconMap['info'];
    
    const toastHtml = `
        <div class="toast-notification" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); color: #000000;">
            <div class="toast-icon">
                <i class="bi bi-${config.icon}" style="font-size: 22px; color: #8b5cf6;"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div class="toast-message">${escapeHtml(message)}</div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('toast-container');
    container.insertAdjacentHTML('beforeend', toastHtml);
    
    const toast = container.lastElementChild;
    
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.style.animation = 'slideOutToast 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
            setTimeout(() => toast.remove(), 400);
        }
    }, duration);
}

// Escape HTML for security
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format Date
function formatDate(date, format = 'MM/DD/YYYY HH:mm') {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    const padZero = (num) => String(num).padStart(2, '0');
    
    const formats = {
        'YYYY': date.getFullYear(),
        'MM': padZero(date.getMonth() + 1),
        'DD': padZero(date.getDate()),
        'HH': padZero(date.getHours()),
        'mm': padZero(date.getMinutes()),
        'ss': padZero(date.getSeconds())
    };
    
    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => formats[match]);
}

// Debounce Function
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

// Throttle Function
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}

// Get Query Parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Format Currency
function formatCurrency(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(value);
}

// Format Number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Loading State Management
function setLoadingState(element, isLoading = true) {
    if (isLoading) {
        element.disabled = true;
        element.dataset.originalText = element.textContent;
        element.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
    } else {
        element.disabled = false;
        element.textContent = element.dataset.originalText || 'Submit';
    }
}

// Confirm Dialog
function showConfirm(title, message, onConfirm, onCancel) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#8b5cf6',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, confirm!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed && onConfirm) {
                onConfirm();
            } else if (result.isDismissed && onCancel) {
                onCancel();
            }
        });
    } else {
        if (confirm(message)) {
            onConfirm && onConfirm();
        } else {
            onCancel && onCancel();
        }
    }
}

// Success Alert
function showSuccess(title, message = '', duration = 2000) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: title,
            text: message,
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true
        });
    } else {
        showToast(title + ': ' + message, 'success', duration);
    }
}

// Error Alert
function showError(title, message = '') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: title,
            text: message,
            confirmButtonColor: '#8b5cf6'
        });
    } else {
        showToast(title + ': ' + message, 'error', 5000);
    }
}

// Info Alert
function showInfo(title, message = '') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'info',
            title: title,
            text: message,
            confirmButtonColor: '#8b5cf6'
        });
    } else {
        showToast(title + ': ' + message, 'info', 3000);
    }
}

// Hide All Modals
function hideAllModals() {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    });
}

// Local Storage Helpers (renamed to AppStorage to avoid conflict with Storage class in main.js)
const AppStorage = {
    set: (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    },
    get: (key) => {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    },
    remove: (key) => {
        localStorage.removeItem(key);
    },
    clear: () => {
        localStorage.clear();
    }
};

// Backward compatibility - keep Storage as alias
if (typeof Storage === 'undefined') {
    window.Storage = AppStorage;
}

// Session Storage Helpers
const SessionStorage = {
    set: (key, value) => {
        sessionStorage.setItem(key, JSON.stringify(value));
    },
    get: (key) => {
        const value = sessionStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    },
    remove: (key) => {
        sessionStorage.removeItem(key);
    },
    clear: () => {
        sessionStorage.clear();
    }
};

// Initialize Toast Container on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initializeToastContainer();
});

// Initialize tooltips and popovers if Bootstrap is available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof bootstrap !== 'undefined') {
        // Initialize all tooltips
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });
        
        // Initialize all popovers
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
            new bootstrap.Popover(el);
        });
    }
});
