/**
 * Admin Panel Utility Functions
 */

// API Helper
class API {
    static async post(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Network error' };
        }
    }
    
    static async get(url) {
        try {
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Network error' };
        }
    }
    
    static async formSubmit(url, formData) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, message: 'Network error' };
        }
    }
}

// Toast Notification - Using SweetAlert2
class Toast {
    static show(message, type = 'success', duration = 3000) {
        // Map our types to SweetAlert2 types
        const typeMap = {
            'success': 'success',
            'danger': 'error',
            'warning': 'warning',
            'info': 'info'
        };
        
        const sweetType = typeMap[type] || 'info';
        
        Swal.fire({
            icon: sweetType,
            title: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: duration,
            timerProgressBar: true,
            customClass: {
                container: 'sweet-alert-container',
                popup: 'sweet-alert-popup',
                title: 'sweet-alert-title'
            }
        });
    }
    
    static success(message) {
        this.show(message, 'success', 2500);
    }
    
    static error(message) {
        this.show(message, 'danger', 3000);
    }
    
    static warning(message) {
        this.show(message, 'warning', 3000);
    }
    
    static info(message) {
        this.show(message, 'info', 2500);
    }
}

// Modal Helper
class Modal {
    static show(id) {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
        modal.show();
    }
    
    static hide(id) {
        const modal = bootstrap.Modal.getInstance(document.getElementById(id));
        if (modal) modal.hide();
    }
    
    static toggle(id) {
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(id));
        modal.toggle();
    }
    
    static confirm(message, onConfirm, onCancel) {
        if (confirm(message)) {
            onConfirm();
        } else if (onCancel) {
            onCancel();
        }
    }
}

// Form Helper
class Form {
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        formData.forEach((value, key) => {
            if (data[key]) {
                if (!Array.isArray(data[key])) {
                    data[key] = [data[key]];
                }
                data[key].push(value);
            } else {
                data[key] = value;
            }
        });
        return data;
    }
    
    static clearForm(formElement) {
        formElement.reset();
        formElement.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    }
    
    static showError(formElement, fieldName, message) {
        const field = formElement.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.textContent = message;
            }
        }
    }
    
    static clearErrors(formElement) {
        formElement.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    }
}

// Table Helper
class Table {
    static init(tableId, options = {}) {
        const table = document.getElementById(tableId);
        if (!table || !window.DataTable) return;
        
        return new DataTable(`#${tableId}`, {
            pageLength: options.pageLength || 10,
            ordering: options.ordering !== false,
            searching: options.searching !== false,
            paging: options.paging !== false,
            info: options.info !== false,
            language: {
                search: options.searchLabel || 'Filter:',
                paginate: {
                    previous: '<',
                    next: '>'
                }
            },
            ...options
        });
    }
    
    static reload(tableId) {
        const table = window.DataTable.isDataTable(`#${tableId}`) 
            ? new DataTable(`#${tableId}`) 
            : window.DataTable.tables()[ tableId];
        if (table) table.ajax.reload();
    }
}

// Chart Helper
class ChartHelper {
    static createBarChart(canvasId, labels, data, options = {}) {
        if (!window.Chart) return;
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: options.label || 'Data',
                    data: data,
                    backgroundColor: options.backgroundColor || '#667eea',
                    borderRadius: 5,
                    ...options.datasetOptions
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: options.showLegend !== false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                ...options.chartOptions
            }
        });
    }
    
    static createLineChart(canvasId, labels, data, options = {}) {
        if (!window.Chart) return;
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: options.label || 'Data',
                    data: data,
                    borderColor: options.borderColor || '#667eea',
                    backgroundColor: options.backgroundColor || 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    pointRadius: 4,
                    ...options.datasetOptions
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                ...options.chartOptions
            }
        });
    }
    
    static createDoughnutChart(canvasId, labels, data, options = {}) {
        if (!window.Chart) return;
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        return new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: options.colors || [
                        '#667eea',
                        '#764ba2',
                        '#f56565',
                        '#48bb78',
                        '#ed8936'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2,
                    ...options.datasetOptions
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                ...options.chartOptions
            }
        });
    }
}

// Date Helper
class DateHelper {
    static formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    
    static formatDateTime(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    static formatTime(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Validation Helper
class Validator {
    static isEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    static isPhone(phone) {
        return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    
    static isMinLength(str, length) {
        return str && str.length >= length;
    }
    
    static isMaxLength(str, length) {
        return !str || str.length <= length;
    }
    
    static isRequired(value) {
        return value && value.toString().trim() !== '';
    }
    
    static matches(str, pattern) {
        return new RegExp(pattern).test(str);
    }
}

// Storage Helper (localStorage with automatic JSON handling)
// Check if already declared to prevent duplicate class error
if (typeof Storage === 'undefined' || !Storage.set) {
    class Storage {
        static set(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        }
        
        static get(key, defaultValue = null) {
            const item = localStorage.getItem(key);
            try {
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        }
        
        static remove(key) {
            localStorage.removeItem(key);
        }
        
        static clear() {
            localStorage.clear();
        }
    }
    
    // Make Storage available globally
    window.Storage = Storage;
}

// DOM Helper
class DOM {
    static $$(selector) {
        return document.querySelectorAll(selector);
    }
    
    static $(selector) {
        return document.querySelector(selector);
    }
    
    static on(selector, event, callback) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.addEventListener(event, callback);
        });
    }
    
    static hide(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = 'none';
        });
    }
    
    static show(selector) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.display = '';
        });
    }
    
    static addClass(selector, className) {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.add(className);
        });
    }
    
    static removeClass(selector, className) {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.remove(className);
        });
    }
    
    static toggleClass(selector, className) {
        document.querySelectorAll(selector).forEach(el => {
            el.classList.toggle(className);
        });
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-fixed)');
    alerts.forEach(alert => {
        setTimeout(() => {
            if (alert.classList.contains('show')) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 5000);
    });
    
    // Form validation
    const forms = document.querySelectorAll('[data-needs-validation]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
    
    // Display page messages (success/error alerts from PHP)
    if (typeof pageMessages !== 'undefined') {
        if (pageMessages.success && pageMessages.success.length > 0) {
            setTimeout(() => Toast.success(pageMessages.success), 100);
        }
        if (pageMessages.error && pageMessages.error.length > 0) {
            setTimeout(() => Toast.error(pageMessages.error), 100);
        }
    }
});
