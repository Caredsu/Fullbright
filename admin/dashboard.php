<?php
/**
 * Admin Dashboard
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

// Add HTTP cache headers for static dashboard data (3 minutes)
if (!isset($_GET['get_notifications']) && !isset($_GET['get_notif_count']) && !isset($_GET['clear_notifications']) && !isset($_GET['check_new'])) {
    header('Cache-Control: public, max-age=180'); // 3 minutes
    header('Pragma: cache');
}

// Enable gzip compression if available
if (!ob_get_contents() && extension_loaded('zlib')) {
    ob_start('ob_gzhandler');
}

initializeSession();

requireLogin();

// AJAX HANDLERS - Must come AFTER requireLogin() to ensure proper session
// ========================================================================

// Handle AJAX polling request
if (isset($_GET['check_new'])) {
    // Set response header FIRST before any other output
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    try {
        // Session is guaranteed to be set up by requireLogin()
        $latestEval = $evaluations_collection->findOne([], ['sort' => ['_id' => -1]]);
        $latestId = $latestEval ? (string)$latestEval['_id'] : null;
        
        // Compare with client's last known ID
        $clientLastId = isset($_GET['lastId']) && $_GET['lastId'] !== '' ? $_GET['lastId'] : null;
        $hasNew = ($latestId && $latestId !== $clientLastId);
        
        error_log("Poll check - Latest: $latestId, Client: $clientLastId, HasNew: " . ($hasNew ? 'true' : 'false'));
        
        die(json_encode([
            'has_new' => $hasNew,
            'latest_id' => $latestId,
            'success' => true
        ]));
    } catch (\Exception $e) {
        error_log("Poll check error: " . $e->getMessage());
        http_response_code(500);
        die(json_encode([
            'error' => 'Database error: ' . $e->getMessage(),
            'has_new' => false,
            'latest_id' => null,
            'success' => false
        ]));
    } catch (Throwable $t) {
        error_log("Poll check throwable: " . $t->getMessage());
        http_response_code(500);
        die(json_encode([
            'error' => 'System error: ' . $t->getMessage(),
            'has_new' => false,
            'latest_id' => null,
            'success' => false
        ]));
    }
}

// Handle AJAX notification count request
if (isset($_GET['get_notif_count'])) {
    header('Content-Type: application/json');
    try {
        // Use estimated count for speed
        $total_count = $evaluations_collection->estimatedDocumentCount();
        echo json_encode(['count' => $total_count]);
    } catch (\Exception $e) {
        echo json_encode(['count' => 0]);
    }
    exit;
}

// Handle AJAX clear notifications request
if (isset($_GET['clear_notifications'])) {
    header('Content-Type: application/json');
    try {
        // Save current timestamp as the clear point with microseconds for uniqueness
        $clearTime = new MongoDB\BSON\UTCDateTime(round(microtime(true) * 1000));
        $_SESSION['notifications_cleared_at'] = $clearTime;
        
        // Force session save immediately
        session_write_close();
        
        // Verify it was saved by reading it back
        session_start();
        $verify = $_SESSION['notifications_cleared_at'] ?? null;
        session_write_close();
        
        echo json_encode(['success' => true, 'time' => $verify ? $verify->__toString() : 'failed']);
    } catch (\Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Handle AJAX get notifications request
if (isset($_GET['get_notifications'])) {
    header('Content-Type: application/json');
    try {
        // Get the cleared timestamp from session (only show notifications AFTER this time)
        $cleared_at = isset($_SESSION['notifications_cleared_at']) 
            ? $_SESSION['notifications_cleared_at']
            : new MongoDB\BSON\UTCDateTime(0);
        
        // Build filter - only get evaluations AFTER the cleared timestamp
        $filter = [
            'submitted_at' => ['$gt' => $cleared_at]
        ];
        
        // Get total count of new notifications
        $new_count = $evaluations_collection->countDocuments($filter);
        
        // Get recent new evaluations with field projection
        $recent_evals = $evaluations_collection->find(
            $filter,
            [
                'projection' => ['teacher_id' => 1, 'submitted_at' => 1],
                'sort' => ['submitted_at' => -1],
                'limit' => 5
            ]
        );
        
        // Collect teacher IDs we need
        $needed_teacher_ids = [];
        $notifications = [];
        foreach ($recent_evals as $eval) {
            $teacher_id = $eval['teacher_id'] ?? null;
            if ($teacher_id) {
                $needed_teacher_ids[(string)$teacher_id] = true;
            }
        }
        
        // Fetch all needed teachers in one query with field projection
        $teachers_by_id = [];
        if (count($needed_teacher_ids) > 0) {
            $teacher_ids_to_fetch = array_map(function($id) {
                return ctype_xdigit($id) && strlen($id) === 24 
                    ? new MongoDB\BSON\ObjectId($id) 
                    : $id;
            }, array_keys($needed_teacher_ids));
            
            $found_teachers = $teachers_collection->find(
                ['_id' => ['$in' => $teacher_ids_to_fetch]],
                ['projection' => ['name' => 1, 'first_name' => 1, 'last_name' => 1]]
            );
            foreach ($found_teachers as $teacher) {
                $teachers_by_id[(string)$teacher['_id']] = $teacher;
            }
        }
        
        // Re-query recent evals for display (since we iterated through the cursor)
        $recent_evals = $evaluations_collection->find(
            [],
            [
                'projection' => ['teacher_id' => 1, 'submitted_at' => 1],
                'sort' => ['submitted_at' => -1],
                'limit' => 5
            ]
        );
        
        foreach ($recent_evals as $eval) {
            $teacher_name = 'Anonymous';
            $teacher_id = $eval['teacher_id'] ?? null;
            
            // Look up teacher from cache instead of querying
            if ($teacher_id && isset($teachers_by_id[(string)$teacher_id])) {
                $teacher = $teachers_by_id[(string)$teacher_id];
                $teacher_name = $teacher['name'] ?? 'Anonymous';
            }
            
            // Format time
            $time_text = 'just now';
            if (isset($eval['submitted_at'])) {
                try {
                    $date_obj = $eval['submitted_at'];
                    if ($date_obj instanceof MongoDB\BSON\UTCDateTime) {
                        $timestamp = $date_obj->toDateTime();
                    } elseif ($date_obj instanceof DateTime) {
                        $timestamp = $date_obj;
                    } else {
                        $timestamp = new DateTime();
                    }
                    
                    $now = new DateTime();
                    $diff = $now->getTimestamp() - $timestamp->getTimestamp();
                    
                    if ($diff < 60) {
                        $time_text = 'just now';
                    } elseif ($diff < 3600) {
                        $mins = floor($diff / 60);
                        $time_text = $mins . ' min' . ($mins > 1 ? 's' : '') . ' ago';
                    } elseif ($diff < 86400) {
                        $hours = floor($diff / 3600);
                        $time_text = $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
                    } else {
                        $days = floor($diff / 86400);
                        $time_text = $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
                    }
                } catch (\Exception $e) {
                    $time_text = 'recently';
                }
            }
            
            $notifications[] = [
                'title' => $teacher_name . ' was evaluated',
                'time' => $time_text
            ];
        }
        
        echo json_encode([
            'count' => $new_count,
            'total' => $total_count,
            'notifications' => $notifications
        ]);
    } catch (\Exception $e) {
        error_log('Get notifications error: ' . $e->getMessage());
        echo json_encode(['count' => 0, 'total' => 0, 'notifications' => []]);
    }
    exit;
}

// Handle AJAX notification count request (legacy)
if (isset($_GET['get_notif_count'])) {
    header('Content-Type: application/json');
    try {
        // Get the cleared timestamp from session
        $cleared_at = isset($_SESSION['notifications_cleared_at']) 
            ? $_SESSION['notifications_cleared_at']
            : new MongoDB\BSON\UTCDateTime(0);
        
        // Count only new notifications after cleared timestamp
        $new_count = $evaluations_collection->countDocuments([
            'submitted_at' => ['$gt' => $cleared_at]
        ]);
        
        echo json_encode(['count' => $new_count]);
    } catch (\Exception $e) {
        echo json_encode(['count' => 0]);
    }
    exit;
}

// Check if just logged in and unset the flag
$show_skeleton = isset($_SESSION['just_logged_in']) && $_SESSION['just_logged_in'];
if ($show_skeleton) {
    unset($_SESSION['just_logged_in']);
    
    // Initialize notifications cleared timestamp on first login
    // This prevents showing old notifications from before login
    if (!isset($_SESSION['notifications_cleared_at'])) {
        $_SESSION['notifications_cleared_at'] = new MongoDB\BSON\UTCDateTime();
    }
}

// Initialize variables with defaults
$total_teachers = 0;
$total_questions = 0;
$total_evaluations = 0;
$teacher_ratings = [];
$recent_evaluations = [];
$error = null;

// Get dashboard statistics
try {
    // Use estimatedDocumentCount() instead of countDocuments() for speed
    // This is approximate but MUCH faster for large collections
    $total_teachers = $teachers_collection->estimatedDocumentCount();
    $total_questions = $questions_collection->countDocuments(['status' => 'active']); // Keep exact for questions (usually small)
    $total_evaluations = $evaluations_collection->estimatedDocumentCount();
    
    // Get recent evaluations with teacher info (with field projection)
    $recent_evaluations = $evaluations_collection->find(
        [],
        [
            'projection' => ['teacher_id' => 1, 'submitted_at' => 1, 'answers' => 1],
            'sort' => ['submitted_at' => -1],
            'limit' => 10
        ]
    );
    
    // Extract teacher IDs from recent evaluations
    $needed_teacher_ids = [];
    foreach ($recent_evaluations as $eval) {
        $teacher_id = $eval['teacher_id'] ?? null;
        if ($teacher_id) {
            $needed_teacher_ids[(string)$teacher_id] = true;
        }
    }
    
    // Fetch only the teachers we need (with field projection)
    $teachers_cache = [];
    if (count($needed_teacher_ids) > 0) {
        $teacher_ids_to_fetch = array_map(function($id) {
            return ctype_xdigit($id) && strlen($id) === 24 
                ? new MongoDB\BSON\ObjectId($id) 
                : $id;
        }, array_keys($needed_teacher_ids));
        
        $teachers_found = $teachers_collection->find(
            ['_id' => ['$in' => $teacher_ids_to_fetch]],
            ['projection' => ['first_name' => 1, 'last_name' => 1, 'middle_name' => 1, 'name' => 1]]
        );
        foreach ($teachers_found as $teacher) {
            $teacher_id_str = (string)$teacher['_id'];
            $teachers_cache[$teacher_id_str] = $teacher;
        }
    }
    
    // Reset the cursor for display - get again since we iterated it above (with field projection)
    $recent_evaluations = $evaluations_collection->find(
        [],
        [
            'projection' => ['teacher_id' => 1, 'submitted_at' => 1, 'answers' => 1],
            'sort' => ['submitted_at' => -1],
            'limit' => 10
        ]
    );
    
    // Get top performers using MongoDB aggregation pipeline
    $teacher_ratings = [];
    $top_performers = [];
    
    try {
        $pipeline = [
            // Project only needed fields
            ['$project' => ['teacher_id' => 1, 'answers' => 1]],
            // Unwind answers array
            ['$unwind' => '$answers'],
            // Group by teacher and calculate average
            [
                '$group' => [
                    '_id' => '$teacher_id',
                    'avg_rating' => ['$avg' => '$answers.rating'],
                    'total_evals' => ['$sum' => 1]
                ]
            ],
            // Sort by rating descending
            ['$sort' => ['avg_rating' => -1]],
            // Get top 100 teachers
            ['$limit' => 100]
        ];
        
        $results = $evaluations_collection->aggregate($pipeline);
        
        foreach ($results as $result) {
            $teacher_id = (string)$result['_id'];
            
            // Get teacher name from cache or fetch
            $teacher_name = 'Anonymous';
            if (isset($teachers_cache[$teacher_id])) {
                $teacher = $teachers_cache[$teacher_id];
                $full_name = trim(($teacher['first_name'] ?? '') . ' ' . ($teacher['middle_name'] ?? '') . ' ' . ($teacher['last_name'] ?? ''));
                $teacher_name = !empty($full_name) ? $full_name : ($teacher['name'] ?? 'Anonymous');
            } else {
                // Fetch single teacher if not in cache
                try {
                    $teacher_obj_id = ctype_xdigit($teacher_id) && strlen($teacher_id) === 24 
                        ? new MongoDB\BSON\ObjectId($teacher_id) 
                        : $teacher_id;
                    $teacher = $teachers_collection->findOne(['_id' => $teacher_obj_id]);
                    if ($teacher) {
                        $full_name = trim(($teacher['first_name'] ?? '') . ' ' . ($teacher['middle_name'] ?? '') . ' ' . ($teacher['last_name'] ?? ''));
                        $teacher_name = !empty($full_name) ? $full_name : ($teacher['name'] ?? 'Anonymous');
                    }
                } catch (\Exception $e) {
                    // Use anonymous if lookup fails
                }
            }
            
            $teacher_ratings[] = [
                'name' => $teacher_name,
                'avg_rating' => round((float)$result['avg_rating'], 1),
                'total_evals' => (int)$result['total_evals']
            ];
        }
        
        // Get top 3 performers
        $top_performers = array_slice($teacher_ratings, 0, 3);
    } catch (\Exception $e) {
        error_log('Top performers query error: ' . $e->getMessage());
        $teacher_ratings = [];
        $top_performers = [];
    }
    
    // Calculate key metrics
    $completion_rate = $total_teachers > 0 ? round(($total_evaluations / $total_teachers) * 100, 1) : 0;
    
    // Calculate average rating
    $overall_avg_rating = count($teacher_ratings) > 0 
        ? round(array_sum(array_column($teacher_ratings, 'avg_rating')) / count($teacher_ratings), 2)
        : 0;
    
} catch (\Exception $e) {
    $error = 'Error fetching dashboard data: ' . $e->getMessage();
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Teacher Evaluation System</title>
    
    <!-- Preload critical resources for faster rendering -->
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" as="style">
    <link rel="preload" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0" as="style">
    <link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    
    <!-- Global and Component Styles -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/dashboard.css">
    
    <!-- Real-Time Notifications -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/notification-toast.css">
    
    <!-- Async load non-critical styles -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css" media="print" onload="this.media='all'">
    
    <!-- Defer non-critical scripts -->
    <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
</head>
<body class="admin-page">
    <!-- Navbar -->
    <?php include '../includes/navbar.php'; ?>
    
    <!-- Main Content Wrapper -->
    <div class="main-content">
        <!-- Skeleton Loading -->
        <div class="skeleton-loader <?php echo $show_skeleton ? 'loading' : ''; ?>" data-show-skeleton="<?php echo $show_skeleton ? 'true' : 'false'; ?>">
            <div class="container-fluid py-5">
            <!-- Skeleton Header -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="skeleton skeleton-title" style="width: 200px;"></div>
                    <div class="skeleton skeleton-text" style="width: 250px;"></div>
                </div>
            </div>

            <!-- Skeleton Statistics Cards -->
            <div class="row g-4 mb-4">
                <div class="col-md-3">
                    <div class="card skeleton-card skeleton">
                        <div class="card-body">
                            <div class="skeleton skeleton-text" style="width: 80px;"></div>
                            <div class="skeleton skeleton-title" style="width: 60px;"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card skeleton-card skeleton">
                        <div class="card-body">
                            <div class="skeleton skeleton-text" style="width: 80px;"></div>
                            <div class="skeleton skeleton-title" style="width: 60px;"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card skeleton-card skeleton">
                        <div class="card-body">
                            <div class="skeleton skeleton-text" style="width: 80px;"></div>
                            <div class="skeleton skeleton-title" style="width: 60px;"></div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card skeleton-card skeleton">
                        <div class="card-body">
                            <div class="skeleton skeleton-text" style="width: 80px;"></div>
                            <div class="skeleton skeleton-title" style="width: 60px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Skeleton Chart -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body">
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton skeleton-chart"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="content-loader active">
        <div class="container-fluid py-5">
            <div class="row mb-4">
            <div class="col-md-8">
                <h1 class="h2">Dashboard</h1>
                <p class="text-muted">Welcome back, <?= escapeOutput($_SESSION['admin_username'] ?? 'Admin') ?>!</p>
            </div>
            <div class="col-md-4 text-end">
                <div id="toast-container"></div>
            </div>
        </div>
        
        <!-- Key Metrics Row -->
        <div class="row g-3 mt-2">
            <div class="col-md-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <p class="text-muted mb-1 small">Overall Rating</p>
                                <h4 class="mb-0"><?= $overall_avg_rating ?>/5.0</h4>
                                <small class="text-warning"><i class="bi bi-star-fill"></i> Average score</small>
                            </div>
                            <div class="text-warning fs-4">
                                <i class="bi bi-award"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <p class="text-muted mb-1 small">Completion Rate</p>
                                <h4 class="mb-0"><?= $completion_rate ?>%</h4>
                                <small class="text-success"><i class="bi bi-arrow-up"></i> Overall progress</small>
                            </div>
                            <div class="text-info fs-4">
                                <i class="bi bi-percent"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="card border-0 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <p class="text-muted mb-1 small">Active Teachers</p>
                                <h4 class="mb-0"><?= $total_teachers ?></h4>
                                <small class="text-primary"><i class="bi bi-person-fill"></i> Teaching staff</small>
                            </div>
                            <div class="text-primary fs-4">
                                <i class="bi bi-people-fill"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions Section -->
        <div class="row g-3 mt-3">
            <div class="col-md-3">
                <a href="questions.php" class="btn btn-primary w-100 py-2">
                    <i class="bi bi-plus-circle me-2"></i>Manage Questions
                </a>
            </div>
            <div class="col-md-3">
                <a href="teachers.php" class="btn btn-info w-100 py-2">
                    <i class="bi bi-people me-2"></i>Manage Teachers
                </a>
            </div>
            <div class="col-md-3">
                <a href="results.php" class="btn btn-success w-100 py-2">
                    <i class="bi bi-file-earmark me-2"></i>View Results
                </a>
            </div>
            <div class="col-md-3">
                <a href="analytics.php" class="btn btn-warning w-100 py-2">
                    <i class="bi bi-graph-up me-2"></i>Analytics
                </a>
            </div>
        </div>
        
        <!-- Top Performing Teachers -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light border-bottom">
                        <h5 class="mb-0"><i class="bi bi-trophy"></i> Top Performing Teachers</h5>
                    </div>
                    <div class="card-body">
                        <?php if (count($top_performers) > 0): ?>
                            <div class="row g-3">
                                <?php foreach ($top_performers as $index => $teacher): ?>
                                    <div class="col-md-4">
                                        <div class="card border-0" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);">
                                            <div class="card-body">
                                                <div class="d-flex align-items-center mb-3">
                                                    <div class="badge bg-primary rounded-circle" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                                        <?= '#' . ($index + 1) ?>
                                                    </div>
                                                    <div class="ms-3 flex-grow-1">
                                                        <h6 class="mb-0"><?= htmlspecialchars($teacher['name'] ?? 'Anonymous') ?></h6>
                                                    </div>
                                                </div>
                                                <div class="d-flex align-items-center">
                                                    <div class="flex-grow-1">
                                                        <small class="text-muted">Average Rating</small>
                                                        <div class="h5 mb-0"><?= $teacher['avg_rating'] ?>/5</div>
                                                    </div>
                                                    <div class="text-center">
                                                        <i class="bi bi-star-fill text-warning" style="font-size: 24px;"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <div class="text-center py-4">
                                <i class="bi bi-inbox" style="font-size: 48px; color: #cbd5e1;"></i>
                                <p class="text-muted mt-2">No evaluation data available yet</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        
        
        <!-- Charts Row -->
        <div class="row g-4">
            <!-- Pie Chart: Evaluation Distribution -->
            <div class="col-md-6">
                <div class="card border-0 shadow-sm h-100">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">Evaluation Status</h5>
                    </div>
                    <div class="card-body" style="height: 350px; display: flex; align-items: center;">
                        <canvas id="evaluationStatusChart" data-total-evals="<?= $total_evaluations ?>" data-total-teachers="<?= $total_teachers ?>"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recent Evaluations -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0">Recent Evaluations</h5>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table id="recentEvaluationsTable" class="table table-hover mb-0">
                                <thead class="table-light">
                                    <tr>
                                        <th>Teacher</th>
                                        <th>Date</th>
                                        <th>Average Rating</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php
                                    $count = 0;
                                    foreach ($recent_evaluations as $eval) {
                                        if ($count >= 5) break;
                                        
                                        // Handle teacher_id - use cached teachers
                                        $teacher_name = 'Anonymous';
                                        $teacher_id = $eval['teacher_id'] ?? null;
                                        
                                        if ($teacher_id) {
                                            // Look up in cache instead of querying database
                                            $teacher_id_str = (string)$teacher_id;
                                            if (isset($teachers_cache[$teacher_id_str])) {
                                                $teacher = $teachers_cache[$teacher_id_str];
                                                $teacher_array = iterator_to_array($teacher);
                                                $full_name = trim(($teacher_array['first_name'] ?? '') . ' ' . ($teacher_array['middle_name'] ?? '') . ' ' . ($teacher_array['last_name'] ?? ''));
                                                $teacher_name = !empty($full_name) ? htmlspecialchars($full_name, ENT_QUOTES) : 'Anonymous';
                                            }
                                        }
                                        
                                        $avg_rating = 0;
                                        
                                        // Handle MongoDB DateTime object
                                        $eval_date = 'N/A';
                                        if (isset($eval['submitted_at'])) {
                                            try {
                                                $date_obj = $eval['submitted_at'];
                                                if ($date_obj instanceof MongoDB\BSON\UTCDateTime) {
                                                    $timestamp = $date_obj->toDateTime();
                                                    $timestamp->setTimezone(new \DateTimeZone('Asia/Manila'));
                                                    $eval_date = $timestamp->format('Y-m-d H:i:s');
                                                } elseif ($date_obj instanceof DateTime) {
                                                    $date_obj->setTimezone(new \DateTimeZone('Asia/Manila'));
                                                    $eval_date = $date_obj->format('Y-m-d H:i:s');
                                                }
                                            } catch (Exception $e) {
                                                $eval_date = 'N/A';
                                            }
                                        }
                                        
                                        if (isset($eval['answers'])) {
                                            // Convert MongoDB BSONArray to PHP array
                                            $answers_array = iterator_to_array($eval['answers']);
                                            $ratings = array_column($answers_array, 'rating');
                                            $avg_rating = round(array_sum($ratings) / count($ratings), 1);
                                        }
                                        
                                        echo '
                                        <tr>
                                            <td>' . $teacher_name . '</td>
                                            <td>' . htmlspecialchars($eval_date, ENT_QUOTES) . '</td>
                                            <td>
                                                <span class="badge bg-success">' . $avg_rating . '/5</span>
                                            </td>
                                            <td>
                                                <a href="results.php" class="btn btn-sm btn-outline-primary">View</a>
                                            </td>
                                        </tr>
                                        ';
                                        $count++;
                                    }
                                    ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>  <!-- Close main-content -->

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script src="<?= ASSETS_URL ?>/js/api-service.js?v=2"></script>
    <script src="<?= ASSETS_URL ?>/js/main.js"></script>
    <script src="<?= ASSETS_URL ?>/js/global.js"></script>
    <script src="<?= ASSETS_URL ?>/js/confirmation.js"></script>
    <script src="<?= ASSETS_URL ?>/js/export-pdf.js"></script>
    <script src="<?= ASSETS_URL ?>/js/pages/dashboard.js"></script>
    
    <!-- Cache Buster - must load FIRST to clear old versions -->
    <script src="<?= ASSETS_URL ?>/js/cache-buster.js?v=<?= time() ?>"></script>
    
    <!-- Show Login Success Toast at Top Right -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            if (<?php echo $show_skeleton ? 'true' : 'false'; ?>) {
                setTimeout(function() {
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: 'Login Successful',
                        text: 'Welcome back!',
                        toast: true,
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                        customClass: {
                            container: 'login-toast-container'
                        },
                        didOpen: (toast) => {
                            toast.addEventListener('mouseenter', Swal.stopTimer)
                            toast.addEventListener('mouseleave', Swal.resumeTimer)
                        }
                    });
                }, 300);
            }
        });
    </script>
    
    <!-- Toast Positioning Style -->
    <style>
        .login-toast-container {
            top: 80px !important;
            right: 20px !important;
            z-index: 1050 !important;
        }
    </style>
    
    <!-- Footer -->
    <?php include '../includes/footer.php'; ?>
</body>
</html>

