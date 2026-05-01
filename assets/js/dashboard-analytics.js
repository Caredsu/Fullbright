/**
 * Admin Dashboard Analytics
 * Handles data fetching, charts, and summary cards
 */

class DashboardAnalytics {
    constructor() {
        this.charts = {};
        this.data = null;
        this.init();
    }

    async init() {
        console.log('📊 Initializing analytics dashboard...');
        await this.loadSummary();
        await this.loadCharts();
    }

    async loadSummary() {
        try {
            const response = await fetch('/api/analytics.php?type=summary');
            const result = await response.json();
            
            if (result.success) {
                this.data = result.data;
                this.renderSummaryCards(result.data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    renderSummaryCards(data) {
        const container = document.getElementById('analytics-cards');
        if (!container) return;
        
        container.innerHTML = `
            <div class="row g-3">
                <div class="col-md-6 col-lg-3">
                    <div class="analytics-card">
                        <div class="card-icon">📊</div>
                        <div class="card-content">
                            <div class="card-label">Total Evaluations</div>
                            <div class="card-value">${data.total_evaluations}</div>
                            <div class="card-subtitle">${data.recent_30days} in last 30 days</div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-3">
                    <div class="analytics-card">
                        <div class="card-icon">⭐</div>
                        <div class="card-content">
                            <div class="card-label">Average Rating</div>
                            <div class="card-value">${data.average_rating.toFixed(2)}/5</div>
                            <div class="card-subtitle">Based on all evaluations</div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-3">
                    <div class="analytics-card">
                        <div class="card-icon">👥</div>
                        <div class="card-content">
                            <div class="card-label">Teachers</div>
                            <div class="card-value">${data.total_teachers}</div>
                            <div class="card-subtitle">In system</div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 col-lg-3">
                    <div class="analytics-card">
                        <div class="card-icon">✅</div>
                        <div class="card-content">
                            <div class="card-label">Completion Rate</div>
                            <div class="card-value">${data.completion_rate}%</div>
                            <div class="card-subtitle">Teachers evaluated</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadCharts() {
        await this.loadRatingsChart();
        await this.loadTimelineChart();
    }

    async loadRatingsChart() {
        try {
            const response = await fetch('/api/analytics.php?type=ratings_distribution');
            const result = await response.json();
            
            if (result.success && document.getElementById('ratingsChart')) {
                const ctx = document.getElementById('ratingsChart').getContext('2d');
                
                this.charts.ratings = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['⭐ 1-Star', '⭐⭐ 2-Star', '⭐⭐⭐ 3-Star', '⭐⭐⭐⭐ 4-Star', '⭐⭐⭐⭐⭐ 5-Star'],
                        datasets: [{
                            data: [
                                result.data['1'],
                                result.data['2'],
                                result.data['3'],
                                result.data['4'],
                                result.data['5']
                            ],
                            backgroundColor: [
                                '#ef4444', // red
                                '#f97316', // orange
                                '#eab308', // yellow
                                '#22c55e', // green
                                '#3b82f6'  // blue
                            ],
                            borderColor: 'rgba(30, 41, 59, 0.1)',
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
                                    color: '#cbd5e1',
                                    font: { size: 12 }
                                }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading ratings chart:', error);
        }
    }

    async loadTimelineChart() {
        try {
            const response = await fetch('/api/analytics.php?type=timeline');
            const result = await response.json();
            
            if (result.success && document.getElementById('timelineChart')) {
                const dates = Object.keys(result.data).sort();
                const counts = dates.map(d => result.data[d]);
                
                const ctx = document.getElementById('timelineChart').getContext('2d');
                
                this.charts.timeline = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Evaluations',
                            data: counts,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#3b82f6',
                            pointBorderColor: '#1e293b',
                            pointBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                labels: {
                                    color: '#cbd5e1',
                                    font: { size: 12 }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(30, 41, 59, 0.2)' },
                                ticks: { color: '#cbd5e1' }
                            },
                            x: {
                                grid: { color: 'rgba(30, 41, 59, 0.2)' },
                                ticks: { color: '#cbd5e1' }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading timeline chart:', error);
        }
    }

    async exportPDF() {
        try {
            window.open('/api/export-pdf.php?type=analytics', '_blank');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            if (window.toast) {
                window.toast.error('Export Failed', 'Could not export report');
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardAnalytics = new DashboardAnalytics();
});
