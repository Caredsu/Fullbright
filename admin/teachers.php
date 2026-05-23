<?php
/**
 * Teachers Management - Admin Console
 * Uses new API endpoints instead of direct database queries
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

initializeSession();
requireLogin();
requirePermission('manage_teachers');

// Constants for validation
const ALLOWED_DEPARTMENTS = ['ECT', 'EDUC', 'CCJE', 'BHT'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teachers - Teacher Evaluation System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/teachers.css">
</head>
<body>
    <!-- Navbar -->
    <?php include '../includes/navbar.php'; ?>
    
    <!-- Skeleton Loader -->
    <div class="skeleton-loader loading" data-show-skeleton="true">
        <div class="container-fluid py-5">
            <div class="row mb-4">
                <div class="col-md-6">
                    <div style="height: 30px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px; margin-bottom: 10px;"></div>
                    <div style="height: 16px; width: 60%; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px;"></div>
                </div>
            </div>
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <div style="height: 40px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px; margin-bottom: 15px;"></div>
                    <div style="height: 300px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px;"></div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Main Content Wrapper -->
    <div class="content-loader">
        <div class="container-fluid py-5">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h1 class="h2"><i class="bi bi-people"></i> Teachers Management</h1>
                    <p class="text-muted">Manage teacher information and assignments</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-outline-secondary me-2" onclick="printTeachersTable()">
                        <i class="bi bi-printer"></i> Print
                    </button>
                    <button class="btn btn-primary btn-lg" onclick="openTeacherModal()">
                        <i class="bi bi-plus-circle"></i> Add New Teacher
                    </button>
                </div>
            </div>

            <!-- Teachers Table -->
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-light">
                    <h5 class="mb-0">All Teachers</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="teachersTable" class="table table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Full Name</th>
                                    <th>Department</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Last Updated</th>
                                    <th>Updated By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Teacher Modal -->
    <div class="modal fade" id="teacherModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalTitle">Add New Teacher</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="teacherForm">
                    <div class="modal-body">
                        <!-- First Name -->
                        <div class="mb-3">
                            <label for="first_name" class="form-label">First Name *</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="first_name" 
                                name="first_name"
                                placeholder="e.g., John"
                                minlength="2"
                                required
                            >
                        </div>

                        <!-- Middle Name -->
                        <div class="mb-3">
                            <label for="middle_name" class="form-label">Middle Name</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="middle_name" 
                                name="middle_name"
                                placeholder="e.g., Carlos"
                            >
                        </div>

                        <!-- Last Name -->
                        <div class="mb-3">
                            <label for="last_name" class="form-label">Last Name *</label>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="last_name" 
                                name="last_name"
                                placeholder="e.g., Dela Cruz"
                                minlength="2"
                                required
                            >
                        </div>

                        <!-- Department -->
                        <div class="mb-3">
                            <label for="department" class="form-label">Department *</label>
                            <select class="form-select" id="department" name="department" required>
                                <option value="">-- Select Department --</option>
                                <?php foreach (ALLOWED_DEPARTMENTS as $dept): ?>
                                    <option value="<?= escapeOutput($dept) ?>">
                                        <?= escapeOutput($dept) ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <!-- Email -->
                        <div class="mb-3">
                            <label for="email" class="form-label">Email</label>
                            <input 
                                type="email" 
                                class="form-control" 
                                id="email" 
                                name="email"
                                placeholder="e.g., john@school.edu"
                            >
                        </div>

                        <!-- Status -->
                        <div class="mb-3">
                            <label for="status" class="form-label">Status</label>
                            <select class="form-select" id="status" name="status">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <!-- Picture Upload -->
                        <div class="mb-3">
                            <label for="picture" class="form-label">Teacher Picture</label>
                            <div class="d-flex gap-3 align-items-start">
                                <div>
                                    <input 
                                        type="file" 
                                        class="form-control" 
                                        id="picture" 
                                        name="picture"
                                        accept="image/*"
                                    >
                                    <small class="text-muted d-block mt-1">Supported: JPG, PNG (Max 5MB)</small>
                                </div>
                                <div>
                                    <img id="picturePreview" src="" alt="Teacher Picture" style="max-width: 100px; max-height: 100px; border-radius: 8px; display: none; object-fit: cover;">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-save"></i> Save Teacher
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    </div>  <!-- Close main-content -->

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script src="<?= ASSETS_URL ?>/js/api-service.js?v=2"></script>
    <script src="<?= ASSETS_URL ?>/js/main.js"></script>
    
    <!-- Expose user role to JavaScript -->
    <script>
        const currentUserRole = '<?php echo getUserRole(); ?>';
    </script>

    <script>
        // Teachers Management - Uses APIService for all operations
        const teacherModal = new bootstrap.Modal(document.getElementById('teacherModal'), {});
        let teachersTable = null;
        
        document.addEventListener('DOMContentLoaded', () => {
            const skeletonLoader = document.querySelector('.skeleton-loader');
            const contentLoader = document.querySelector('.content-loader');
            
            if (skeletonLoader) {
                setTimeout(function() {
                    skeletonLoader.classList.remove('loading');
                    if (contentLoader) {
                        contentLoader.classList.add('active');
                    }
                }, 300);
            }
            initializeTeachersTable();
            bindFormEvents();
        });
        
        function initializeTeachersTable() {
            teachersTable = $('#teachersTable').DataTable({
                processing: true,
                serverSide: false,
                columns: [
                    { data: 'full_name', title: 'Full Name' },
                    { 
                        data: 'department',
                        title: 'Department',
                        render: function(data) {
                            if (!data) return '<span class="dept-badge">N/A</span>';
                            return `<span class="dept-badge dept-${data.toLowerCase()}">${data}</span>`;
                        }
                    },
                    { data: 'email', title: 'Email', defaultContent: '-' },
                    {
                        data: 'status',
                        title: 'Status',
                        render: function(data) {
                            if (!data) return '<span class="status-badge">N/A</span>';
                            const statusClass = data === 'active' ? 'status-active' : 'status-inactive';
                            return `<span class="status-badge ${statusClass}">${data.toUpperCase()}</span>`;
                        }
                    },
                    { data: 'created_at', title: 'Created' },
                    { data: 'updated_at', title: 'Last Updated' },
                    { data: 'updated_by', title: 'Updated By' },
                    {
                        data: 'id',
                        title: 'Actions',
                        orderable: false,
                        render: function(data, type, row) {
                            let actions = `
                                <div class="action-buttons">
                                    <button class="btn btn-icon editBtn" data-teacher-id="${data}" data-bs-toggle="tooltip" data-bs-title="Edit">
                                        <i class="bi bi-pencil-fill"></i>
                                    </button>`;
                            
                            // Only show delete button for admin
                            if (currentUserRole === 'admin') {
                                actions += `<button class="btn btn-icon deleteBtn" data-teacher-id="${data}" data-bs-toggle="tooltip" data-bs-title="Delete">
                                        <i class="bi bi-trash-fill"></i>
                                    </button>`;
                            }
                            
                            actions += `</div>`;
                            return actions;
                        }
                    }
                ],
                order: [[0, 'asc']],
                pageLength: 10,
                language: {
                    emptyTable: "No teachers found"
                }
            });
            
            loadTeachers();
        }
        
        function loadTeachers() {
            // Fetch ALL teachers (including inactive) for admin to manage
            fetch('/teacher-eval/api/teachers.php?show_all=true', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(result => {
                    console.log('Teachers response:', result);
                    console.log('Response data:', result.data);
                    console.log('Data length:', result.data ? result.data.length : 0);
                    
                    if (result.success) {
                        // Handle array response
                        let data = Array.isArray(result.data) ? result.data : [];
                        
                        console.log('Final data array:', data);
                        
                        // Format data for DataTable
                        const formattedData = data.map(teacher => ({
                            ...teacher,
                            full_name: `${teacher.first_name} ${teacher.middle_name} ${teacher.last_name}`.trim()
                        }));
                        
                        console.log('Formatted data for DataTable:', formattedData);
                        teachersTable.clear().rows.add(formattedData).draw();
                        attachRowEventHandlers();
                        initializeTooltips();
                    } else {
                        showError('Failed to load teachers');
                    }
                })
                .catch(error => {
                    console.error('Error loading teachers:', error);
                    showError('Error loading teachers: ' + error.message);
                });
        }
        
        function attachRowEventHandlers() {
            $('#teachersTable tbody').off('click'); // Remove previous handlers
            
            $('#teachersTable tbody').on('click', '.editBtn', function() {
                const teacherId = $(this).data('teacher-id');
                editTeacher(teacherId);
            });
            
            $('#teachersTable tbody').on('click', '.deleteBtn', function() {
                const teacherId = $(this).data('teacher-id');
                deleteTeacher(teacherId);
            });
        }
        
        function initializeTooltips() {
            // Destroy existing tooltips
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipTriggerEl => {
                const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
                if (existingTooltip) {
                    existingTooltip.dispose();
                }
            });
            
            // Initialize new tooltips
            document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
        
        function openTeacherModal() {
            document.getElementById('teacherForm').reset();
            document.getElementById('picturePreview').style.display = 'none';
            document.getElementById('picturePreview').src = '';
            document.getElementById('modalTitle').textContent = 'Add New Teacher';
            delete document.getElementById('teacherForm').dataset.teacherId;
            teacherModal.show();
        }
        
        function editTeacher(teacherId) {
            api.getTeacher(teacherId)
                .then(response => {
                    if (response.success && response.data) {
                        const teacher = response.data;
                        document.getElementById('first_name').value = teacher.first_name || '';
                        document.getElementById('middle_name').value = teacher.middle_name || '';
                        document.getElementById('last_name').value = teacher.last_name || '';
                        document.getElementById('department').value = teacher.department || '';
                        document.getElementById('email').value = teacher.email || '';
                        document.getElementById('status').value = teacher.status || 'active';
                        
                        // Show existing picture if available
                        const picturePreview = document.getElementById('picturePreview');
                        if (teacher.picture) {
                            picturePreview.src = teacher.picture;
                            picturePreview.style.display = 'block';
                        } else {
                            picturePreview.style.display = 'none';
                            picturePreview.src = '';
                        }
                        
                        document.getElementById('teacherForm').dataset.teacherId = teacherId;
                        document.getElementById('modalTitle').textContent = 'Edit Teacher';
                        teacherModal.show();
                    } else {
                        showError('Failed to load teacher details');
                    }
                })
                .catch(error => showError('Error: ' + error.message));
        }
        
        function deleteTeacher(teacherId) {
            Swal.fire({
                title: 'Delete Teacher?',
                text: 'This action cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel'
            }).then(result => {
                if (result.isConfirmed) {
                    api.deleteTeacher(teacherId)
                        .then(response => {
                            if (response.success) {
                                showSuccess(response.message || 'Teacher deleted successfully');
                                loadTeachers();
                            } else {
                                showError(response.message || 'Failed to delete teacher');
                            }
                        })
                        .catch(error => showError('Error: ' + error.message));
                }
            });
        }
        
        function bindFormEvents() {
            // Handle picture file selection
            document.getElementById('picture').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Validate file size (5MB max)
                    if (file.size > 5 * 1024 * 1024) {
                        showError('Picture size must be less than 5MB');
                        this.value = '';
                        return;
                    }
                    
                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showError('Please select a valid image file');
                        this.value = '';
                        return;
                    }
                    
                    // Show preview (read for preview only, don't store)
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const preview = document.getElementById('picturePreview');
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                } else {
                    document.getElementById('picturePreview').style.display = 'none';
                }
            });
            
            // Handle form submission
            document.getElementById('teacherForm').addEventListener('submit', function(e) {
                e.preventDefault();
                
                const teacherId = this.dataset.teacherId;
                const isEditing = !!teacherId;
                const firstName = document.getElementById('first_name').value.trim();
                const middleName = document.getElementById('middle_name').value.trim();
                const lastName = document.getElementById('last_name').value.trim();
                const department = document.getElementById('department').value;
                const email = document.getElementById('email').value.trim();
                const status = document.getElementById('status').value;
                const pictureInput = document.getElementById('picture');
                
                // Clear previous errors
                document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
                document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
                
                // Prepare base data
                const data = {
                    first_name: firstName,
                    middle_name: middleName,
                    last_name: lastName,
                    department: department,
                    email: email,
                    status: status
                };
                
                // Handle picture upload if file selected
                if (pictureInput.files.length > 0) {
                    uploadTeacherImage(pictureInput.files[0])
                        .then(imagePath => {
                            data.picture = imagePath; // Store file path (not base64!)
                            submitTeacherForm(teacherId, isEditing, data);
                        })
                        .catch(error => {
                            showError('Image upload failed: ' + error);
                        });
                } else {
                    submitTeacherForm(teacherId, isEditing, data);
                }
            });
        }
        
        
        function uploadTeacherImage(file) {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('image', file);
                
                fetch('/teacher-eval/api/upload-teacher-image.php', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success && result.data && result.data.path) {
                            resolve(result.data.path);
                        } else {
                            reject(result.message || 'Failed to upload image');
                        }
                    })
                    .catch(error => reject(error.message));
            });
        }
        
        function submitTeacherForm(teacherId, isEditing, data) {
            if (isEditing) {
                // When editing, include picture if provided
                api.updateTeacher(teacherId, data)
                    .then(response => {
                        if (response.success) {
                            showSuccess(response.message || 'Teacher updated successfully');
                            document.getElementById('teacherForm').reset();
                            delete document.getElementById('teacherForm').dataset.teacherId;
                            teacherModal.hide();
                            loadTeachers();
                        } else {
                            handleValidationErrors(response);
                            showError(response.message || 'Failed to update teacher');
                        }
                    })
                    .catch(error => showError('Error: ' + error.message));
            } else {
                // When creating, include picture if provided
                api.createTeacher(data)
                    .then(response => {
                        if (response.success) {
                            showSuccess(response.message || 'Teacher created successfully');
                            document.getElementById('teacherForm').reset();
                            delete document.getElementById('teacherForm').dataset.teacherId;
                            teacherModal.hide();
                            loadTeachers();
                        } else {
                            handleValidationErrors(response);
                            showError(response.message || 'Failed to create teacher');
                        }
                    })
                    .catch(error => showError('Error: ' + error.message));
            }
        }
        
        function handleValidationErrors(response) {
            if (response.data && response.data.errors) {
                const errors = response.data.errors;
                
                // Map field names to input IDs
                const fieldMap = {
                    'first_name': 'first_name',
                    'middle_name': 'middle_name',
                    'last_name': 'last_name',
                    'department': 'department',
                    'email': 'email',
                    'status': 'status'
                };
                
                Object.entries(errors).forEach(([field, messages]) => {
                    const fieldId = fieldMap[field];
                    if (fieldId) {
                        const element = document.getElementById(fieldId);
                        if (element) {
                            element.classList.add('is-invalid');
                            const feedback = document.createElement('div');
                            feedback.className = 'invalid-feedback d-block';
                            feedback.textContent = Array.isArray(messages) ? messages[0] : messages;
                            element.parentNode.appendChild(feedback);
                        }
                    }
                });
            }
        }
        
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
                text: message
            });
        }
        
        function printTeachersTable() {
            const rows = teachersTable.rows({ search: 'applied' }).data().toArray();
            
            let printContent = '<html><head><meta charset="UTF-8"><title>Teachers Report</title>';
            printContent += '</head><body>';
            
            printContent += '<h1>Teachers Report</h1>';
            printContent += '<p style="text-align: center; color: #666;">Generated: ' + new Date().toLocaleString() + '</p>';
            printContent += '<table><thead><tr>';
            printContent += '<th>Full Name</th><th>Department</th><th>Email</th><th>Status</th>';
            printContent += '</tr></thead><tbody>';
            
            rows.forEach(row => {
                const statusBadge = row.status === 'active' ? 
                    '<span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 3px;">ACTIVE</span>' :
                    '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 3px;">INACTIVE</span>';
                
                printContent += '<tr>';
                printContent += '<td>' + (row.full_name || '') + '</td>';
                printContent += '<td>' + (row.department || '') + '</td>';
                printContent += '<td>' + (row.email || '') + '</td>';
                printContent += '<td>' + statusBadge + '</td>';
                printContent += '</tr>';
            });
            
            printContent += '</tbody></table>';
            printContent += '<div class="timestamp">Total Teachers: ' + rows.length + '</div>';
            printContent += '</body></html>';
            
            const printWindow = window.open('', '', 'height=600,width=900');
            printWindow.document.write(printContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    </script>
    
    <!-- Footer -->
    <?php include '../includes/footer.php'; ?>
</body>
</html>
