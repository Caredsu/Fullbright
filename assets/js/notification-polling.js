/**
 * Notification Polling System
 * Checks for new evaluations every 5 seconds
 * Simple, reliable, and lightweight
 */

class NotificationPoller {
    constructor(options = {}) {
        this.pollingInterval = options.pollingInterval || 5000; // 5 seconds
        this.lastEvaluationId = null;
        this.pollTimeout = null;
        this.isPolling = false;
        
        // Initialize
        this.loadLastId();
        this.startPolling();
        
        console.log('✅ Notification polling started (every ' + (this.pollingInterval / 1000) + 's)');
    }

    loadLastId() {
        // Try to get the last known evaluation ID from localStorage
        this.lastEvaluationId = localStorage.getItem('lastEvaluationId');
        console.log('📌 Last known evaluation ID:', this.lastEvaluationId);
    }

    saveLastId(id) {
        if (id) {
            localStorage.setItem('lastEvaluationId', id);
            this.lastEvaluationId = id;
        }
    }

    startPolling() {
        if (this.isPolling) return;
        
        this.isPolling = true;
        this.poll();
    }

    poll() {
        if (!this.isPolling) return;

        const params = new URLSearchParams();
        if (this.lastEvaluationId) {
            params.append('lastId', this.lastEvaluationId);
        }

        fetch('/teacher-eval/api/check-new-evaluations.php?' + params.toString(), {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update the last known ID
                if (data.latest_id) {
                    this.saveLastId(data.latest_id);
                }

                // Check if there are new evaluations
                if (data.has_new) {
                    console.log('🆕 New evaluation detected!', data.latest_id);
                    this.updateBadge();
                    this.showNotification();
                }
            } else {
                console.warn('⚠️ Polling error:', data.error);
            }
        })
        .catch(error => {
            console.error('❌ Polling failed:', error);
        })
        .finally(() => {
            // Schedule next poll
            this.pollTimeout = setTimeout(() => this.poll(), this.pollingInterval);
        });
    }

    updateBadge() {
        // Update the notification badge to show new notification
        const badge = document.getElementById('notif-badge');
        if (badge) {
            // Show badge with a dot or number
            badge.textContent = '●';
            badge.style.display = 'inline-block';
            badge.style.backgroundColor = '#e74c3c';
            badge.style.color = 'white';
            badge.style.borderRadius = '50%';
            badge.style.width = '8px';
            badge.style.height = '8px';
            badge.style.marginLeft = '5px';
            console.log('🔴 Badge updated');
        }
    }

    showNotification() {
        // Use existing toast system if available
        if (typeof showNotificationToast === 'function') {
            showNotificationToast({
                type: 'success',
                title: 'New Evaluation',
                message: 'A new teacher evaluation has been submitted!',
                duration: 5000
            });
        } else if (typeof Swal !== 'undefined') {
            // Fallback to SweetAlert2
            Swal.fire({
                icon: 'success',
                title: 'New Evaluation',
                text: 'A new teacher evaluation has been submitted!',
                timer: 5000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        } else {
            // Simple alert as last resort
            console.log('🔔 New evaluation notification - check Results page');
        }
    }

    stopPolling() {
        this.isPolling = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
        console.log('⏹️ Notification polling stopped');
    }

    restartPolling() {
        this.stopPolling();
        this.startPolling();
    }
}

// Initialize polling when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.notificationPoller = new NotificationPoller({
            pollingInterval: 5000 // Check every 5 seconds
        });
    });
} else {
    // DOM already loaded
    window.notificationPoller = new NotificationPoller({
        pollingInterval: 5000 // Check every 5 seconds
    });
}

// Stop polling when page is hidden (save bandwidth)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (window.notificationPoller) {
            window.notificationPoller.stopPolling();
            console.log('📱 Page hidden - polling paused');
        }
    } else {
        if (window.notificationPoller) {
            window.notificationPoller.restartPolling();
            console.log('📱 Page visible - polling resumed');
        }
    }
});
