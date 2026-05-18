<?php
/**
 * Analytics Dashboard - Overall Evaluation Statistics & Charts
 * Shows comprehensive analytics across all evaluations
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

// Add HTTP cache headers - cache for 5 minutes (analytics don't change often)
header('Cache-Control: public, max-age=300'); // 5 minutes
header('Pragma: cache');

// Enable gzip compression if available
if (!ob_get_contents() && extension_loaded('zlib')) {
    ob_start('ob_gzhandler');
}

initializeSession();
requireLogin();

$success_msg = getSuccessMessage();
$error_msg = getErrorMessage();

// Get filter parameters
$start_date = isset($_GET['start_date']) ? $_GET['start_date'] : '';
$end_date = isset($_GET['end_date']) ? $_GET['end_date'] : '';
$department_filter = isset($_GET['department']) ? $_GET['department'] : '';

// Build filter for MongoDB queries
$match_filter = [];
if ($start_date || $end_date) {
    $match_filter['submitted_at'] = [];
    if ($start_date) {
        $start_ts = strtotime($start_date);
        $match_filter['submitted_at']['$gte'] = new MongoDB\BSON\UTCDateTime($start_ts * 1000);
    }
    if ($end_date) {
        $end_ts = strtotime($end_date . ' 23:59:59');
        $match_filter['submitted_at']['$lte'] = new MongoDB\BSON\UTCDateTime($end_ts * 1000);
    }
}

// Calculate statistics using MongoDB aggregation instead of loading all data
$total_evaluations = $evaluations_collection->estimatedDocumentCount();

$teacher_stats = [];
$overall_ratings = ['1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0];
$all_ratings = [];
$timeline_data = []; // For trends
$department_data = []; // For department comparison

// Try to get cached results (cache for 15 minutes)
$cache_key = 'analytics_cache_' . date('Y-m-d-H-i', time() / 900 * 900); // 15min bucket
$cache_file = sys_get_temp_dir() . '/' . $cache_key . '.json';
$cache_ttl = 900; // 15 minutes

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    // Use cached results
    $cached = json_decode(file_get_contents($cache_file), true);
    $teacher_stats = $cached['teacher_stats'];
    $overall_ratings = $cached['overall_ratings'];
    $all_ratings = $cached['all_ratings'];
} else {
    // Calculate fresh results using optimized aggregation
    try {
        $pipeline = [];
        
        // Add match filter if date range provided
        if (!empty($match_filter)) {
            $pipeline[] = ['$match' => $match_filter];
        }
        
        // Project only fields we need
        $pipeline[] = [
            '$project' => [
                'teacher_id' => 1,
                'answers' => 1,
                'submitted_at' => 1,
                'date_key' => [
                    '$dateToString' => [
                        'format' => '%Y-%m-%d',
                        'date' => '$submitted_at'
                    ]
                ]
            ]
        ];
        
        // Unwind answers array
        $pipeline[] = ['$unwind' => '$answers'];
        
        // Group by teacher
        $pipeline[] = [
            '$group' => [
                '_id' => '$teacher_id',
                'total_evals' => ['$sum' => 1],
                'avg_rating' => ['$avg' => '$answers.rating'],
                'all_ratings' => ['$push' => '$answers.rating']
            ]
        ];
        
        // Sort by rating descending
        $pipeline[] = ['$sort' => ['avg_rating' => -1]];
        
        // Limit to top 500 teachers
        $pipeline[] = ['$limit' => 500];
        
        $result = $evaluations_collection->aggregate($pipeline);
        
        foreach ($result as $stat) {
            $teacher_id = (string)$stat['_id'];
            $ratings = isset($stat['all_ratings']) ? $stat['all_ratings'] : [];
            
            // Convert MongoDB BSON array to PHP array
            if (is_object($ratings)) {
                $ratings = iterator_to_array($ratings);
            }
        
            $teacher_stats[$teacher_id] = [
                'total_evals' => $stat['total_evals'] ?? 0,
                'avg_rating' => round($stat['avg_rating'] ?? 0, 2),
                'ratings' => array_map('intval', $ratings)
            ];
            
            // Count overall rating distribution
            foreach ($ratings as $rating) {
                $rating = (int)$rating;
                if ($rating >= 1 && $rating <= 5) {
                    $overall_ratings[$rating]++;
                    $all_ratings[] = $rating;
                }
            }
        }
        
        // Get timeline data (evaluations per day)
        $timeline_pipeline = [];
        if (!empty($match_filter)) {
            $timeline_pipeline[] = ['$match' => $match_filter];
        }
        $timeline_pipeline[] = [
            '$group' => [
                '_id' => [
                    '$dateToString' => [
                        'format' => '%Y-%m-%d',
                        'date' => '$submitted_at'
                    ]
                ],
                'count' => ['$sum' => 1]
            ]
        ];
        $timeline_pipeline[] = ['$sort' => ['_id' => 1]];
        $timeline_pipeline[] = ['$limit' => 30];
        
        $timeline_result = $evaluations_collection->aggregate($timeline_pipeline);
        foreach ($timeline_result as $item) {
            $timeline_data[$item['_id']] = $item['count'];
        }
        
    } catch (\Exception $e) {
        error_log('Analytics aggregation error: ' . $e->getMessage());
    }
}

// Get list of all teachers for reference (with field projection for speed)
$teachers = $teachers_collection->find(
    [],
    [
        'projection' => [
            'first_name' => 1,
            'last_name' => 1,
            'middle_name' => 1,
            'department' => 1,
            'email' => 1
        ],
        'limit' => 1000
    ]
)->toArray();

// Calculate Key Insights
$insights = [];
if (!empty($teacher_stats)) {
    $ratings_arr = array_values($overall_ratings);
    $total_ratings = array_sum($ratings_arr);
    
    // Find top and bottom performers
    $sorted_teachers = $teacher_stats;
    uasort($sorted_teachers, function($a, $b) {
        return $b['avg_rating'] <=> $a['avg_rating'];
    });
    
    $top_performer = array_slice($sorted_teachers, 0, 1);
    $bottom_performer = array_slice($sorted_teachers, -1, 1);
    
    // Get top performer name
    if (!empty($top_performer)) {
        $tp_id = key($top_performer);
        foreach ($teachers as $t) {
            if ((string)$t['_id'] === $tp_id) {
                $tp_name = formatFullName(
                    $t['first_name'] ?? '',
                    $t['middle_name'] ?? '',
                    $t['last_name'] ?? ''
                );
                $insights['top_performer'] = $tp_name;
                $insights['top_rating'] = $top_performer[$tp_id]['avg_rating'];
                break;
            }
        }
    }
    
    // Get bottom performer name
    if (!empty($bottom_performer)) {
        $bp_id = key($bottom_performer);
        foreach ($teachers as $t) {
            if ((string)$t['_id'] === $bp_id) {
                $bp_name = formatFullName(
                    $t['first_name'] ?? '',
                    $t['middle_name'] ?? '',
                    $t['last_name'] ?? ''
                );
                $insights['bottom_performer'] = $bp_name;
                $insights['bottom_rating'] = $bottom_performer[$bp_id]['avg_rating'];
                break;
            }
        }
    }
    
    // Calculate completion rate
    $total_teachers_count = count($teachers);
    $evaluated_teachers = count($teacher_stats);
    $insights['completion_rate'] = $total_teachers_count > 0 
        ? round(($evaluated_teachers / $total_teachers_count) * 100, 1)
        : 0;
    
    // Overall trend
    $insights['overall_average'] = !empty($all_ratings) 
        ? round(array_sum($all_ratings) / count($all_ratings), 2)
        : 0;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics - Teacher Evaluation System</title>
    <!-- Preload critical styles for faster rendering -->
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" as="style">
    <link rel="preload" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0" as="style">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" media="print" onload="this.media='all'">
    
    <!-- Real-Time Notifications Toast - SYNCHRONOUS load (critical for visibility) -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/notification-toast.css">
    
    <!-- Non-critical CSS - load asynchronously -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/analytics.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/skeleton-loader.css" media="print" onload="this.media='all'">
    
    <!-- Chart.js - defer loading until page is interactive -->
    <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
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
        <!-- Header -->
        <div class="row mb-4">
            <div class="col-md-6">
                <h1 class="h2"><i class="bi bi-pie-chart"></i> Analytics Dashboard</h1>
                <p class="text-muted">View evaluation analytics and insights</p>
            </div>
            <div class="col-md-6 text-end">
                <?php
                    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                    $isProduction = strpos($host, 'localhost') === false && strpos($host, '127.0.0.1') === false;
                    $adminBase = $isProduction ? '/admin' : '/teacher-eval/admin';
                ?>
                <button class="btn btn-secondary me-2" onclick="document.getElementById('filterForm').reset(); location.href='analytics.php';">
                    <i class="bi bi-arrow-clockwise"></i> Reset
                </button>
                <a href="<?= $adminBase ?>/export-evaluations.php" class="btn btn-info">
                    <i class="bi bi-download"></i> Export CSV
                </a>
            </div>
        </div>

        <!-- Filters -->
        <div class="card border-0 shadow-sm mb-4">
            <div class="card-header bg-light">
                <h6 class="mb-0"><i class="bi bi-funnel"></i> Filters</h6>
            </div>
            <div class="card-body">
                <form id="filterForm" method="GET" class="row g-3">
                    <div class="col-md-4">
                        <label class="form-label">Start Date</label>
                        <input type="date" class="form-control" name="start_date" value="<?= escapeOutput($start_date) ?>">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">End Date</label>
                        <input type="date" class="form-control" name="end_date" value="<?= escapeOutput($end_date) ?>">
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                        <button type="submit" class="btn btn-primary w-100">
                            <i class="bi bi-search"></i> Apply Filters
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <?php if ($success_msg): ?>
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                <i class="bi bi-check-circle"></i> <?= escapeOutput($success_msg) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <?php if ($error_msg): ?>
            <div class="alert alert-danger alert-dismissible fade show" role="alert">
                <i class="bi bi-exclamation-circle"></i> <?= escapeOutput($error_msg) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <!-- Summary Statistics - Simple Design -->
        <div class="row g-3 mb-4">
            <div class="col-lg-3 col-md-6">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; border-left: 4px solid #8b5cf6; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">📊 Total Evaluations</p>
                        <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;"><?= $total_evaluations ?></h2>
                    </div>
                    <div style="font-size: 32px; opacity: 0.3;">📈</div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; border-left: 4px solid #8b5cf6; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">👨‍🏫 Teachers Evaluated</p>
                        <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;"><?= count($teacher_stats) ?></h2>
                    </div>
                    <div style="font-size: 32px; opacity: 0.3;">👥</div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; border-left: 4px solid #06b6d4; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">⭐ Overall Average</p>
                        <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;"><?= $insights['overall_average'] ?? '0.00' ?>/5</h2>
                    </div>
                    <div style="font-size: 32px; opacity: 0.3;">🌟</div>
                </div>
            </div>
            <div class="col-lg-3 col-md-6">
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; border-left: 4px solid #f59e0b; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <p style="margin: 0 0 8px 0; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">📝 Completion Rate</p>
                        <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;"><?= $insights['completion_rate'] ?? '0' ?>%</h2>
                    </div>
                    <div style="font-size: 32px; opacity: 0.3;">💬</div>
                </div>
            </div>
        </div>

        <!-- Key Insights -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0"><i class="bi bi-lightbulb"></i> Key Insights</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div style="padding: 15px; background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px; margin-bottom: 15px;">
                                    <small class="text-muted d-block">Top Performer</small>
                                    <strong style="color: #000000; font-size: 16px;">
                                        <?= $insights['top_performer'] ?? 'N/A' ?>
                                    </strong>
                                    <small class="text-success d-block mt-1">★ <?= $insights['top_rating'] ?? '0' ?>/5</small>
                                </div>
                                <div style="padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                                    <small class="text-muted d-block">Needs Improvement</small>
                                    <strong style="color: #000000; font-size: 16px;">
                                        <?= $insights['bottom_performer'] ?? 'N/A' ?>
                                    </strong>
                                    <small class="text-warning d-block mt-1">★ <?= $insights['bottom_rating'] ?? '0' ?>/5</small>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div style="padding: 15px; background: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 15px;">
                                    <small class="text-muted d-block">Completion Rate</small>
                                    <strong style="color: #000000; font-size: 16px;">
                                        <?= $insights['completion_rate'] ?? '0' ?>%
                                    </strong>
                                    <small class="text-muted d-block mt-1"><?= count($teacher_stats) ?> of <?= count($teachers) ?> teachers evaluated</small>
                                </div>
                                <div style="padding: 15px; background: #e0e7ff; border-left: 4px solid #6366f1; border-radius: 4px;">
                                    <small class="text-muted d-block">Overall Rating Trend</small>
                                    <strong style="color: #000000; font-size: 16px;">
                                        <?= $insights['overall_average'] ?? '0' ?>/5.0
                                    </strong>
                                    <small class="text-muted d-block mt-1"><?= count($all_ratings) ?> total ratings</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Top Teachers -->
        <div class="row mt-5">
            <div class="col-md-6">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0"><i class="bi bi-star-fill"></i> Teacher Ratings Summary</h5>
                    </div>
                    <div class="card-body">
                        <?php if (count($teacher_stats) > 0): ?>
                            <div style="max-height: 500px; overflow-y: auto;">
                                <?php foreach ($teachers as $teacher): 
                                    $teacher_id = (string)$teacher['_id'];
                                    if (!isset($teacher_stats[$teacher_id])) continue;
                                    
                                    $stats = $teacher_stats[$teacher_id];
                                    $overall_avg = $stats['avg_rating'];
                                    $teacher_name = formatFullName((string)($teacher['first_name'] ?? ''), (string)($teacher['middle_name'] ?? ''), (string)($teacher['last_name'] ?? ''));
                                    
                                    // Determine badge class
                                    if ($overall_avg >= 4.5) $badge_class = 'badge-excellent';
                                    elseif ($overall_avg >= 4.0) $badge_class = 'badge-good';
                                    elseif ($overall_avg >= 3.0) $badge_class = 'badge-average';
                                    elseif ($overall_avg >= 2.0) $badge_class = 'badge-poor';
                                    else $badge_class = 'badge-very-poor';
                                ?>
                                <div class="teacher-rating-row">
                                    <div>
                                        <div style="font-weight: 600; margin-bottom: 8px;"><?= escapeOutput($teacher_name) ?></div>
                                        <small class="text-muted"><?= escapeOutput($teacher['department'] ?? '') ?> • <?= $stats['total_evals'] ?> evaluations</small>
                                        <div style="margin-top: 8px;">
                                            <span class="badge-ratings badge-excellent">Avg Rating: <?= number_format($stats['avg_rating'], 1) ?>/5</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div class="badge-ratings <?= $badge_class ?>" style="font-size: 16px; padding: 10px 16px;">
                                            <?= number_format($overall_avg, 2) ?>/5.0
                                        </div>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <p class="text-muted text-center py-4">No evaluation data available yet.</p>
                        <?php endif; ?>
                    </div>
                </div>
            </div>

            <!-- Rating Distribution Chart -->
            <div class="col-md-6">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0"><i class="bi bi-pie-chart"></i> Rating Distribution</h5>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 300px; position: relative;">
                            <canvas id="distributionChart" 
                                data-rating-1="<?= $overall_ratings['1'] ?>"
                                data-rating-2="<?= $overall_ratings['2'] ?>"
                                data-rating-3="<?= $overall_ratings['3'] ?>"
                                data-rating-4="<?= $overall_ratings['4'] ?>"
                                data-rating-5="<?= $overall_ratings['5'] ?>">
                            </canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Trends Chart -->
        <div class="row mt-4">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-light">
                        <h5 class="mb-0"><i class="bi bi-graph-up"></i> Evaluation Trends</h5>
                    </div>
                    <div class="card-body">
                        <div style="height: 350px; position: relative;">
                            <canvas id="trendsChart" 
                                data-labels="<?= htmlspecialchars(json_encode(array_keys($timeline_data)), ENT_QUOTES) ?>"
                                data-values="<?= htmlspecialchars(json_encode(array_values($timeline_data)), ENT_QUOTES) ?>">
                            </canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </div>  <!-- Close main-content -->

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="<?= ASSETS_URL ?>/js/api-service.js?v=2"></script>
    <script src="<?= ASSETS_URL ?>/js/main.js"></script>
    <script src="<?= ASSETS_URL ?>/js/global.js"></script>
    <script src="<?= ASSETS_URL ?>/js/confirmation.js"></script>
    <script src="<?= ASSETS_URL ?>/js/export-pdf.js"></script>
    <script src="<?= ASSETS_URL ?>/js/pages/analytics.js"></script>
    
    <!-- Initialization Script -->
    <script>
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
            
            // Ensure Chart library and function are available before initializing
            setTimeout(() => {
                if (typeof initializeAnalyticsCharts === 'function' && typeof Chart !== 'undefined') {
                    try {
                        initializeAnalyticsCharts();
                    } catch (error) {
                        console.error('Failed to initialize analytics charts:', error);
                    }
                }
            }, 500);
        });
    </script>
    
    <!-- Footer -->
    <?php include '../includes/footer.php'; ?>
</body>
</html>
