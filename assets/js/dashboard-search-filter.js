/**
 * Admin Dashboard Search & Filter
 * Real-time filtering and sorting of evaluations table
 */

class DashboardSearchFilter {
    constructor() {
        this.filters = {
            search: '',
            rating: '',
            dateFrom: '',
            dateTo: '',
            sort: 'newest'
        };
        
        this.allData = [];
        this.filteredData = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadData();
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('evaluations-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Rating filter
        const ratingFilter = document.getElementById('rating-filter');
        if (ratingFilter) {
            ratingFilter.addEventListener('change', (e) => {
                this.filters.rating = e.target.value;
                this.applyFilters();
            });
        }

        // Date range
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        if (dateFrom) {
            dateFrom.addEventListener('change', (e) => {
                this.filters.dateFrom = e.target.value;
                this.applyFilters();
            });
        }
        if (dateTo) {
            dateTo.addEventListener('change', (e) => {
                this.filters.dateTo = e.target.value;
                this.applyFilters();
            });
        }

        // Sort
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.applySorting();
                this.renderTable();
            });
        }

        // Clear filters button
        const clearBtn = document.getElementById('clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    async loadData() {
        try {
            // Load evaluations data from API or existing table
            const tableBody = document.getElementById('evaluations-table-body');
            if (!tableBody) return;

            const rows = tableBody.querySelectorAll('tr');
            this.allData = Array.from(rows).map(row => {
                const cells = row.querySelectorAll('td');
                return {
                    element: row,
                    teacher: cells[0]?.textContent.trim() || '',
                    rating: parseInt(cells[1]?.textContent.trim()) || 0,
                    date: cells[2]?.textContent.trim() || '',
                    department: cells[3]?.textContent.trim() || '',
                    feedback: cells[4]?.textContent.trim() || ''
                };
            });

            this.filteredData = [...this.allData];
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    applyFilters() {
        this.filteredData = this.allData.filter(item => {
            // Search filter
            if (this.filters.search) {
                const searchMatch = item.teacher.toLowerCase().includes(this.filters.search) ||
                                  item.department.toLowerCase().includes(this.filters.search) ||
                                  item.feedback.toLowerCase().includes(this.filters.search);
                if (!searchMatch) return false;
            }

            // Rating filter
            if (this.filters.rating) {
                const ratingVal = parseInt(this.filters.rating);
                if (ratingVal === 5 && item.rating !== 5) return false; // 5 stars only
                if (ratingVal === 4 && item.rating < 4) return false; // 4+ stars
                if (ratingVal === 3 && item.rating < 3) return false; // 3+ stars
                if (ratingVal === 2 && item.rating < 2) return false; // 2+ stars
            }

            // Date range filter
            if (this.filters.dateFrom || this.filters.dateTo) {
                const itemDate = new Date(item.date);
                if (this.filters.dateFrom) {
                    const fromDate = new Date(this.filters.dateFrom);
                    if (itemDate < fromDate) return false;
                }
                if (this.filters.dateTo) {
                    const toDate = new Date(this.filters.dateTo);
                    if (itemDate > toDate) return false;
                }
            }

            return true;
        });

        this.applySorting();
        this.renderTable();
        this.updateFilterCount();
    }

    applySorting() {
        switch (this.filters.sort) {
            case 'newest':
                this.filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'oldest':
                this.filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'highest':
                this.filteredData.sort((a, b) => b.rating - a.rating);
                break;
            case 'lowest':
                this.filteredData.sort((a, b) => a.rating - b.rating);
                break;
            case 'a-z':
                this.filteredData.sort((a, b) => a.teacher.localeCompare(b.teacher));
                break;
            case 'z-a':
                this.filteredData.sort((a, b) => b.teacher.localeCompare(a.teacher));
                break;
        }
    }

    renderTable() {
        const tableBody = document.getElementById('evaluations-table-body');
        if (!tableBody) return;

        // Hide all rows
        this.allData.forEach(item => item.element.style.display = 'none');

        // Show filtered rows
        this.filteredData.forEach(item => {
            item.element.style.display = '';
        });

        // Show message if no results
        if (this.filteredData.length === 0) {
            const noResults = tableBody.querySelector('.no-results');
            if (noResults) {
                noResults.style.display = '';
            } else {
                const tr = document.createElement('tr');
                tr.className = 'no-results';
                tr.innerHTML = '<td colspan="100" style="text-align: center; padding: 30px; color: #cbd5e1;">No evaluations found</td>';
                tableBody.appendChild(tr);
            }
        } else {
            const noResults = tableBody.querySelector('.no-results');
            if (noResults) noResults.style.display = 'none';
        }
    }

    updateFilterCount() {
        const badge = document.getElementById('filter-count-badge');
        if (badge) {
            const count = this.allData.length - this.filteredData.length;
            badge.textContent = count > 0 ? `${count} hidden` : '';
            badge.style.display = count > 0 ? '' : 'none';
        }
    }

    clearFilters() {
        this.filters = {
            search: '',
            rating: '',
            dateFrom: '',
            dateTo: '',
            sort: 'newest'
        };

        // Reset UI
        const searchInput = document.getElementById('evaluations-search');
        if (searchInput) searchInput.value = '';

        const ratingFilter = document.getElementById('rating-filter');
        if (ratingFilter) ratingFilter.value = '';

        const dateFrom = document.getElementById('date-from');
        if (dateFrom) dateFrom.value = '';

        const dateTo = document.getElementById('date-to');
        if (dateTo) dateTo.value = '';

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) sortSelect.value = 'newest';

        this.filteredData = [...this.allData];
        this.renderTable();
        this.updateFilterCount();

        if (window.toast) {
            window.toast.success('Filters Cleared', 'All filters have been reset');
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardSearchFilter = new DashboardSearchFilter();
});
