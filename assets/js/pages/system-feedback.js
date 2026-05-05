/**
 * System Feedback Page JavaScript
 * Specific functionality for admin/system-feedback.php
 */

// System Feedback DataTable
let feedbackTable = null;

// Initialize System Feedback Page
function initializeSystemFeedbackPage() {
    initializeFeedbackTable();
    setupFeedbackFilters();
}

// Initialize DataTable for Feedback
function initializeFeedbackTable() {
    const feedbackTableElement = document.getElementById('feedbackTable');
    if (!feedbackTableElement || typeof $ === 'undefined') return;
    
    feedbackTable = $('#feedbackTable').DataTable({
        responsive: true,
        paging: true,
        pageLength: 10,
        ordering: true,
        searching: true,
        language: {
            search: 'Filter feedback:',
            lengthMenu: 'Show _MENU_ items per page',
            info: 'Showing _START_ to _END_ of _TOTAL_ items'
        },
        dom: '<"row"<"col-md-6"l><"col-md-6"f>>t<"row"<"col-md-6"i><"col-md-6"p>>'
    });
}

// Setup Feedback Filters
function setupFeedbackFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFeedbackFilters);
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFeedbackFilters);
    }
}

// Apply Feedback Filters
function applyFeedbackFilters() {
    const category = document.getElementById('categoryFilter')?.value;
    const status = document.getElementById('statusFilter')?.value;
    
    const filters = {
        category: category || '',
        status: status || ''
    };
    
    loadFeedbackData(filters);
}

// Load Feedback Data
function loadFeedbackData(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    // Use relative path that works from any admin page
    const url = `../api/system-feedback.php?load_data=1&${queryString}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success && feedbackTable) {
                feedbackTable.clear();
                if (Array.isArray(data.feedback)) {
                    data.feedback.forEach(item => {
                        const categoryClass = `feedback-category-badge feedback-category-${item.category}`;
                        const categoryBadge = `<span class="${categoryClass}">${item.category}</span>`;
                        
                        const statusClass = `feedback-status-${item.status}`;
                        const statusBadge = `<span class="${statusClass}">${item.status}</span>`;
                        
                        feedbackTable.row.add([
                            escapeHtml(item.subject || 'No Subject'),
                            categoryBadge,
                            statusBadge,
                            escapeHtml(item.submitted_date || 'N/A'),
                            `<button class="btn btn-sm btn-outline-primary" onclick="viewFeedback(${item.id})">View</button>
                             <button class="btn btn-sm btn-outline-secondary" onclick="markAsResolved(${item.id})">Resolve</button>`
                        ]);
                    });
                }
                feedbackTable.draw();
            }
        })
        .catch(error => {
            console.error('Error loading feedback:', error);
        });
}

// View Feedback Details
function viewFeedback(feedbackId) {
    fetch(`../api/system-feedback.php?id=${feedbackId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showFeedbackModal(data.feedback);
            }
        });
}

// Show Feedback Modal
function showFeedbackModal(feedback) {
    const modal = document.getElementById('feedbackDetailsModal');
    if (!modal) return;
    
    const content = document.querySelector('.modal-body');
    if (content) {
        const categoryClass = `feedback-category-badge feedback-category-${feedback.category}`;
        const statusClass = `feedback-status-${feedback.status}`;
        
        let html = `
            <div class="feedback-details-section">
                <div class="feedback-details-label">Category</div>
                <div class="feedback-details-value"><span class="${categoryClass}">${escapeHtml(feedback.category)}</span></div>
            </div>
            <div class="feedback-details-section">
                <div class="feedback-details-label">Status</div>
                <div class="feedback-details-value"><span class="${statusClass}">${escapeHtml(feedback.status)}</span></div>
            </div>
            <div class="feedback-details-section">
                <div class="feedback-details-label">Subject</div>
                <div class="feedback-details-value">${escapeHtml(feedback.subject)}</div>
            </div>
            <div class="feedback-details-section">
                <div class="feedback-details-label">Message</div>
                <div class="feedback-details-value">${escapeHtml(feedback.message)}</div>
            </div>
            <div class="feedback-details-section">
                <div class="feedback-details-label">Submitted By</div>
                <div class="feedback-details-value">${escapeHtml(feedback.submitted_by || 'Anonymous')}</div>
            </div>
            <div class="feedback-details-section">
                <div class="feedback-details-label">Submitted Date</div>
                <div class="feedback-details-value">${escapeHtml(feedback.submitted_date)}</div>
            </div>
        `;
        
        if (feedback.response) {
            html += `
                <div class="feedback-details-section">
                    <div class="feedback-details-label">Admin Response</div>
                    <div class="feedback-details-value">${escapeHtml(feedback.response)}</div>
                </div>
            `;
        }
        
        content.innerHTML = html;
    }
    
    // Show modal
    if (typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Mark Feedback as Resolved
function markAsResolved(feedbackId) {
    fetch(`../api/system-feedback.php?id=${feedbackId}&action=resolve`, {
        method: 'PUT'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccess('Feedback Resolved', 'Feedback has been marked as resolved');
            if (feedbackTable) {
                feedbackTable.ajax.reload();
            }
        } else {
            showError('Error', data.message || 'Failed to resolve feedback');
        }
    });
}

// Delete Feedback
function deleteFeedback(feedbackId) {
    showConfirm('Delete Feedback', 'Are you sure you want to delete this feedback?', () => {
        fetch(`../api/system-feedback.php?id=${feedbackId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess('Feedback Deleted', 'Feedback has been deleted successfully');
                if (feedbackTable) {
                    feedbackTable.ajax.reload();
                }
            } else {
                showError('Error', data.message || 'Failed to delete feedback');
            }
        });
    });
}

// Export Feedback
function exportFeedback() {
    const format = document.getElementById('exportFormat')?.value || 'csv';
    // Use relative path for export
    window.location.href = `system-feedback.php?export=${format}`;
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', initializeSystemFeedbackPage);
