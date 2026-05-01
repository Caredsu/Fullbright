/**
 * Real-Time Notifications Manager
 * Connects to Server-Sent Events stream for live admin notifications
 */

class RealTimeNotifications {
    constructor(options = {}) {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        
        this.options = {
            streamUrl: '/api/notifications-stream.php',
            autoConnect: true,
            onNewEvaluation: null,
            onError: null,
            ...options
        };

        if (this.options.autoConnect) {
            this.connect();
        }
    }

    connect() {
        if (this.isConnected) return;

        console.log('🔗 Connecting to real-time notifications...');

        try {
            this.eventSource = new EventSource(this.options.streamUrl);

            // Connection established
            this.eventSource.addEventListener('connected', (event) => {
                const data = JSON.parse(event.data);
                console.log('✅ Connected to notification stream', data);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                if (window.toast) {
                    window.toast.info('Notifications', 'Connected to real-time updates');
                }
            });

            // New evaluation received
            this.eventSource.addEventListener('new_evaluation', (event) => {
                const evaluation = JSON.parse(event.data);
                console.log('📊 New evaluation:', evaluation);
                this.handleNewEvaluation(evaluation);
            });

            // Heartbeat to keep connection alive
            this.eventSource.addEventListener('heartbeat', (event) => {
                console.log('💓 Heartbeat');
            });

            // Error handling
            this.eventSource.addEventListener('error', (event) => {
                const data = JSON.parse(event.data);
                console.error('❌ Notification error:', data);
                
                if (window.toast) {
                    window.toast.error('Connection Error', data.message);
                }
                
                if (this.options.onError) {
                    this.options.onError(data);
                }
            });

            // Connection closed
            this.eventSource.addEventListener('closed', (event) => {
                console.log('🔌 Connection closed');
                this.disconnect();
            });

            // Generic error handler
            this.eventSource.onerror = () => {
                console.error('EventSource error');
                this.handleConnectionError();
            };

        } catch (error) {
            console.error('Failed to create EventSource:', error);
            this.handleConnectionError();
        }
    }

    handleNewEvaluation(evaluation) {
        // Update badge count
        this.updateBadge();

        // Show toast notification
        if (window.toast) {
            window.toast.show({
                type: 'success',
                icon: '📊',
                title: 'New Evaluation Received',
                message: `${evaluation.teacher_name} - Rating: ${evaluation.rating}/5`,
                duration: 5000,
                action: {
                    label: 'View',
                    onClick: () => {
                        // Redirect to evaluations page or trigger refresh
                        if (window.location.pathname.includes('/admin/')) {
                            this.refreshDashboard();
                        }
                    }
                }
            });
        }

        // Call custom callback
        if (this.options.onNewEvaluation) {
            this.options.onNewEvaluation(evaluation);
        }

        // Trigger dashboard refresh
        this.refreshDashboard();
    }

    refreshDashboard() {
        // Refresh evaluations data if we have the function
        if (typeof window.refreshEvaluations === 'function') {
            console.log('🔄 Refreshing dashboard data...');
            window.refreshEvaluations();
        }

        // Or reload the entire page if on admin dashboard
        if (window.location.pathname.includes('/admin/dashboard')) {
            // Soft reload - just the data portion
            const dashboardContainer = document.getElementById('dashboard-container');
            if (dashboardContainer) {
                dashboardContainer.classList.add('refreshing');
                fetch(window.location.href)
                    .then(response => response.text())
                    .then(html => {
                        const parser = new DOMParser();
                        const newDoc = parser.parseFromString(html, 'text/html');
                        const newContent = newDoc.getElementById('dashboard-container');
                        if (newContent) {
                            dashboardContainer.innerHTML = newContent.innerHTML;
                            dashboardContainer.classList.remove('refreshing');
                        }
                    })
                    .catch(error => console.error('Error refreshing dashboard:', error));
            }
        }
    }

    updateBadge() {
        // Update browser tab title badge
        const titleMatch = document.title.match(/^(?:\(\d+\) )?(.*)/);
        const baseTitle = titleMatch ? titleMatch[1] : document.title;
        
        // Get current count or increment
        const currentBadge = document.title.match(/^\((\d+)\)/);
        const newCount = currentBadge ? parseInt(currentBadge[1]) + 1 : 1;
        
        document.title = `(${newCount}) ${baseTitle}`;

        // Update page favicon if available
        this.updateFavicon();
    }

    updateFavicon() {
        // Add a visual indicator to favicon (optional)
        // This requires a more complex approach with canvas
        // For now, just update the page title as shown above
    }

    handleConnectionError() {
        this.isConnected = false;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`⏳ Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.disconnect();
                this.connect();
            }, this.reconnectDelay);
        } else {
            console.error('❌ Failed to connect after multiple attempts');
            if (window.toast) {
                window.toast.error('Connection Failed', 'Could not connect to real-time notifications');
            }
        }
    }

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
            console.log('🔌 Disconnected from notifications');
        }
    }

    isHealthy() {
        return this.isConnected && this.eventSource && this.eventSource.readyState === EventSource.OPEN;
    }
}

// Initialize globally
window.realTimeNotifications = null;

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on admin pages
    if (document.body.classList.contains('admin-page') || 
        window.location.pathname.includes('/admin/')) {
        
        window.realTimeNotifications = new RealTimeNotifications({
            onNewEvaluation: (evaluation) => {
                console.log('Admin dashboard received new evaluation:', evaluation);
            }
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.realTimeNotifications) {
        window.realTimeNotifications.disconnect();
    }
});
