/**
 * Teachers Page JavaScript
 * Uses new Node.js API backend at http://localhost:3001/api
 */

let teachersTable = null;
const apiService = new APIService();

/**
 * Initialize Teachers Page
 */
function initializeTeachersPage() {
    initializeTeachersTable();
    setupTeacherFilters();
}

/**
 * Initialize DataTable for Teachers
 */
function initializeTeachersTable() {
    const teachersTableElement = document.getElementById('teachersTable');
    if (!teachersTableElement || typeof $ === 'undefined') return;
    
    teachersTable = $('#teachersTable').DataTable({
        processing: true,
        serverSide: true,
        ajax: {
            url: function(data) {
                const page = Math.floor(data.start / data.length) + 1;
                const limit = data.length;
                return `http://localhost:3001/api/teachers?page=${page}&limit=${limit}`;
            },
            type: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'include',
            dataSrc: function(json) {
                if (!json.success) {
                    console.error('Teachers API Error:', json);
                    return [];
                }
                if (json.data && json.data.pagination) {
                    window.teachersPagination = json.data.pagination;
                }
                return json.data.data || [];
            }
        },
        columns: [
            { data: 'first_name', render: function(data, type, row) {
                const initial = (data?.charAt(0) || '?').toUpperCase();
                return `<span class="teacher-avatar">${initial}</span> ${$('<div>').text(data || '').html()}`;
            }},
            { data: 'email', render: function(data) {
                return $('<div>').text(data || '').html();
            }},
            { data: 'department', render: function(data) {
                return `<span class="badge bg-info">${$('<div>').text(data || 'N/A').html()}</span>`;
            }},
            { data: 'status', render: function(data) {
                const badgeClass = data === 'active' ? 'bg-success' : 'bg-warning';
                return `<span class="badge ${badgeClass}">${data || 'N/A'}</span>`;
            }},
            { data: 'id', orderable: false, searchable: false, render: function(data) {
                return `
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary btn-edit-teacher" data-id="${data}" title="Edit">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-outline-danger btn-delete-teacher" data-id="${data}" title="Delete">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                `;
            }}
        ],
        order: [[0, 'asc']],
        pageLength: 10,
        lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
        responsive: true,
        autoWidth: false,
        language: {
            emptyTable: 'No teachers found.',
            loadingRecords: 'Loading teachers...',
            processing: 'Processing...',
            search: '_INPUT_',
            searchPlaceholder: 'Search teachers...',
            info: 'Showing _START_ to _END_ of _TOTAL_ teachers'
        }
    });

    // Setup action button handlers on draw
    teachersTable.on('draw', setupTeacherActionButtons);
}

/**
 * Setup Teacher Action Buttons
 */
function setupTeacherActionButtons() {
    // Edit buttons
    document.querySelectorAll('.btn-edit-teacher').forEach(btn => {
        btn.addEventListener('click', function() {
            const teacherId = this.getAttribute('data-id');
            editTeacher(teacherId);
        });
    });

    // Delete buttons
    document.querySelectorAll('.btn-delete-teacher').forEach(btn => {
        btn.addEventListener('click', function() {
            const teacherId = this.getAttribute('data-id');
            deleteTeacher(teacherId);
        });
    });
}

/**
 * Setup Teacher Filters
 */
function setupTeacherFilters() {
    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', applyTeacherFilters);
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', applyTeacherFilters);
    }
}

/**
 * Apply Teacher Filters
 */
function applyTeacherFilters() {
    if (teachersTable) {
        teachersTable.ajax.reload();
    }
}

/**
 * Edit Teacher
 */
async function editTeacher(teacherId) {
    try {
        const result = await apiService.getTeacher(teacherId);
        if (result.success && result.data) {
            showEditTeacherModal(result.data);
        } else {
            Swal.fire('Error', result.message || 'Failed to load teacher', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'An error occurred while loading the teacher', 'error');
    }
}

/**
 * Show Edit Teacher Modal
 */
function showEditTeacherModal(teacher) {
    const modal = document.getElementById('editTeacherModal');
    if (!modal) return;
    
    // Populate form fields
    document.getElementById('teacherId').value = teacher.id || teacher._id || '';
    document.getElementById('teacherName').value = teacher.first_name || '';
    document.getElementById('teacherEmail').value = teacher.email || '';
    document.getElementById('teacherDepartment').value = teacher.department || '';
    document.getElementById('teacherStatus').value = teacher.status || 'active';
    
    // Show modal
    if (typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

/**
 * Delete Teacher
 */
function deleteTeacher(teacherId) {
    Swal.fire({
        title: 'Delete Teacher?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#667eea',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const deleteResult = await apiService.deleteTeacher(teacherId);
                if (deleteResult.success) {
                    Swal.fire('Deleted', 'Teacher deleted successfully', 'success');
                    if (teachersTable) {
                        teachersTable.ajax.reload();
                    }
                } else {
                    Swal.fire('Error', deleteResult.message || 'Failed to delete teacher', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'An error occurred while deleting the teacher', 'error');
            }
        }
    });
}

/**
 * Save Teacher Changes
 */
async function saveTeacherChanges() {
    const teacherId = document.getElementById('teacherId').value;
    
    const teacherData = {
        first_name: document.getElementById('teacherName').value,
        email: document.getElementById('teacherEmail').value,
        department: document.getElementById('teacherDepartment').value,
        status: document.getElementById('teacherStatus').value
    };
    
    try {
        const result = await apiService.updateTeacher(teacherId, teacherData);
        if (result.success) {
            Swal.fire('Success', 'Teacher updated successfully', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editTeacherModal'));
            if (modal) modal.hide();
            if (teachersTable) {
                teachersTable.ajax.reload();
            }
        } else {
            Swal.fire('Error', result.message || 'Failed to update teacher', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'An error occurred while updating the teacher', 'error');
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', initializeTeachersPage);
