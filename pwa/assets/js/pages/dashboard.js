/**
 * Dashboard Page JavaScript
 * Specific functionality for admin/dashboard.php
 */

// Skeleton Loader Management
function initializeSkeletonLoader() {
    const skeletonLoader = document.querySelector('.skeleton-loader');
    const showSkeleton = skeletonLoader && skeletonLoader.getAttribute('data-show-skeleton') === 'true';
    
    if (showSkeleton && skeletonLoader.classList.contains('loading')) {
        // Hide skeleton after 500ms for visual effect
        setTimeout(function() {
            skeletonLoader.classList.remove('loading');
        }, 500);
    }
    
    // Show login success toast notification
    if (showSkeleton) {
        setTimeout(function() {
            const username = document.body.dataset.username || 'Admin';
            showSuccess('Welcome back!', `You have successfully logged in as ${username}`);
        }, 300);
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
        
        const url = `/teacher-eval/admin/dashboard.php?check_new=1&lastId=${this.lastEvalId || ''}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.latest_id) {
                    if (!this.isFirstLoad && data.has_new) {
                        console.log('🎉 NEW EVALUATION DETECTED!');
                        this.showNotification();
                        
                        // Update notification badge
                        this.updateBadge();
                        
                        // Reload after 5.5 seconds
                        setTimeout(() => {
                            console.log('🔄 Reloading page...');
                            location.reload();
                        }, 5500);
                    } else if (this.isFirstLoad) {
                        console.log('📌 First load - baseline set');
                        this.isFirstLoad = false;
                    }
                    
                    this.lastEvalId = data.latest_id;
                }
            })
            .catch(error => console.error('Poll error:', error));
    }
    
    showNotification() {
        if (typeof window.showToast === 'function') {
            window.showToast('📊 New evaluation submitted!', 'success', 5000);
        } else if (window.Swal) {
            window.Swal.fire({
                position: 'top-end',
                icon: 'success',
                title: 'New Evaluation',
                text: '📊 New evaluation submitted!',
                timer: 5000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        } else {
            console.log('📊 New evaluation submitted!');
        }
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
    // Initialize components
    initializeSkeletonLoader();
    
    // Initialize charts
    dashboardCharts = new DashboardCharts();
    dashboardCharts.initializeStatusChart();
    dashboardCharts.initializeTeacherRatingsChart();
    
    // Initialize activity feed
    activityFeed = new ActivityFeed();
    
    // Start polling for new evaluations
    dashboardPoller = new DashboardPoller();
    dashboardPoller.start();
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
