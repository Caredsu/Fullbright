<?php
/**
 * System Feedback Management - Admin Console
 * View and manage system experience feedback from users
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

initializeSession();

// If admin_id is not in session, try to restore from session file
// This handles cases where session data isn't immediately available
if (!isset($_SESSION['admin_id']) && isset($_COOKIE['PHPSESSID'])) {
    $sessionSavePath = dirname(dirname(__FILE__)) . '/storage/sessions';
    $sessionFile = $sessionSavePath . '/sess_' . $_COOKIE['PHPSESSID'];
    if (file_exists($sessionFile)) {
        $sessionData = file_get_contents($sessionFile);
        session_decode($sessionData);
    }
}

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    header('Location: login.php');
    exit;
}

try {
    global $db;
    
    // Get system_feedback collection
    $feedbackCollection = $db->selectCollection('system_feedback');
    
    // Get all feedback sorted by date
    $cursor = $feedbackCollection->find([], ['sort' => ['created_at' => -1]]);
    $feedback = iterator_to_array($cursor);
    
    // Calculate statistics
    $stats = [
        'total' => count($feedback),
        'average_rating' => 0,
        'distribution' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0],
    ];
    
    if (count($feedback) > 0) {
        $total_rating = 0;
        foreach ($feedback as $item) {
            $rating = $item['rating'] ?? 0;
            $total_rating += $rating;
            if (isset($stats['distribution'][$rating])) {
                $stats['distribution'][$rating]++;
            }
        }
        $stats['average_rating'] = round($total_rating / count($feedback), 2);
    }
    
} catch (Exception $e) {
    die('Database error: ' . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Experience Feedback - Teacher Evaluation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/system-feedback.css">
</head>
<body>
    <?php include __DIR__ . '/../includes/navbar.php'; ?>
    
    <div class="content-loader active">
        <div class="container-fluid py-5">
            <!-- Page Header -->
            <div class="feedback-header">
                <div class="feedback-header-content">
                    <h1>
                        <i class="bi bi-chat-left-heart"></i>
                        System Experience Feedback
                    </h1>
                    <p class="feedback-subtitle">View and manage student feedback ratings</p>
                </div>
                <div class="feedback-header-actions">
                    <button class="btn btn-print" onclick="printFeedback()" title="Print Feedback">
                        <i class="bi bi-printer"></i> Print
                    </button>
                </div>
            </div>

            <!-- Statistics Cards -->
            <div class="feedback-stats">
                <div class="stat-card">
                    <div class="stat-content">
                        <p class="stat-label"><i class="bi bi-chat-dots"></i> Total Feedback</p>
                        <h2 class="stat-value"><?php echo $stats['total']; ?></h2>
                    </div>
                    <div class="stat-icon">📋</div>
                </div>
                <div class="stat-card average">
                    <div class="stat-content">
                        <p class="stat-label"><i class="bi bi-star-fill"></i> Average Rating</p>
                        <h2 class="stat-value"><?php echo $stats['average_rating']; ?>/5</h2>
                    </div>
                    <div class="stat-icon">⭐</div>
                </div>
            </div>

            <!-- Rating Distribution -->
            <?php if ($stats['total'] > 0): ?>
            <div class="rating-distribution-section">
                <h3><i class="bi bi-bar-chart"></i> Rating Distribution</h3>
                <?php for ($i = 5; $i >= 1; $i--): 
                    $count = $stats['distribution'][$i];
                    $percentage = ($stats['total'] > 0) ? ($count / $stats['total']) * 100 : 0;
                ?>
                <div class="rating-row">
                    <div class="rating-stars">
                        <?php echo str_repeat('⭐', $i); ?>
                    </div>
                    <div class="rating-bar-container">
                        <div class="rating-bar">
                            <?php if ($percentage > 0): ?>
                            <div class="rating-bar-fill" style="width: <?php echo $percentage; ?>%">
                                <?php echo round($percentage, 1); ?>%
                            </div>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="rating-count">
                        <?php echo $count; ?> rating<?php echo $count !== 1 ? 's' : ''; ?>
                    </div>
                </div>
                <?php endfor; ?>
            </div>
            <?php endif; ?>

            <!-- Feedback List -->
            <div class="feedback-list-section">
                <div class="feedback-list-header">
                    <h3 class="feedback-list-title"><i class="bi bi-chat-left-text"></i> Recent Feedback</h3>
                    <div class="feedback-filters">
                        <label class="rating-filter-label">Filter by Rating:</label>
                        <select id="ratingFilter" class="form-select form-select-sm" style="max-width: 200px;">
                            <option value="">All Ratings</option>
                            <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                            <option value="4">⭐⭐⭐⭐ 4+ Stars</option>
                            <option value="3">⭐⭐⭐ 3+ Stars</option>
                            <option value="2">⭐⭐ 2+ Stars</option>
                            <option value="1">⭐ 1+ Stars</option>
                        </select>
                    </div>
                </div>

                <?php if (count($feedback) > 0): ?>
                <div class="feedback-table-wrapper">
                    <table id="feedbackTable" class="table table-hover feedback-table mb-0">
                        <thead>
                            <tr>
                                <th>Rating</th>
                                <th>User ID</th>
                                <th>Comments</th>
                                <th>Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($feedback as $item): 
                                $dateStr = 'N/A';
                                if (isset($item['created_at'])) {
                                    if ($item['created_at'] instanceof MongoDB\BSON\UTCDateTime) {
                                        $dateStr = $item['created_at']->toDateTime()->format('M d, Y H:i');
                                    } elseif (is_numeric($item['created_at'])) {
                                        $dateStr = date('M d, Y H:i', intval($item['created_at'] / 1000));
                                    }
                                }
                                $itemId = isset($item['_id']) ? $item['_id']->__toString() : '';
                            ?>
                            <tr data-rating="<?php echo $item['rating']; ?>">
                                <td>
                                    <div class="rating-display">
                                        <?php echo str_repeat('⭐', $item['rating']); ?>
                                        <span><?php echo $item['rating']; ?>/5</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="text-muted" title="<?php echo htmlspecialchars($item['user_id'] ?? 'Anonymous'); ?>">
                                        <?php echo isset($item['user_id']) ? htmlspecialchars(substr($item['user_id'], 0, 12)) . '...' : 'Anonymous'; ?>
                                    </span>
                                </td>
                                <td>
                                    <div class="feedback-comments">
                                        <?php 
                                        if (!empty($item['comments'])) {
                                            echo htmlspecialchars(substr($item['comments'], 0, 100));
                                            if (strlen($item['comments']) > 100) echo '...';
                                        } else {
                                            echo '<em>No comments</em>';
                                        }
                                        ?>
                                    </div>
                                </td>
                                <td class="feedback-date-cell"><?php echo $dateStr; ?></td>
                                <td>
                                    <button class="btn btn-sm btn-feedback-delete" onclick="deleteFeedback('<?php echo $itemId; ?>')">
                                        <i class="bi bi-trash"></i> Delete
                                    </button>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php else: ?>
                    <div class="feedback-empty-state">
                        <i class="bi bi-inbox"></i>
                        <p>No feedback received yet.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- DataTables -->
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>

    <!-- Global utilities -->
    <script src="<?= ASSETS_URL ?>/js/global.js"></script>

    <script>
        // Initialize DataTable
        let feedbackTable;
        
        document.addEventListener('DOMContentLoaded', function() {
            feedbackTable = $('#feedbackTable').DataTable({
                pageLength: 10,
                order: [[3, 'desc']],
                columnDefs: [
                    { searchable: false, orderable: false, targets: 4 }
                ],
                language: {
                    emptyTable: "No feedback to display"
                }
            });
        });

        // Rating filter
        $('#ratingFilter').on('change', function() {
            const filterValue = $(this).val();
            
            if (filterValue === '') {
                feedbackTable.column(0).search('').draw();
            } else {
                feedbackTable.column(0).search(filterValue, false, false).draw();
            }
        });

        // Delete feedback
        function deleteFeedback(feedbackId) {
            Swal.fire({
                title: 'Delete Feedback?',
                text: 'This action cannot be undone.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('../api/system-feedback.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'delete_feedback',
                            feedback_id: feedbackId
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire({
                                title: 'Deleted!',
                                text: 'Feedback has been deleted successfully.',
                                icon: 'success',
                                confirmButtonColor: '#667eea'
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                title: 'Error!',
                                text: 'Error deleting feedback: ' + (data.message || 'Unknown error'),
                                icon: 'error',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        Swal.fire({
                            title: 'Error!',
                            text: 'Error deleting feedback',
                            icon: 'error',
                            confirmButtonColor: '#dc3545'
                        });
                    });
                }
            });
        }

        // Print feedback
        function printFeedback() {
            const printWindow = window.open('', '_blank');
            const table = document.getElementById('feedbackTable');
            const clonedTable = table.cloneNode(true);
            
            // Remove action column
            const rows = clonedTable.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                if (cells.length > 0) {
                    cells[cells.length - 1].remove();
                }
            });

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>System Feedback Report</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            color: #333;
                        }
                        .header {
                            margin-bottom: 30px;
                            text-align: center;
                            border-bottom: 2px solid #667eea;
                            padding-bottom: 20px;
                        }
                        h1 {
                            margin: 0 0 5px 0;
                            color: #1f2937;
                        }
                        .header p {
                            margin: 5px 0;
                            color: #6b7280;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        th {
                            background-color: #f9fafb;
                            padding: 12px;
                            text-align: left;
                            font-weight: 600;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        td {
                            padding: 12px;
                            border-bottom: 1px solid #e5e7eb;
                        }
                        .footer {
                            text-align: center;
                            color: #6b7280;
                            font-size: 0.9em;
                            border-top: 1px solid #e5e7eb;
                            padding-top: 20px;
                        }
                        @media print {
                            body { margin: 0; padding: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>System Experience Feedback Report</h1>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                    
                    ${clonedTable.outerHTML}
                    
                    <div class="footer">
                        <p>© 2026 Fullbright College Inc. Teacher Evaluation System</p>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    </script>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>
</html>
                            <select id="ratingFilter">
                                <option value="">All Ratings</option>
                                <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                                <option value="4">⭐⭐⭐⭐ 4+ Stars</option>
                                <option value="3">⭐⭐⭐ 3+ Stars</option>
                                <option value="2">⭐⭐ 2+ Stars</option>
                                <option value="1">⭐ 1+ Stars</option>
                            </select>
                        </div>
                    </div>
                </div>

                <?php if (count($feedback) > 0): ?>
                <table id="feedbackTable" class="table table-dark table-hover">
                    <thead>
                        <tr>
                            <th>Rating</th>
                            <th>User ID</th>
                            <th>Comments</th>
                            <th>Date</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($feedback as $item): 
                            $dateStr = 'N/A';
                            if (isset($item['created_at'])) {
                                if ($item['created_at'] instanceof MongoDB\BSON\UTCDateTime) {
                                    $dateStr = $item['created_at']->toDateTime()->format('M d, Y H:i');
                                } elseif (is_numeric($item['created_at'])) {
                                    $dateStr = date('M d, Y H:i', intval($item['created_at'] / 1000));
                                }
                            }
                            $itemId = isset($item['_id']) ? $item['_id']->__toString() : '';
                        ?>
                        <tr data-rating="<?php echo $item['rating']; ?>">
                            <td>
                                <div class="rating-display">
                                    <?php echo str_repeat('⭐', $item['rating']); ?>
                                    <span><?php echo $item['rating']; ?>/5</span>
                                </div>
                            </td>
                            <td><?php echo isset($item['user_id']) ? htmlspecialchars(substr($item['user_id'], 0, 12)) : 'Anonymous'; ?></td>
                            <td>
                                <div class="feedback-comments">
                                    <?php echo !empty($item['comments']) ? htmlspecialchars($item['comments']) : '<em style="color: #6a7280;">No comments</em>'; ?>
                                </div>
                            </td>
                            <td class="feedback-date-cell"><?php echo $dateStr; ?></td>
                            <td>
                                <button class="btn-delete" onclick="deleteFeedback('<?php echo $itemId; ?>')">Delete</button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <?php else: ?>
                    <div class="empty-state">
                        <p>No feedback received yet.</p>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        </div>  <!-- Close main-content -->
    </div>  <!-- Close container-fluid -->

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- DataTables -->
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>

    <!-- Global utilities -->
    <script src="<?= ASSETS_URL ?>/js/global.js"></script>

    <!-- Page-specific JS -->
    <script src="<?= ASSETS_URL ?>/js/pages/system-feedback.js"></script>
    <script>
        // Rating filter
        $('#ratingFilter').on('change', function() {
            const filterValue = $(this).val();
            const table = $('#feedbackTable').DataTable();

            if (filterValue === '') {
                table.column(0).search('').draw();
            } else {
                table.column(0).search(filterValue, false, false).draw();
            }
        });

        // Delete feedback
        function deleteFeedback(feedbackId) {
            Swal.fire({
                title: 'Delete Feedback',
                text: 'Are you sure you want to delete this feedback?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('../api/system-feedback.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            action: 'delete_feedback',
                            feedback_id: feedbackId
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire({
                                title: 'Deleted!',
                                text: 'Feedback has been deleted successfully.',
                                icon: 'success',
                                confirmButtonColor: '#667eea'
                            }).then(() => {
                                location.reload();
                            });
                        } else {
                            Swal.fire({
                                title: 'Error!',
                                text: 'Error deleting feedback: ' + data.message,
                                icon: 'error',
                                confirmButtonColor: '#dc3545'
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        Swal.fire({
                            title: 'Error!',
                            text: 'Error deleting feedback',
                            icon: 'error',
                            confirmButtonColor: '#dc3545'
                        });
                    });
                }
            });
        }

        // Print feedback
        function printFeedback() {
            const printWindow = window.open('', '_blank');
            const table = document.getElementById('feedbackTable');
            const clonedTable = table.cloneNode(true);

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>System Feedback Report</title>
                </head>
                <body>
                    <div class="header">
                        <h1>System Experience Feedback Report</h1>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                    
                    ${clonedTable.outerHTML}
                    
                    <div class="footer">
                        <p>© 2026 Fullbright College Inc. Teacher Evaluation System</p>
                    </div>
                </body>
                </html>
            `;
            
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    </script>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>
</html>
