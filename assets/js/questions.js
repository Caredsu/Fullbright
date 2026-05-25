/**
 * Questions Management
 */

let questionsTable;

// Function to get CSRF token
function getCSRFToken() {
    return document.querySelector('input[name="csrf_token"]')?.value || '';
}

// Initialize DataTable on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeQuestionsTable();
    setupFormHandlers();
});

/**
 * Initialize Questions Page (called from PHP)
 */
function initializeQuestionsPage() {
    initializeQuestionsTable();
    setupFormHandlers();
}

/**
 * Initialize Questions DataTable
 */
function initializeQuestionsTable() {
    questionsTable = $('#questionsTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: function(data) {
                // Build URL with pagination parameters for Node.js API
                const page = Math.floor(data.start / data.length) + 1;
                const limit = data.length;
                return `http://localhost:3001/api/questions?page=${page}&limit=${limit}`;
            },
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            dataSrc: function(json) {
                if (!json.success) {
                    console.error('Questions API Error:', json);
                    return [];
                }
                // Store pagination info
                if (json.data && json.data.pagination) {
                    window.questionsPagination = json.data.pagination;
                }
                return json.data.data || [];
            }
        },
        columns: [
            { data: 'text', name: 'text', width: '40%', render: function(data) {
                return $('<div>').text(data).html(); // Escape HTML
            }},
            { data: 'category', name: 'category', width: '15%' },
            { data: 'type', name: 'type', width: '12%' },
            { data: 'created_at', name: 'created_at', width: '15%', render: function(data) {
                return data ? new Date(data).toLocaleDateString() : '-';
            }},
            { data: 'id', name: 'id', width: '18%', orderable: false, searchable: false, render: function(data) {
                return `
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary btn-edit-question" data-id="${data}" title="Edit">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-delete-question" data-id="${data}" title="Delete">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                `;
            }}
        ],
        order: [[3, 'desc']],
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
        responsive: true,
        autoWidth: false,
        drawCallback: function() {
            // Update DataTables recordsTotal with actual server count
            if (window.questionsPagination) {
                const info = this.api().page.info();
                info.recordsTotal = window.questionsPagination.total;
                info.recordsFiltered = window.questionsPagination.total;
            }
        },
        language: {
            emptyTable: 'No questions found. Click "Add New Question" to create one.',
            loadingRecords: 'Loading questions...',
            processing: 'Processing...',
            search: '_INPUT_',
            searchPlaceholder: 'Search questions...',
            info: 'Showing _START_ to _END_ of _TOTAL_ questions',
            infoEmpty: 'No questions to display',
            paginate: {
                first: 'First',
                last: 'Last',
                next: 'Next',
                previous: 'Previous'
            }
        }
    });

    // Reinitialize on each draw
    questionsTable.on('draw', function() {
        setupActionButtons();
    });
}

/**
 * Setup action buttons
 */
function setupActionButtons() {
    // Edit buttons
    document.querySelectorAll('.btn-edit-question').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const questionId = this.getAttribute('data-id');
            editQuestion(questionId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete-question').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const questionId = this.getAttribute('data-id');
            deleteQuestion(questionId);
        });
    });
}

/**
 * Open modal for adding new question
 */
function openQuestionModal() {
    // Reset form
    const questionForm = document.getElementById('questionForm');
    if (questionForm) {
        questionForm.reset();
    }
    document.getElementById('questionIdInput').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Question';
    document.getElementById('question_type').value = 'rating';
    
    // Show modal using Bootstrap 5
    const modal = new bootstrap.Modal(document.getElementById('questionModal'));
    modal.show();
}

/**
 * Edit existing question
 */
function editQuestion(questionId) {
    // Create a global API service instance if not exists
    window.apiService = window.apiService || new APIService();
    
    // Fetch question data from Node.js backend
    window.apiService.getQuestion(questionId)
        .then(result => {
            if (result.success && result.data) {
                const question = result.data;
                // Populate form
                document.getElementById('questionIdInput').value = question.id || '';
                document.getElementById('question_text').value = question.text || '';
                document.getElementById('question_category').value = question.category || 'General';
                document.getElementById('question_type').value = question.type || 'rating';
                document.getElementById('ajaxActionInput').value = 'update_question';
                document.getElementById('modalTitle').textContent = 'Edit Question';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('questionModal'));
                modal.show();
            } else {
                Swal.fire('Error', result.message || 'Failed to load question details', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            Swal.fire('Error', 'An error occurred while loading the question', 'error');
        });
}

/**
 * Delete question
 */
function deleteQuestion(questionId) {
    Swal.fire({
        title: 'Delete Question?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#667eea',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            window.apiService = window.apiService || new APIService();
            
            window.apiService.deleteQuestion(questionId)
                .then(result => {
                    if (result.success) {
                        Swal.fire('Deleted', 'Question deleted successfully', 'success');
                        questionsTable.ajax.reload();
                    } else {
                        Swal.fire('Error', result.message || 'Failed to delete question', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire('Error', 'An error occurred while deleting the question', 'error');
                });
        }
    });
}

/**
 * Setup form handlers
 */
function setupFormHandlers() {
    const questionForm = document.getElementById('questionForm');
    
    if (questionForm) {
        questionForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            window.apiService = window.apiService || new APIService();
            
            const questionId = document.getElementById('questionIdInput').value;
            const questionData = {
                text: document.getElementById('question_text').value,
                category: document.getElementById('question_category').value,
                type: document.getElementById('question_type')?.value || 'rating',
                options: []
            };
            
            try {
                let result;
                if (questionId) {
                    // Update existing question
                    result = await window.apiService.updateQuestion(questionId, questionData);
                } else {
                    // Create new question
                    result = await window.apiService.createQuestion(questionData);
                }
                
                if (result.success) {
                    Swal.fire('Success', result.message || 'Question saved successfully', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('questionModal'));
                    if (modal) modal.hide();
                    questionForm.reset();
                    questionsTable.ajax.reload();
                } else {
                    Swal.fire('Error', result.message || 'Failed to save question', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'An error occurred while saving the question', 'error');
            }
        });
    }
}

/**
 * Reload questions table
 */
function reloadQuestionsTable() {
    if (questionsTable) {
        questionsTable.ajax.reload();
    }
}
