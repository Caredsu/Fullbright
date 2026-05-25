/**
 * Users Page JavaScript
 * Specific functionality for admin/users.php
 */

// Users DataTable
let usersTable = null;

// Initialize Users Page
function initializeUsersPage() {
    initializeUsersTable();
    setupUserFilters();
    loadUsersData();
    bindUserFormEvents();
}

// Initialize DataTable for Users
function initializeUsersTable() {
    const usersTableElement = document.getElementById('usersTable');
    if (!usersTableElement || typeof $ === 'undefined') return;
    
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#usersTable')) {
        usersTable = $('#usersTable').DataTable();
        return;
    }
    
    usersTable = $('#usersTable').DataTable({
        responsive: true,
        paging: true,
        pageLength: 10,
        ordering: true,
        searching: true,
        language: {
            search: 'Filter users:',
            lengthMenu: 'Show _MENU_ users per page',
            info: 'Showing _START_ to _END_ of _TOTAL_ users'
        },
        dom: '<"row"<"col-md-6"l><"col-md-6"f>>t<"row"<"col-md-6"i><"col-md-6"p>>'
    });
}

// Setup User Filters
function setupUserFilters() {
    const filterButton = document.getElementById('filterButton');
    if (filterButton) {
        filterButton.addEventListener('click', applyUserFilters);
    }
}

// Apply User Filters
function applyUserFilters() {
    const role = document.getElementById('roleFilter')?.value;
    const status = document.getElementById('statusFilter')?.value;
    const search = document.getElementById('searchInput')?.value;
    
    const filters = {
        role: role || '',
        status: status || '',
        search: search || ''
    };
    
    loadUsersData(filters);
}

// Load Users Data
function loadUsersData(filters = {}) {
    // Call the API endpoint using APIService
    api.getUsers(1, 1000)
        .then(response => {
            console.log('Users API Response:', response);
            // Handle both response.data.data and response.data formats
            const usersArray = (response.data && response.data.data) ? response.data.data : response.data;
            
            if (response.success && usersTable && usersArray && Array.isArray(usersArray)) {
                usersTable.clear();
                usersArray.forEach(user => {
                    const statusClass = user.status === 'active' ? 'user-status-active' : 'user-status-inactive';
                    const statusBadge = '<span class="' + statusClass + '">' + (user.status || 'active') + '</span>';
                    const lastLogin = user.lastLogin || 'Never';
                    const createdBy = user.createdBy || 'System';
                    const updatedBy = user.lastUpdatedBy || 'N/A';
                    const userId = user.id || user._id || '';
                    
                    const actionsHtml = `
                        <button class="btn btn-icon editUserBtn" data-user-id="${userId}" data-bs-toggle="tooltip" data-bs-title="Edit">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-icon deleteUserBtn" data-user-id="${userId}" data-bs-toggle="tooltip" data-bs-title="Delete">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    `;
                    
                    usersTable.row.add([
                        user.username || user.name || '',
                        user.email || '',
                        user.role || 'N/A',
                        statusBadge,
                        lastLogin,
                        createdBy,
                        updatedBy,
                        actionsHtml
                    ]);
                });
                usersTable.draw();
                
                // Initialize event listeners for action buttons
                setupUserActionListeners();
            } else {
                console.warn('No users data received:', response);
            }
        })
        .catch(error => {
            console.error('Error loading users:', error);
        });
}

// Print Users Table
function printUsersTable() {
    window.print();
}

