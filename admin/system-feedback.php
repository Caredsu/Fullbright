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
    
    <div class="main-content">
        <div class="container-fluid py-5">
            <div class="page-header">
                <div>
                    <h1 style="margin: 0; display: flex; align-items: center; gap: 12px; font-size: 32px;">
                        <i class="bi bi-chat-left-heart" style="font-size: 36px; color: #667eea;"></i>
                        System Experience Feedback
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #7a8daa; font-size: 14px;">View and manage student feedback ratings</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-outline-light" onclick="printFeedback()" style="border-color: rgba(102, 126, 234, 0.5); color: #7a8daa;" title="Print Feedback">
                        <i class="bi bi-printer"></i> Print
                    </button>
                </div>
            </div>

            <!-- Statistics -->
            <div class="row g-3 mb-4">
                <div class="col-lg-3 col-md-6">
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; border-left: 4px solid #8b5cf6; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <p style="margin: 0 0 8px 0; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">📋 Total Feedback</p>
                            <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;"><?php echo $stats['total']; ?></h2>
                        </div>
                        <div style="font-size: 32px; opacity: 0.3;">💬</div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; border-left: 4px solid #06b6d4; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <p style="margin: 0 0 8px 0; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">⭐ Average Rating</p>
                            <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;"><?php echo $stats['average_rating']; ?>/5</h2>
                        </div>
                        <div style="font-size: 32px; opacity: 0.3;">🌟</div>
                    </div>
                </div>
            </div>

            <!-- Rating Distribution -->
            <?php if ($stats['total'] > 0): ?>
            <div class="rating-distribution">
                <h3>Rating Distribution</h3>
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
                            <div class="rating-bar-fill" style="width: <?php echo $percentage; ?>%">
                                <?php echo $count > 0 ? round($percentage, 1) . '%' : ''; ?>
                            </div>
                        </div>
                        <div class="rating-count">
                            <?php echo $count; ?> rating<?php echo $count !== 1 ? 's' : ''; ?>
                        </div>
                    </div>
                </div>
                <?php endfor; ?>
            </div>
            <?php endif; ?>

            <!-- Feedback List -->
            <div class="feedback-list">
                <div class="feedback-list-header">
                    <h3>Recent Feedback</h3>
                    <div class="feedback-filters">
                        <div class="rating-filter">
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
