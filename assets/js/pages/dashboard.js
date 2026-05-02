/**
 * Dashboard Page JavaScript
 * Specific functionality for admin/dashboard.php
 */

// Skeleton Loader Management
function initializeSkeletonLoader() {
    try {
        const skeletonLoader = document.querySelector('.skeleton-loader');
        
        if (!skeletonLoader) {
            console.log('ℹ️ No skeleton loader found');
            return;
        }
        
        const showSkeleton = skeletonLoader.getAttribute('data-show-skeleton') === 'true';
        console.log('Skeleton loader status:', { show: showSkeleton, hasClass: skeletonLoader.classList.contains('loading') });
        
        // Always hide skeleton after a delay, whether it was shown or not
        setTimeout(function() {
            if (skeletonLoader.classList.contains('loading')) {
                skeletonLoader.classList.remove('loading');
                console.log('✅ Skeleton loader removed');
            }
        }, 200);
        
        // Show login success toast notification
        if (showSkeleton) {
            setTimeout(function() {
                const username = document.body.dataset.username || 'Admin';
                if (typeof showSuccess === 'function') {
                    showSuccess('Welcome back!', `You have successfully logged in as ${username}`);
                } else if (window.Swal) {
                    window.Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: 'Login Successful',
                        text: `Welcome back!`,
                        toast: true,
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true
                    });
                } else {
                    console.log('✅ Login successful');
                }
            }, 300);
        }
    } catch (error) {
        console.error('❌ Skeleton loader error:', error);
        // Still try to remove the skeleton
        const skeletonLoader = document.querySelector('.skeleton-loader');
        if (skeletonLoader) {
            skeletonLoader.classList.remove('loading');
        }
    }
}

// New Evaluation Detection
class DashboardPoller {
    constructor() {
        this.lastEvalId = null;
        this.isFirstLoad = true;
        this.pollInterval = 5000; // 5 seconds
        this.enabled = true;
    }
    
    start() {
        console.log('🚀 Starting evaluation polling...');
        this.check(); // First check to set baseline
        this.pollTimer = setInterval(() => this.check(), this.pollInterval);
    }
    
    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
    }
    
    check() {
        if (!this.enabled) return;
        
        // Don't poll if we've navigated away from dashboard
        if (!window.location.pathname.includes('/admin/dashboard')) {
            console.log('ℹ️ Not on dashboard page anymore, stopping polling');
            this.stop();
            return;
        }
        
        // Use relative URL - will resolve based on current page location
        const url = `dashboard.php?check_new=1&lastId=${this.lastEvalId || ''}`;
        
        fetch(url, { credentials: 'include' })
            .then(response => {
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(`Expected JSON, got ${contentType || 'no content-type'}`);
                }
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.latest_id) {
                    if (!this.isFirstLoad && data.has_new) {
                        // SSE is handling the notification, polling just refreshes
                        // Only log and reload silently (SSE shows the toast)
                        console.log('🎉 NEW EVALUATION DETECTED (polling)');
                        
                        // Reload after 6 seconds to give SSE time to show notification
                        setTimeout(() => {
                            // Double-check we're still on dashboard before reloading
                            if (window.location.pathname.includes('/admin/dashboard')) {
                                console.log('🔄 Reloading page...');
                                location.reload();
                            }
                        }, 6000);
                    } else if (this.isFirstLoad) {
                        console.log('📌 First load - baseline set');
                        this.isFirstLoad = false;
                    }
                    
                    this.lastEvalId = data.latest_id;
                }
            })
            .catch(error => {
                console.error('Poll error:', error);
                console.error('Response details:', error);
            });
    }
    
    showNotification() {
        // This is now handled by SSE's real-time-notifications.js
        console.log('ℹ️ Notification handled by real-time system, skipping polling notification');
    }
    
    
    updateBadge() {
        const notifBadge = document.getElementById('notif-badge');
        if (notifBadge) {
            let currentCount = parseInt(notifBadge.textContent) || 0;
            notifBadge.textContent = currentCount + 1;
            notifBadge.style.display = 'inline-block';
        }
    }
    
    pause() {
        this.enabled = false;
    }
    
    resume() {
        this.enabled = true;
    }
}

// Initialize Dashboard Poller
let dashboardPoller = null;