// Open Add User Modal
function openUserModal() {
    const modal = document.getElementById('userModal');
    if (!modal) return;
    
    // Reset form for new user
    const form = document.getElementById('userForm');
    if (form) {
        form.reset();
    }
    
    // Reset password field visibility
    const passwordField = document.getElementById('passwordField');
    if (passwordField) {
        passwordField.style.display = 'block';
    }
    
    // Reset modal title and action
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userIdInput').value = '';
    document.getElementById('ajaxActionInput').value = 'add_user';
    
    // Show modal
    if (typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Setup User Action Listeners
function setupUserActionListeners() {
    // Edit User Button
    $('#usersTable tbody').on('click', '.editUserBtn', function() {
        const userId = $(this).data('user-id');
        if (userId) {
            editUser(userId);
        }
    });
    
    // Delete User Button
    $('#usersTable tbody').on('click', '.deleteUserBtn', function() {
        const userId = $(this).data('user-id');
        if (userId) {
            deleteUser(userId);
        }
    });
}

// Edit User
function editUser(userId) {
    console.log('Editing user:', userId);
    
    fetch(`/teacher-eval/api/users.php?id=${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Edit user response:', data);
            
            if (data.success && data.data) {
                const user = data.data;
                showEditUserModal(user);
            } else if (data.user) {
                showEditUserModal(data.user);
            } else {
                showError('Error', 'Failed to load user data');
                console.error('User data not found in response:', data);
            }
        })
        .catch(error => {
            console.error('Error loading user:', error);
            showError('Error', 'Failed to load user: ' + error.message);
        });
}

// Show Edit User Modal
function showEditUserModal(user) {
    console.log('Showing edit modal for user:', user);
    
    if (!user) {
        showError('Error', 'Invalid user data');
        return;
    }
    
    const modal = document.getElementById('userModal');
    if (!modal) return;
    
    // Update modal title
    document.getElementById('modalTitle').textContent = 'Edit User';
    
    // Populate form fields with correct IDs from HTML
    const userId = user.id || user._id || '';
    document.getElementById('userIdInput').value = userId;
    document.getElementById('username').value = user.username || user.name || '';
    document.getElementById('user_email').value = user.email || '';
    document.getElementById('user_role').value = user.role || '';
    document.getElementById('user_status').value = user.status || 'active';
    
    // Hide password field when editing
    const passwordField = document.getElementById('passwordField');
    if (passwordField) {
        passwordField.style.display = 'none';
    }
    
    // Set action for edit
    document.getElementById('ajaxActionInput').value = 'edit_user';
    
    // Show modal
    if (typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

// Delete User
function deleteUser(userId) {
    console.log('Deleting user:', userId);
    
    showConfirm('Delete User', 'Are you sure you want to delete this user?', () => {
        fetch(`/teacher-eval/api/users.php?id=${userId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Delete response:', data);
            
            if (data.success) {
                showSuccess('User Deleted', 'User has been deleted successfully');
                // Reload users data
                loadUsersData();
            } else {
                showError('Error', data.message || 'Failed to delete user');
            }
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            showError('Error', 'Failed to delete user: ' + error.message);
        });
    });
}

// Bind User Form Events
function bindUserFormEvents() {
    const userForm = document.getElementById('userForm');
    if (!userForm) return;
    
    userForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitUserForm();
    });
}

// Submit User Form
function submitUserForm() {
    const form = document.getElementById('userForm');
    if (!form) return;
    
    console.log('Submitting user form...');
    
    const formData = new FormData(form);
    const userId = document.getElementById('userIdInput').value;
    const action = document.getElementById('ajaxActionInput').value;
    
    console.log('Form data - Action:', action, 'User ID:', userId);
    
    let method = 'POST';
    let url = '/teacher-eval/api/users.php';
    
    if (action === 'edit_user' && userId) {
        method = 'PUT';
        url = `/teacher-eval/api/users.php?id=${userId}`;
    }
    
    fetch(url, {
        method: method,
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Form submit response:', data);
        
        if (data.success) {
            const isEdit = action === 'edit_user';
            showSuccess(
                isEdit ? 'User Updated' : 'User Created',
                isEdit ? 'User has been updated successfully' : 'User has been created successfully'
            );
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload users data
            setTimeout(() => {
                loadUsersData();
            }, 500);
        } else {
            showError('Error', data.message || 'Failed to save user');
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        showError('Error', 'Failed to save user: ' + error.message);
    });
}


