/**
 * Analytics Page JavaScript
 * Specific functionality for admin/analytics.php
 */

// Chart References
let analyticsCharts = {};

// Initialize Analytics Charts
function initializeAnalyticsCharts() {
    // Rating Distribution Chart
    const distributionCanvas = document.getElementById('distributionChart');
    if (distributionCanvas && typeof Chart !== 'undefined') {
        const rating1 = parseInt(distributionCanvas.dataset.rating1) || 0;
        const rating2 = parseInt(distributionCanvas.dataset.rating2) || 0;
        const rating3 = parseInt(distributionCanvas.dataset.rating3) || 0;
        const rating4 = parseInt(distributionCanvas.dataset.rating4) || 0;
        const rating5 = parseInt(distributionCanvas.dataset.rating5) || 0;
        
        const distCtx = distributionCanvas.getContext('2d');
        analyticsCharts.distribution = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                datasets: [{
                    data: [rating1, rating2, rating3, rating4, rating5],
                    backgroundColor: [
                        '#ef4444', // Red for 1 star
                        '#f97316', // Orange for 2 stars
                        '#eab308', // Yellow for 3 stars
                        '#84cc16', // Lime for 4 stars
                        '#22c55e'  // Green for 5 stars
                    ],
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
                            font: { size: 13 },
                            padding: 15
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    // Trends Chart
    const trendsCanvas = document.getElementById('trendsChart');
    if (trendsCanvas && typeof Chart !== 'undefined') {
        const labels = JSON.parse(trendsCanvas.dataset.labels || '[]');
        const values = JSON.parse(trendsCanvas.dataset.values || '[]');
        
        const trendsCtx = trendsCanvas.getContext('2d');
        analyticsCharts.trends = new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Evaluations per Day',
                    data: values,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#000000'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#000000',
                            stepSize: 1
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
}

// Filter Analytics Data
function filterAnalyticsData() {
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const department = document.getElementById('departmentFilter')?.value;
    
    if (startDate || endDate || department) {
        // Trigger data reload via AJAX
        loadAnalyticsData({ startDate, endDate, department });
    }
}

// Load Analytics Data via AJAX
function loadAnalyticsData(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const url = `/teacher-eval/admin/analytics.php?load_data=1&${queryString}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update charts with new data
                updateAnalyticsCharts(data);
                showSuccess('Analytics Updated', 'Data refreshed successfully', 2000);
            } else {
                showError('Error', data.message || 'Failed to load analytics data');
            }
        })
        .catch(error => {
            console.error('Analytics load error:', error);
            showError('Error', 'Failed to load analytics data');
        });
}

// Update Charts with New Data
function updateAnalyticsCharts(data) {
    if (analyticsCharts.status && data.status) {
        analyticsCharts.status.data.datasets[0].data = data.status;
        analyticsCharts.status.update();
    }
    
    if (analyticsCharts.timeSeries && data.timeSeries) {
        analyticsCharts.timeSeries.data.labels = data.timeSeriesLabels;
        analyticsCharts.timeSeries.data.datasets[0].data = data.timeSeries;
        analyticsCharts.timeSeries.update();
    }
    
    if (analyticsCharts.department && data.department) {
        analyticsCharts.department.data.labels = data.departmentLabels;
        analyticsCharts.department.data.datasets[0].data = data.department;
        analyticsCharts.department.update();
    }
}

// Export Analytics
function exportAnalytics() {
    const format = document.getElementById('exportFormat')?.value || 'pdf';
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const department = document.getElementById('departmentFilter')?.value;
    
    const queryString = new URLSearchParams({
        export: format,
        startDate: startDate || '',
        endDate: endDate || '',
        department: department || ''
    }).toString();
    
    window.location.href = `/teacher-eval/admin/analytics.php?${queryString}`;
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initializeAnalyticsCharts();
    
    // Setup filter event listeners
    const filterElements = [
        'startDate', 'endDate', 'departmentFilter'
    ];
    
    filterElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', filterAnalyticsData);
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    Object.values(analyticsCharts).forEach(chart => {
        if (chart) chart.destroy();
    });
});
