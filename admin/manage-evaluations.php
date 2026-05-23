<?php
/**
 * Admin - Manage Evaluations
 * Clear/override student evaluations to allow re-evaluation in new academic year
 * Requires: admin role
 */

require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/duplicate-prevention.php';

initializeSession();
requireLogin();

// Check admin role
if (!isAdmin()) {
    setErrorMessage('Access denied. Admin only.');
    redirect(BASE_URL . '/admin/dashboard.php');
}

// Get filter parameters
$teacher_id = $_GET['teacher_id'] ?? '';
$device_fingerprint = $_GET['device_fingerprint'] ?? '';
$status = $_GET['status'] ?? 'completed';
$days = (int)($_GET['days'] ?? 30);

// Get evaluation records
$filters = [
    'status' => $status,
    'days' => $days
];

if (!empty($teacher_id)) {
    $filters['teacher_id'] = $teacher_id;
}

if (!empty($device_fingerprint)) {
    $filters['device_fingerprint'] = $device_fingerprint;
}

$records = getEvaluationRecordsForManagement($filters);

// Get teachers for dropdown
$teachers_collection = $db->selectCollection('teachers');
$teachers = $teachers_collection->find([], ['sort' => ['full_name' => 1], 'limit' => 500])->toArray();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Evaluations - Teacher Evaluation System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        .main-content {
            padding: 2rem 0;
        }
        
        .filters {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .filter-group {
            margin-bottom: 1rem;
        }
        
        .filter-group label {
            font-weight: 600;
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .filter-group select,
        .filter-group input {
            width: 100%;
        }
        
        .table-container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .table-responsive {
            min-height: 300px;
        }
        
        table {
            margin-bottom: 0;
        }
        
        th {
            background: #f8f9fa;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
        }
        
        td {
            vertical-align: middle;
        }
        
        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .status-badge.completed {
            background: #d4edda;
            color: #155724;
        }
        
        .status-badge.pending {
            background: #fff3cd;
            color: #856404;
        }
        
        .fingerprint-code {
            font-family: monospace;
            font-size: 0.75rem;
            background: #f5f5f5;
            padding: 0.25rem 0.5rem;
            border-radius: 3px;
            word-break: break-all;
            max-width: 150px;
        }
        
        .btn-action {
            padding: 0.25rem 0.5rem;
            font-size: 0.875rem;
        }
        
        .empty-state {
            padding: 3rem;
            text-align: center;
            color: #666;
        }
        
        .stats-info {
            background: #e7f3ff;
            border-left: 4px solid #0066cc;
            padding: 1rem;
            margin-bottom: 1.5rem;
            border-radius: 4px;
        }
        
        .stats-info strong {
            color: #0066cc;
        }
    </style>
</head>
<body>
    <!-- Navbar -->
    <?php include '../includes/navbar.php'; ?>
    
    <!-- Main Content -->
    <div class="container-fluid main-content">
        <div class="row mb-4">
            <div class="col-md-8">
                <h1 class="h2"><i class="bi bi-pencil-square"></i> Manage Evaluations</h1>
                <p class="text-muted">Clear student evaluations to allow re-evaluation in new academic year</p>
            </div>
        </div>
        
        <!-- Stats Info -->
        <div class="stats-info">
            <strong>ℹ️ About clearing evaluations:</strong> When you clear an evaluation record, the student can evaluate that teacher again. Use this for new academic years or periods.
        </div>
        
        <!-- Filters -->
        <div class="filters">
            <form method="get" class="row g-3">
                <div class="col-md-3">
                    <div class="filter-group">
                        <label for="teacher_id">Teacher</label>
                        <select name="teacher_id" id="teacher_id" class="form-select">
                            <option value="">All Teachers</option>
                            <?php foreach ($teachers as $teacher): ?>
                                <option value="<?= (string)$teacher['_id']; ?>" <?= $teacher_id === (string)$teacher['_id'] ? 'selected' : '' ?>>
                                    <?= escapeOutput($teacher['full_name'] ?? $teacher['name'] ?? 'Unknown Teacher'); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                
                <div class="col-md-2">
                    <div class="filter-group">
                        <label for="status">Status</label>
                        <select name="status" id="status" class="form-select">
                            <option value="completed" <?= $status === 'completed' ? 'selected' : '' ?>>Completed</option>
                            <option value="pending" <?= $status === 'pending' ? 'selected' : '' ?>>Pending</option>
                            <option value="">All Status</option>
                        </select>
                    </div>
                </div>
                
                <div class="col-md-2">
                    <div class="filter-group">
                        <label for="days">Days</label>
                        <select name="days" id="days" class="form-select">
                            <option value="7" <?= $days === 7 ? 'selected' : '' ?>>Last 7 days</option>
                            <option value="30" <?= $days === 30 ? 'selected' : '' ?>>Last 30 days</option>
                            <option value="90" <?= $days === 90 ? 'selected' : '' ?>>Last 90 days</option>
                            <option value="365" <?= $days === 365 ? 'selected' : '' ?>>Last year</option>
                        </select>
                    </div>
                </div>
                
                <div class="col-md-3">
                    <div class="filter-group">
                        <label>&nbsp;</label>
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="bi bi-search"></i> Filter
                        </button>
                    </div>
                </div>
                
                <div class="col-md-2">
                    <div class="filter-group">
                        <label>&nbsp;</label>
                        <a href="manage-evaluations.php" class="btn btn-secondary w-100">
                            <i class="bi bi-arrow-clockwise"></i> Reset
                        </a>
                    </div>
                </div>
            </form>
        </div>
        
        <!-- Table -->
        <div class="table-container">
            <?php if (empty($records)): ?>
                <div class="empty-state">
                    <p><i class="bi bi-inbox" style="font-size: 2rem;"></i></p>
                    <p>No evaluation records found</p>
                </div>
            <?php else: ?>
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead>
                            <tr>
                                <th>Teacher</th>
                                <th>Device Fingerprint</th>
                                <th>IP Address</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($records as $record): ?>
                                <tr>
                                    <td>
                                        <strong><?= escapeOutput($record['teacher_name']); ?></strong>
                                        <br>
                                        <small class="text-muted"><?= escapeOutput($record['teacher_code']); ?></small>
                                    </td>
                                    <td>
                                        <span class="fingerprint-code" title="<?= escapeOutput($record['device_fingerprint']); ?>">
                                            <?= substr($record['device_fingerprint'], 0, 20); ?>...
                                        </span>
                                    </td>
                                    <td><?= escapeOutput($record['ip_address']); ?></td>
                                    <td>
                                        <span class="status-badge <?= $record['status']; ?>">
                                            <?= ucfirst($record['status']); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <small><?= formatDateTime($record['submitted_at']); ?></small>
                                    </td>
                                    <td>
                                        <button class="btn btn-danger btn-action btn-clear-eval" 
                                                data-id="<?= (string)$record['_id']; ?>"
                                                data-teacher="<?= escapeOutput($record['teacher_name']); ?>">
                                            <i class="bi bi-trash"></i> Clear
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                
                <div class="p-3 bg-light border-top">
                    <small class="text-muted">
                        Showing <?= count($records); ?> record(s)
                    </small>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script src="<?= ASSETS_URL ?>/js/api-service.js?v=2"></script>
    
    <script>
        // Handle clear evaluation
        document.querySelectorAll('.btn-clear-eval').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.dataset.id;
                const teacher = this.dataset.teacher;
                
                const result = await Swal.fire({
                    title: 'Clear Evaluation?',
                    html: `<div style="text-align: left; margin: 1rem 0;">
                        <p><strong>Teacher:</strong> ${teacher}</p>
                        <p style="color: #dc3545; font-weight: 500;">This will allow the student to evaluate this teacher again.</p>
                    </div>`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, Clear it',
                    cancelButtonText: 'Cancel'
                });
                
                if (result.isConfirmed) {
                    try {
                        const response = await fetch('/api/clear-evaluation.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                submission_log_id: id,
                                reason: 'Admin cleared for re-evaluation'
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok && data.success) {
                            await Swal.fire({
                                title: 'Success!',
                                text: 'Evaluation cleared successfully. Student can now evaluate again.',
                                icon: 'success',
                                confirmButtonColor: '#667eea'
                            });
                            
                            // Remove the row from table
                            this.closest('tr').remove();
                            
                            // Check if table is now empty
                            const tbody = document.querySelector('table tbody');
                            if (!tbody || tbody.querySelectorAll('tr').length === 0) {
                                location.reload();
                            }
                        } else {
                            await Swal.fire({
                                title: 'Error',
                                text: data.message || 'Failed to clear evaluation',
                                icon: 'error',
                                confirmButtonColor: '#667eea'
                            });
                        }
                    } catch (error) {
                        await Swal.fire({
                            title: 'Error',
                            text: 'Network error: ' + error.message,
                            icon: 'error',
                            confirmButtonColor: '#667eea'
                        });
                    }
                }
            });
        });
    </script>
</body>
</html>
