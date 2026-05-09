/**
 * Questions Page JavaScript
 * Specific functionality for admin/questions.php
 */

let questionsTable = null;
let questionModal = null;

// Initialize Questions Page
function initializeQuestionsPage() {
    // Initialize modal first
    const modalElement = document.getElementById('questionModal');
    if (modalElement) {
        questionModal = new bootstrap.Modal(modalElement, {});
    }
    
    initializeQuestionsTable();
    bindFormEvents();
}

// Initialize DataTable for Questions
function initializeQuestionsTable() {
    const questionTableElement = document.getElementById('questionsTable');
    if (!questionTableElement || typeof $ === 'undefined') return;
    
    questionsTable = $('#questionsTable').DataTable({
        processing: true,
        serverSide: false,
        columns: [
            { data: 'question_text', title: 'Question' },
            { data: 'question_order', title: 'Order' },
            {
                data: 'status',
                title: 'Status',
                render: function(data) {
                    if (!data) return '<span class="status-badge">N/A</span>';
                    const statusClass = data === 'active' ? 'status-active' : 'status-inactive';
                    return `<span class="status-badge ${statusClass}">${data.toUpperCase()}</span>`;
                }
            },
            {
                data: 'id',
                title: 'Actions',
                orderable: false,
                render: function(data) {
                    return `<div class="action-buttons">
                        <button class="btn btn-icon editBtn" data-question-id="${data}" data-bs-toggle="tooltip" data-bs-title="Edit">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-icon deleteBtn" data-question-id="${data}" data-bs-toggle="tooltip" data-bs-title="Delete">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </div>`;
                }
            }
        ],
        order: [[1, 'asc']],
        pageLength: 10,
        language: {
            emptyTable: "No questions found"
        }
    });
    
    loadQuestions();
}

// Load Questions from API
function loadQuestions() {
    api.getQuestions()
        .then(response => {
            if (response.success) {
                let data = response.data;
                if (data && data.data && Array.isArray(data.data)) {
                    data = data.data;
                } else if (!Array.isArray(data)) {
                    data = [];
                }
                
                questionsTable.clear().rows.add(data).draw();
                attachRowEventHandlers();
                initializeTooltips();
            } else {
                showError('Failed to load questions');
            }
        })
        .catch(error => {
            console.error('Error loading questions:', error);
            showError('Error loading questions: ' + error.message);
        });
}

// Attach row event handlers
function attachRowEventHandlers() {
    $('#questionsTable tbody').off('click');
    
    $('#questionsTable tbody').on('click', '.editBtn', function() {
        const questionId = $(this).data('question-id');
        editQuestion(questionId);
    });
    
    $('#questionsTable tbody').on('click', '.deleteBtn', function() {
        const questionId = $(this).data('question-id');
        deleteQuestion(questionId);
    });
}

// Initialize tooltips
function initializeTooltips() {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipTriggerEl => {
        const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
    });
    
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Bind Form Events
function bindFormEvents() {
    const form = document.getElementById('questionForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitQuestion();
    });
}

// Open Question Modal
function openQuestionModal() {
    document.getElementById('questionForm').reset();
    delete document.getElementById('questionForm').dataset.questionId;
    document.getElementById('modalTitle').textContent = 'Add New Question';
    document.getElementById('display_order').value = '';
    document.getElementById('required').checked = false;
    document.getElementById('status').value = 'active';
    if (questionModal) {
        questionModal.show();
    }
}

// Submit Question (Add or Edit)
function submitQuestion() {
    const form = document.getElementById('questionForm');
    const questionId = form.dataset.questionId;
    const isEditing = !!questionId;
    
    const questionText = document.getElementById('question_text').value.trim();
    
    if (!questionText) {
        showError('Question text is required');
        return;
    }
    
    const data = {
        question_text: questionText,
        required: document.getElementById('required').checked ? 1 : 0,
        status: document.getElementById('status').value
    };
    
    if (isEditing) {
        api.updateQuestion(questionId, data)
            .then(response => {
                if (response.success) {
                    showSuccess(response.message || 'Question updated successfully');
                    if (questionModal) {
                        questionModal.hide();
                    }
                    loadQuestions();
                } else {
                    showError(response.message || 'Failed to update question');
                }
            })
            .catch(error => showError('Error: ' + error.message));
    } else {
        api.createQuestion(data)
            .then(response => {
                if (response.success) {
                    showSuccess(response.message || 'Question created successfully');
                    if (questionModal) {
                        questionModal.hide();
                    }
                    loadQuestions();
                } else {
                    showError(response.message || 'Failed to create question');
                }
            })
            .catch(error => showError('Error: ' + error.message));
    }
}

// Edit Question
function editQuestion(questionId) {
    api.getQuestion(questionId)
        .then(response => {
            if (response.success && response.data) {
                const question = response.data;
                document.getElementById('question_text').value = question.question_text || '';
                document.getElementById('display_order').value = question.question_order || '';
                document.getElementById('required').checked = question.required == 1;
                document.getElementById('status').value = question.status || 'active';
                
                document.getElementById('questionForm').dataset.questionId = questionId;
                document.getElementById('modalTitle').textContent = 'Edit Question';
                if (questionModal) {
                    questionModal.show();
                }
            } else {
                showError('Failed to load question');
            }
        })
        .catch(error => showError('Error: ' + error.message));
}

// Delete Question
function deleteQuestion(questionId) {
    Swal.fire({
        title: 'Delete Question?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
    }).then(result => {
        if (result.isConfirmed) {
            api.deleteQuestion(questionId)
                .then(response => {
                    if (response.success) {
                        showSuccess(response.message || 'Question deleted successfully');
                        loadQuestions();
                    } else {
                        showError(response.message || 'Failed to delete question');
                    }
                })
                .catch(error => showError('Error: ' + error.message));
        }
    });
}

// Print Questions Table
function printQuestionsTable() {
    const printWindow = window.open('', '', 'height=600,width=800');
    let html = '<html><head><title>Questions Report</title>';
    html += '<style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background-color:#f2f2f2;}</style>';
    html += '</head><body><h2>Evaluation Questions</h2>';
    html += '<table><thead><tr><th>Question</th><th>Order</th><th>Status</th></tr></thead><tbody>';
    
    questionsTable.$('tr').each(function() {
        const cells = $(this).find('td');
        if (cells.length > 0) {
            html += '<tr>';
            html += '<td>' + cells.eq(0).text() + '</td>';
            html += '<td>' + cells.eq(1).text() + '</td>';
            html += '<td>' + cells.eq(2).text() + '</td>';
            html += '</tr>';
        }
    });
    
    html += '</tbody></table></body></html>';
    printWindow.document.write(html);
    printWindow.print();
}

// UI Helper Functions
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Success',
        text: message,
        timer: 2000,
        showConfirmButton: false
    });
}

function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        timer: 3000,
        showConfirmButton: false
    });
}