// Chart Management
class DashboardCharts {
    constructor() {
        this.charts = {};
    }
    
    initializeStatusChart() {
        const canvas = document.getElementById('evaluationStatusChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const totalEvals = parseInt(canvas.dataset.totalEvals) || 0;
        const totalTeachers = parseInt(canvas.dataset.totalTeachers) || 0;
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    data: [
                        totalEvals,
                        Math.max(0, totalTeachers - totalEvals)
                    ],
                    backgroundColor: ['#00d4ff', '#ffa500'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#000000',
                            font: {
                                size: 13
                            },
                            padding: 15
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    initializeTeacherRatingsChart() {
        const canvas = document.getElementById('teacherRatingsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const ratings = JSON.parse(canvas.dataset.ratings || '[]');
        
        this.charts.ratings = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ratings.map((_, i) => `Teacher ${i + 1}`),
                datasets: [{
                    label: 'Average Rating',
                    data: ratings,
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#000000'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            color: '#000000'
                        },
                        grid: {
                            color: '#e2e8f0'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#000000'
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    destroy() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

let dashboardCharts = null;

// Activity Feed Management
class ActivityFeed {
    constructor() {
        this.container = document.getElementById('activity-feed');
        this.maxItems = 10;
    }
    
    addActivity(title, description, icon = 'bell') {
        if (!this.container) return;
        
        const activityHtml = `
            <div class="activity-item fade-in">
                <div class="activity-icon">
                    <i class="bi bi-${icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${escapeHtml(title)}</div>
                    <div class="activity-time">${this.getRelativeTime(new Date())}</div>
                </div>
            </div>
        `;
        
        this.container.insertAdjacentHTML('afterbegin', activityHtml);
        
        // Remove old items if exceeds max
        const items = this.container.querySelectorAll('.activity-item');
        if (items.length > this.maxItems) {
            items[items.length - 1].remove();
        }
    }
    
    getRelativeTime(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        
        return date.toLocaleDateString();
    }
}

let activityFeed = null;

// Initialize Dashboard on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('🚀 Dashboard initialization starting...');
        
        // Initialize components
        initializeSkeletonLoader();
        console.log('✅ Skeleton loader initialized');
        
        // Initialize charts (safe with error handling)
        try {
            if (typeof DashboardCharts !== 'undefined') {
                dashboardCharts = new DashboardCharts();
                dashboardCharts.initializeStatusChart();
                dashboardCharts.initializeTeacherRatingsChart();
                console.log('✅ Charts initialized');
            } else {
                console.warn('⚠️ DashboardCharts not available');
            }
        } catch (chartError) {
            console.error('❌ Chart initialization error:', chartError);
        }
        
        // Initialize activity feed (safe with error handling)
        try {
            if (typeof ActivityFeed !== 'undefined') {
                activityFeed = new ActivityFeed();
                console.log('✅ Activity feed initialized');
            } else {
                console.warn('⚠️ ActivityFeed not available');
            }
        } catch (feedError) {
            console.error('❌ Activity feed error:', feedError);
        }
        
        // Start polling for new evaluations (safe with error handling)
        try {
            if (typeof DashboardPoller !== 'undefined') {
                dashboardPoller = new DashboardPoller();
                dashboardPoller.start();
                console.log('✅ Polling started');
            } else {
                console.warn('⚠️ DashboardPoller not available');
            }
        } catch (pollerError) {
            console.error('❌ Polling error:', pollerError);
        }
        
        console.log('🎉 Dashboard fully initialized!');
    } catch (error) {
        console.error('🔴 CRITICAL Dashboard initialization error:', error);
        // Don't break the entire page, at least remove skeleton
        const skeletonLoader = document.querySelector('.skeleton-loader');
        if (skeletonLoader && skeletonLoader.classList.contains('loading')) {
            skeletonLoader.classList.remove('loading');
        }
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (dashboardPoller) {
        dashboardPoller.stop();
    }
    if (dashboardCharts) {
        dashboardCharts.destroy();
    }
});

// Pause polling when page is hidden
document.addEventListener('visibilitychange', () => {
    if (!dashboardPoller) return;
    
    if (document.hidden) {
        dashboardPoller.pause();
    } else {
        dashboardPoller.resume();
    }
});
