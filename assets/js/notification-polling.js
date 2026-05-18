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
        console.log('📱 showNotification() triggered');
        
        // Fetch the latest evaluation details
        fetch('/teacher-eval/api/check-new-evaluations.php?includeDetails=1', {
            method: 'GET',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log('📱 Evaluation details received:', data);
            
            let title = 'New Evaluation';
            let message = 'A new teacher evaluation has been submitted!';
            
            if (data.latest_evaluation) {
                const evaluation = data.latest_evaluation;
                const teacherName = evaluation.teacher_name || `Teacher #${evaluation.teacher_id?.substring(0, 8)}`;
                const rating = evaluation.rating ? evaluation.rating.toFixed(1) : '?';
                message = `${teacherName} - ⭐ ${rating}/5`;
            }
            
            console.log('📱 Toast message:', message);
            console.log('📱 window.toast available?', !!window.toast);
            console.log('📱 window.toast.show available?', typeof window.toast?.show);
            
            // Show toast notification
            if (window.toast && typeof window.toast.show === 'function') {
                console.log('📱 Calling window.toast.show()...');
                window.toast.show({
                    type: 'success',
                    icon: 'bi bi-check-circle-fill',
                    title: title,
                    message: message,
                    duration: 15000,  // Show for 15 seconds so it's visible
                    action: {
                        label: 'View',
                        onClick: () => {
                            console.log('📱 Toast action button clicked');
                            this.refreshDashboard();
                        }
                    }
                });
                console.log('📱 Toast shown successfully');
            } else {
                console.log('🔔 Toast system not available:', title, message);
            }
        })
        .catch(error => {
            console.error('📱 Error fetching evaluation details:', error);
            // Show simple notification anyway
            if (window.toast && typeof window.toast.show === 'function') {
                window.toast.show({
                    type: 'success',
                    icon: 'bi bi-check-circle-fill',
                    title: 'New Evaluation',
                    message: 'A new teacher evaluation has been submitted!',
                    duration: 15000  // Show for 15 seconds
                });
            }
        });
    }

    refreshDashboard() {
        const pathname = window.location.pathname;
        console.log('🔄 Dashboard refresh triggered');
        
        // Simple page reload for dashboard
        if (pathname.includes('/admin/dashboard')) {
            location.reload();
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
