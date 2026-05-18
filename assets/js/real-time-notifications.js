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
        
        // Track seen evaluations to prevent duplicate notifications
        this.seenEvaluationIds = new Set();
        
        // Initialize refresh timeout
        this.refreshTimeout = null;
        
        this.options = {
            // Dynamically calculate the notifications stream URL
            // Works from any admin page by going up to the root and finding api/
            streamUrl: this.getNotificationsStreamUrl(),
            autoConnect: false,  // Disabled due to SSE connection issues - will be manually triggered if needed
            onNewEvaluation: null,
            onError: null,
            ...options
        };

        if (this.options.autoConnect) {
            this.connect();
        }
    }

    getNotificationsStreamUrl() {
        // Get the current pathname
        const pathname = window.location.pathname;
        
        // Try to find where /admin/ is in the path
        const adminIndex = pathname.indexOf('/admin/');
        
        if (adminIndex !== -1) {
            // Go up from /admin/ to the root and access api/
            const rootPath = pathname.substring(0, adminIndex);
            return rootPath + '/api/notifications-stream.php';
        }
        
        // Fallback: use a relative path that goes up from current directory
        // This works from any page under /admin/
        return '../api/notifications-stream.php';
    }

    connect() {
        if (this.isConnected) return;

        console.log('🔗 Connecting to real-time notifications...');
        console.log('📍 Current page:', window.location.pathname);
        console.log('📍 Using notifications stream URL:', this.options.streamUrl);

        try {
            // Get admin credentials from page (these should be set by dashboard.php in a data attribute or global)
            const body = document.querySelector('body');
            const adminIdFromAttr = body?.getAttribute('data-admin-id');
            const adminRoleFromAttr = body?.getAttribute('data-admin-role');
            
            const adminId = adminIdFromAttr || window.ADMIN_ID || localStorage.getItem('admin_id');
            const adminRole = adminRoleFromAttr || window.ADMIN_ROLE || localStorage.getItem('admin_role') || 'user';
            
            console.log('🔐 Auth check:', {
                adminIdAttr: adminIdFromAttr,
                adminRoleAttr: adminRoleFromAttr,
                windowADMIN_ID: window.ADMIN_ID,
                localStorageAdminId: localStorage.getItem('admin_id'),
                finalAdminId: adminId,
                finalAdminRole: adminRole
            });
            
            if (!adminId) {
                console.warn('⚠️ No admin ID found - cannot connect to notifications');
                console.warn('Available admin_id sources:');
                console.warn('  - body[data-admin-id]:', adminIdFromAttr);
                console.warn('  - window.ADMIN_ID:', window.ADMIN_ID);
                console.warn('  - localStorage.admin_id:', localStorage.getItem('admin_id'));
                return;
            }
            
            console.log('🔐 Using admin ID:', adminId);
            
            // Add auth params to URL
            const separator = this.options.streamUrl.includes('?') ? '&' : '?';
            const authUrl = `${this.options.streamUrl}${separator}admin_id=${encodeURIComponent(adminId)}&admin_role=${encodeURIComponent(adminRole)}`;
            
            console.log('📡 Full EventSource URL:', authUrl);
            console.log('📡 URL details:', {
                baseUrl: this.options.streamUrl,
                queryParams: { admin_id: adminId, admin_role: adminRole },
                fullUrl: authUrl
            });
            
            // EventSource automatically sends cookies for same-origin requests
            // Do NOT use withCredentials - it's not a valid EventSource option
            this.eventSource = new EventSource(authUrl);

            // Connection established
            this.eventSource.addEventListener('connected', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('✅ Connected to notification stream', data);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Only show connected toast on first connection per session, not on page navigation
                    // Track in sessionStorage to persist across page navigations
                    if (!sessionStorage.getItem('realtime_connected_notified')) {
                        sessionStorage.setItem('realtime_connected_notified', 'true');
                        
                        if (window.toast) {
                            window.toast.info('Notifications', 'Connected to real-time updates');
                        }
                    } else {
                        console.log('✅ Reconnected to notification stream (silent)');
                    }
                } catch (error) {
                    console.error('❌ Failed to parse connected event:', error, event.data);
                }
            });

            // New evaluation received
            this.eventSource.addEventListener('new_evaluation', (event) => {
                try {
                    if (!event.data || event.data === 'undefined') {
                        console.warn('⚠️ Received undefined data:', event);
                        return;
                    }
                    const evaluation = JSON.parse(event.data);
                    console.log('📊 New evaluation:', evaluation);
                    this.handleNewEvaluation(evaluation);
                } catch (error) {
                    console.error('❌ Failed to parse evaluation data:', error, event.data);
                }
            });

            // Heartbeat to keep connection alive
            this.eventSource.addEventListener('heartbeat', (event) => {
                console.log('💓 Heartbeat');
            });

            // Error handling
            this.eventSource.addEventListener('error', (event) => {
                try {
                    if (!event.data || event.data === 'undefined') {
                        console.warn('⚠️ Received undefined error data');
                        return;
                    }
                    const data = JSON.parse(event.data);
                    console.error('❌ Notification error:', data);
                    
                    if (window.toast) {
                        window.toast.error('Connection Error', data.message || 'Unknown error');
                    }
                    
                    if (this.options.onError) {
                        this.options.onError(data);
                    }
                } catch (error) {
                    console.error('❌ Failed to parse error data:', error, event.data);
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
        console.log('🔔 handleNewEvaluation called with:', evaluation);
        
        // Check if we already processed this evaluation
        if (this.seenEvaluationIds.has(evaluation.id)) {
            console.log('⏭️ Skipping duplicate evaluation:', evaluation.id);
            return;
        }
        
        // Mark as seen to prevent duplicate notifications
        this.seenEvaluationIds.add(evaluation.id);
        
        console.log('📊 Processing NEW evaluation:', evaluation);
        
        // Validate teacher name
        const teacherName = evaluation.teacher_name && evaluation.teacher_name !== 'Unknown Teacher' 
            ? evaluation.teacher_name 
            : `Teacher #${evaluation.teacher_id?.substring(0, 8) || 'Unknown'}`;
        
        // Validate rating
        const rating = evaluation.rating && evaluation.rating > 0 ? evaluation.rating : '?';
        const ratingDisplay = typeof rating === 'number' ? rating.toFixed(1) : rating;
        
        console.log('✅ Notification details:', { teacherName, ratingDisplay, evaluationId: evaluation.id });

        // Update badge count and notification dropdown
        console.log('🔔 Calling updateBadge...');
        this.updateBadge();
        
        console.log('📋 Calling addToNotificationPanel...');
        this.addToNotificationPanel(teacherName, ratingDisplay, evaluation);

        // Show toast notification for new evaluation
        if (window.toast && typeof window.toast.show === 'function') {
            window.toast.show({
                type: 'success',
                icon: '📊',
                title: 'New Evaluation',
                message: `${teacherName} - ⭐ ${ratingDisplay}/5`,
                duration: 5000,
                action: {
                    label: 'View',
                    onClick: () => {
                        this.refreshDashboard();
                    }
                }
            });
        } else {
            console.warn('Toast notification system not available');
        }

        // Call custom callback
        if (this.options.onNewEvaluation) {
            this.options.onNewEvaluation(evaluation);
        }

        // Trigger dashboard refresh ONLY once per evaluation
        // Delay slightly to avoid multiple refreshes
        clearTimeout(this.refreshTimeout);
        this.refreshTimeout = setTimeout(() => {
            this.refreshDashboard();
        }, 1000);
    }

    refreshDashboard() {
        const pathname = window.location.pathname;
        let refreshed = false;
        
        console.log('🔄 Refresh triggered on page:', pathname);
        console.log('🔄 Checking for page-specific refresh functions...');

        // Try page-specific refresh functions first
        if (pathname.includes('/admin/analytics')) {
            console.log('📊 Detected analytics page');
            if (typeof window.loadAnalyticsData === 'function') {
                console.log('🔄 Refreshing analytics data...');
                window.loadAnalyticsData();
                refreshed = true;
            } else {
                console.warn('⚠️ loadAnalyticsData function not found');
            }
        } else if (pathname.includes('/admin/teachers')) {
            console.log('👨‍🏫 Detected teachers page');
            if (typeof window.loadTeachersData === 'function') {
                console.log('🔄 Refreshing teachers data...');
                window.loadTeachersData();
                refreshed = true;
            } else if (typeof window.refreshTeachersTable === 'function') {
                console.log('🔄 Refreshing teachers table...');
                window.refreshTeachersTable();
                refreshed = true;
            } else {
                console.warn('⚠️ loadTeachersData or refreshTeachersTable function not found');
            }
        } else if (pathname.includes('/admin/results')) {
            console.log('📈 Detected results page');
            if (typeof window.loadResultsData === 'function') {
                console.log('🔄 Refreshing results data...');
                window.loadResultsData();
                refreshed = true;
            } else if (typeof window.refreshResults === 'function') {
                console.log('🔄 Refreshing results...');
                window.refreshResults();
                refreshed = true;
            } else {
                console.warn('⚠️ loadResultsData or refreshResults function not found');
            }
        } else if (pathname.includes('/admin/users')) {
            console.log('👥 Detected users page');
            if (typeof window.refreshUsersTable === 'function') {
                console.log('🔄 Refreshing users table...');
                window.refreshUsersTable();
                refreshed = true;
            } else if (typeof window.loadUsersData === 'function') {
                console.log('🔄 Refreshing users data...');
                window.loadUsersData();
                refreshed = true;
            } else {
                console.warn('⚠️ refreshUsersTable or loadUsersData function not found');
            }
        } else if (pathname.includes('/admin/questions')) {
            console.log('❓ Detected questions page');
            if (typeof window.initializeQuestionsPage === 'function') {
                console.log('🔄 Reinitializing questions page...');
                window.initializeQuestionsPage();
                refreshed = true;
            } else if (typeof window.questionsTable !== 'undefined' && window.questionsTable !== null) {
                console.log('🔄 Refreshing questions table...');
                window.questionsTable.ajax.reload();
                refreshed = true;
            } else {
                console.warn('⚠️ initializeQuestionsPage function not found');
            }
        } else if (pathname.includes('/admin/dashboard')) {
            console.log('📊 Detected dashboard page');
            if (typeof window.refreshEvaluations === 'function') {
                console.log('🔄 Refreshing dashboard data...');
                window.refreshEvaluations();
                refreshed = true;
            } else {
                console.warn('⚠️ refreshEvaluations function not found');
            }
        }

        // If no page-specific function found or executed, do a soft reload
        if (!refreshed) {
            console.log('🔄 Performing page refresh for:', pathname);
            // Try soft reload approach for dashboard
            if (pathname.includes('/admin/dashboard')) {
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
            } else {
                // For other pages, reload the main content container
                const mainContent = document.querySelector('main') || document.querySelector('.container') || document.querySelector('.content');
                if (mainContent) {
                    mainContent.classList.add('refreshing');
                    fetch(window.location.href)
                        .then(response => response.text())
                        .then(html => {
                            const parser = new DOMParser();
                            const newDoc = parser.parseFromString(html, 'text/html');
                            const newMain = newDoc.querySelector('main') || newDoc.querySelector('.container') || newDoc.querySelector('.content');
                            if (newMain) {
                                mainContent.innerHTML = newMain.innerHTML;
                                mainContent.classList.remove('refreshing');
                                // Re-initialize any page-specific scripts if needed
                                this.reinitializePageScripts();
                            }
                        })
                        .catch(error => console.error('Error refreshing page content:', error));
                }
            }
        }
    }

    reinitializePageScripts() {
        // Re-initialize any page-specific functionality after soft reload
        const pathname = window.location.pathname;
        
        if (pathname.includes('/admin/analytics') && typeof window.initializeAnalyticsCharts === 'function') {
            window.initializeAnalyticsCharts();
        } else if (pathname.includes('/admin/dashboard') && typeof window.initializeSkeletonLoader === 'function') {
            window.initializeSkeletonLoader();
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

        // Update navbar notification badge (visible on all admin pages)
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            let currentCount = parseInt(notifBadge.textContent) || 0;
            const newBadgeCount = currentCount + 1;
            notifBadge.textContent = newBadgeCount;
            notifBadge.style.display = 'inline-block';
            notifBadge.style.visibility = 'visible';
            notifBadge.style.opacity = '1';
            console.log('🔔 Navbar badge updated:', {
                element: notifBadge,
                newCount: newBadgeCount,
                display: notifBadge.style.display,
                visibility: notifBadge.style.visibility
            });
        } else {
            console.warn('⚠️ notif-badge element not found in DOM');
            // Try to find it with a different approach
            const badges = document.querySelectorAll('[id="notif-badge"]');
            console.log('Badges found with querySelectorAll:', badges.length, badges);
        }

        // Update page favicon if available
        this.updateFavicon();
    }

    addToNotificationPanel(teacherName, ratingDisplay, evaluation) {
        // Add the new evaluation to the notification dropdown panel
        const notifTotal = document.getElementById('notif-total');
        const notifList = document.getElementById('notif-list');
        
        console.log('📋 Attempting to add to notification panel:', {
            teacherName,
            ratingDisplay,
            notifTotalElement: notifTotal,
            notifListElement: notifList
        });
        
        if (!notifList) {
            console.warn('⚠️ Notification panel (notif-list) not found - this page might not have the navbar');
            return;
        }
        
        // Get current notification count
        const currentCount = parseInt(notifTotal?.textContent || 0);
        
        // Create notification item HTML
        const notificationItem = document.createElement('div');
        notificationItem.style.cssText = `
            padding: 12px 16px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            gap: 12px;
            align-items: flex-start;
            cursor: pointer;
            transition: background-color 0.2s;
            animation: slideIn 0.3s ease-out;
        `;
        notificationItem.onmouseover = function() { this.style.backgroundColor = '#f9f9f9'; };
        notificationItem.onmouseout = function() { this.style.backgroundColor = 'transparent'; };
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        
        notificationItem.innerHTML = `
            <div style="
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #e3f2fd;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            ">
                <i class="bi bi-check-circle" style="color: #2196f3; font-size: 16px;"></i>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; color: #333; font-size: 13px; margin-bottom: 2px;">
                    <strong>${teacherName}</strong> - ⭐ ${ratingDisplay}/5
                </div>
                <div style="color: #999; font-size: 12px;">
                    ${timeString}
                </div>
            </div>
        `;
        
        // Add to the top of the notification list
        if (notifList.firstChild) {
            notifList.insertBefore(notificationItem, notifList.firstChild);
        } else {
            notifList.appendChild(notificationItem);
        }
        
        // Update total count
        if (notifTotal) {
            notifTotal.textContent = currentCount + 1;
            console.log('✅ Updated notification total count:', currentCount + 1);
        }
        
        console.log('✅ Added to notification panel:', teacherName);
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

function initializeRealTimeNotifications() {
    // Only initialize on admin pages
    if (document.body.classList.contains('admin-page') || 
        window.location.pathname.includes('/admin/')) {
        
        if (!window.realTimeNotifications) {
            // Wait for ADMIN_ID to be available
            if (!window.ADMIN_ID) {
                console.log('⏳ Waiting for ADMIN_ID to be set...');
                // Retry after 100ms
                setTimeout(initializeRealTimeNotifications, 100);
                return;
            }
            
            console.log('🚀 Initializing real-time notifications from script');
            console.log('📌 ADMIN_ID available:', window.ADMIN_ID);
            console.log('📌 Already shown connected notification in this session:', sessionStorage.getItem('realtime_connected_notified') ? 'YES' : 'NO');
            
            window.realTimeNotifications = new RealTimeNotifications({
                onNewEvaluation: (evaluation) => {
                    console.log('Admin dashboard received new evaluation:', evaluation);
                }
            });
        } else {
            // Connection already initialized, just log it
            console.log('✅ Real-time notifications already initialized in this session');
        }
    }
}

// Handle both cases: script loaded before or after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRealTimeNotifications);
} else {
    // DOM already loaded, initialize after a small delay to ensure credentials are set
    setTimeout(initializeRealTimeNotifications, 50);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.realTimeNotifications) {
        window.realTimeNotifications.disconnect();
    }
});
