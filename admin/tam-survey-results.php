<?php
/**
 * TAM Survey Results Dashboard - Admin Console
 * View and analyze Technology Acceptance Model survey responses
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

initializeSession();

// If admin_id is not in session, try to restore from session file
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

// Handle AJAX request for survey details
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['get_survey_details'])) {
    header('Content-Type: application/json');
    
    $surveyId = trim($_POST['get_survey_details']);
    
    try {
        global $db;
        $surveyCollection = $db->selectCollection('tam_survey');
        
        if (!isValidObjectId($surveyId)) {
            echo json_encode(['success' => false, 'message' => 'Invalid survey ID']);
            exit;
        }
        
        $survey = $surveyCollection->findOne(['_id' => new MongoDB\BSON\ObjectId($surveyId)]);
        
        if (!$survey) {
            echo json_encode(['success' => false, 'message' => 'Survey not found']);
            exit;
        }
        
        // TAM Question mapping
        $tamQuestions = [
            'PU1' => 'The teacher evaluation system will improve how I participate in teacher evaluations.',
            'PU2' => 'Using the teacher evaluation system will help me provide more effective feedback.',
            'PU3' => 'The teacher evaluation system will enhance the effectiveness of the evaluation process.',
            'PU4' => 'I find the teacher evaluation system useful.',
            'PEU1' => 'I find the teacher evaluation system easy to use.',
            'PEU2' => 'Learning how to use the teacher evaluation system is easy for me.',
            'PEU3' => 'It is easy for me to become skilled in using the teacher evaluation system.',
            'PEU4' => 'My interaction with the teacher evaluation system is clear.',
            'PEU5' => 'My interaction with the teacher evaluation system is understandable.',
            'PEU6' => 'It will be easy for me to find information or complete tasks through the system.',
            'AT1' => 'Using the teacher evaluation system is a good idea.',
            'AT2' => 'I feel positive towards using the teacher evaluation system.',
            'AT3' => 'I believe the teacher evaluation system helps me stay more engaged in the evaluation process.',
            'AT4' => 'I generally favor using a digital system to evaluate my teachers.',
            'AT5' => 'I believe it is a good idea for me to use this teacher evaluation system for my course/school evaluations in the future.',
            'BI1' => 'I intend to frequently use the teacher evaluation system to submit my evaluations.',
            'BI2' => 'I intend to use the teacher evaluation system regularly during the evaluation period.',
            'BI3' => 'I intend to use the teacher evaluation system throughout this semester and the next.',
            'BI4' => 'I intend to repetitively use the teacher evaluation system as often as possible.',
        ];
        
        // Format submitted_at
        $submitted_at = 'N/A';
        if ($survey['submitted_at'] instanceof MongoDB\BSON\UTCDateTime) {
            $dt = $survey['submitted_at']->toDateTime();
            $dt->setTimezone(new DateTimeZone('Asia/Manila'));
            $submitted_at = $dt->format('M d, Y h:i A');
        }
        
        // Group responses by category
        $responsesByCategory = [
            'PU' => ['name' => 'Perceived Usefulness', 'items' => []],
            'PEU' => ['name' => 'Perceived Ease of Use', 'items' => []],
            'AT' => ['name' => 'Attitude', 'items' => []],
            'BI' => ['name' => 'Behavioral Intention', 'items' => []],
        ];
        
        $responses = $survey['responses'] ?? [];
        $allRatings = [];
        
        foreach ($responses as $code => $rating) {
            $category = preg_replace('/[0-9]+/', '', $code);
            $allRatings[] = (float)$rating;
            
            if (isset($responsesByCategory[$category])) {
                $responsesByCategory[$category]['items'][] = [
                    'code' => $code,
                    'question' => $tamQuestions[$code] ?? 'Unknown question',
                    'rating' => (float)$rating
                ];
            }
        }
        
        // Calculate averages
        $categoryAverages = [];
        foreach ($responsesByCategory as $category => $data) {
            $categoryRatings = array_column($data['items'], 'rating');
            $categoryAverages[$category] = count($categoryRatings) > 0 ? round(array_sum($categoryRatings) / count($categoryRatings), 2) : 0;
        }
        
        $overallAverage = count($allRatings) > 0 ? round(array_sum($allRatings) / count($allRatings), 2) : 0;
        
        echo json_encode([
            'success' => true,
            'user_id' => $survey['user_id'] ?? 'Unknown',
            'department' => $survey['department'] ?? 'N/A',
            'age' => $survey['age'] ?? 'N/A',
            'sex' => $survey['sex'] ?? 'N/A',
            'year' => $survey['year'] ?? 'N/A',
            'course' => $survey['course'] ?? 'N/A',
            'submitted_at' => $submitted_at,
            'category_scores' => $survey['category_scores'] ?? $categoryAverages,
            'overall_score' => $survey['overall_score'] ?? $overallAverage,
            'responses_by_category' => $responsesByCategory,
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        exit;
    }
}

try {
    global $db;
    
    $surveyCollection = $db->selectCollection('tam_survey');
    
    // Get filter from query string
    $filterDepartment = isset($_GET['department']) ? trim($_GET['department']) : '';
    
    // Build query
    $query = [];
    if (!empty($filterDepartment)) {
        $query['department'] = $filterDepartment;
    }
    
    // Get all survey responses
    $cursor = $surveyCollection->find($query, ['sort' => ['submitted_at' => -1]]);
    $surveys = iterator_to_array($cursor);
    
    // Calculate department statistics
    $departmentStats = [
        'ECT' => ['count' => 0, 'avg_score' => 0],
        'CRIM' => ['count' => 0, 'avg_score' => 0],
        'EDUC' => ['count' => 0, 'avg_score' => 0],
        'BHT' => ['count' => 0, 'avg_score' => 0],
    ];
    
    $departmentScoreTotals = [
        'ECT' => 0,
        'CRIM' => 0,
        'EDUC' => 0,
        'BHT' => 0,
    ];
    
    $allSurveysCursor = $surveyCollection->find([], ['sort' => ['submitted_at' => -1]]);
    $allSurveys = iterator_to_array($allSurveysCursor);
    
    foreach ($allSurveys as $survey) {
        $dept = $survey['department'] ?? null;
        if (isset($departmentStats[$dept])) {
            $departmentStats[$dept]['count']++;
            $departmentScoreTotals[$dept] += $survey['overall_score'] ?? 0;
        }
    }
    
    // Calculate averages
    foreach ($departmentStats as $dept => $data) {
        if ($data['count'] > 0) {
            $departmentStats[$dept]['avg_score'] = round($departmentScoreTotals[$dept] / $data['count'], 2);
        }
    }
    
} catch (Exception $e) {
    die('Database error: ' . $e->getMessage());
}

// Helper function to get rating color
function getRatingColor($score) {
    if ($score >= 4.5) return '#10b981';      // Green
    if ($score >= 4.0) return '#3b82f6';      // Blue
    if ($score >= 3.0) return '#f59e0b';      // Amber
    return '#ef4444';                          // Red
}

function getRatingBadge($score) {
    if ($score >= 4.5) return '<span class="badge bg-success">Excellent</span>';
    if ($score >= 4.0) return '<span class="badge bg-info">Very Good</span>';
    if ($score >= 3.0) return '<span class="badge bg-warning text-dark">Good</span>';
    return '<span class="badge bg-danger">Needs Work</span>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TAM Survey Results - Teacher Evaluation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css">
    <style>
        body {
            background-color: #f5f7fa;
        }

        .main-content {
            background-color: #f5f7fa;
        }

        .survey-table-container {
            background: #ffffff;
            border-radius: 10px;
            padding: 20px;
            margin-top: 15px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid #e8ebf0;
        }

        .table {
            color: #333333;
        }

        .table th {
            background: #f8f9fb !important;
            border-bottom: 2px solid #e0e5eb !important;
            padding: 15px !important;
            font-weight: 600;
            color: #667eea !important;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }

        .table td {
            padding: 15px !important;
            vertical-align: middle;
            border-color: #e8ebf0 !important;
            color: #555555;
        }

        .table-hover tbody tr:hover {
            background: #f8f9fb !important;
        }

        .view-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }

        .view-btn:hover {
            background: #5568d3;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .export-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .export-btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
        }

        .no-data {
            text-align: center;
            padding: 40px;
            color: #999999;
            background: #ffffff;
            border-radius: 10px;
            border: 1px solid #e8ebf0;
        }

        .no-data h4 {
            color: #333333;
        }

        .no-data p {
            color: #999999;
        }

        .no-data i {
            font-size: 48px;
            color: #d0d5db;
            margin-bottom: 15px;
        }

        .rating-badge {
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }

        /* Detail Modal Styles */
        .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #5568d3 100%);
            border: none;
        }

        .modal-header .btn-close {
            filter: brightness(0) invert(1);
        }

        .modal-content {
            background: #ffffff !important;
            border: 1px solid #e8ebf0;
        }

        .modal-body {
            color: #333333;
        }

        .detail-card {
            background: #f8f9fb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
            border: 1px solid #e8ebf0;
        }

        .detail-card h6 {
            color: #667eea;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }

        .detail-card p {
            margin: 0;
            color: #555555;
            word-break: break-all;
        }

        .category-section {
            background: #f8f9fb;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid #e8ebf0;
        }

        .category-title {
            color: #667eea;
            font-weight: 600;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .question-item {
            background: #ffffff;
            padding: 12px;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 3px solid #667eea;
            border: 1px solid #e8ebf0;
        }

        .question-code {
            color: #667eea;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }

        .question-text {
            color: #555555;
            font-size: 13px;
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .question-rating {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .rating-value {
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
            min-width: 40px;
            text-align: center;
        }

        .category-score-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f8f9fb;
            border-radius: 6px;
            margin-bottom: 10px;
            border: 1px solid #e8ebf0;
        }

        .category-score-display strong {
            color: #333333;
        }

        .score-value {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 14px;
        }

        .dept-stat-card {
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .dept-stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
        }

        @media (max-width: 768px) {
            .view-btn {
                padding: 4px 8px;
                font-size: 12px;
            }

            .table td, .table th {
                padding: 10px !important;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/navbar.php'; ?>
    
    <div class="main-content">
        <div class="container-fluid py-5">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h1 style="margin: 0; display: flex; align-items: center; gap: 12px; font-size: 32px; color: #333333;">
                        <i class="bi bi-graph-up" style="font-size: 36px; color: #667eea;"></i>
                        TAM Survey Results
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #999999; font-size: 14px;">Technology Acceptance Model Survey Responses</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="export-btn" onclick="exportToCSV()">
                        <i class="bi bi-download"></i> Export CSV
                    </button>
                </div>
            </div>

            <!-- Department Filter -->
            <div class="row mb-3">
                <div class="col-md-3">
                    <form method="GET" class="d-flex gap-2" id="filterForm">
                        <select name="department" class="form-select form-select-sm" onchange="document.getElementById('filterForm').submit()" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px;">
                            <option value="">All Departments</option>
                            <option value="ECT" <?= $filterDepartment === 'ECT' ? 'selected' : '' ?>>ECT - Engineering & Computer Tech</option>
                            <option value="CRIM" <?= $filterDepartment === 'CRIM' ? 'selected' : '' ?>>CRIM - Criminology</option>
                            <option value="EDUC" <?= $filterDepartment === 'EDUC' ? 'selected' : '' ?>>EDUC - Education</option>
                            <option value="BHT" <?= $filterDepartment === 'BHT' ? 'selected' : '' ?>>BHT - Hospitality & Tourism</option>
                        </select>
                    </form>
                </div>
            </div>

            <?php if (count($surveys) > 0): ?>
                <!-- Summary Stats -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #5568d3 100%); padding: 20px; border-radius: 10px; text-align: center;">
                            <h3 style="font-size: 28px; font-weight: 700; color: white; margin: 0;">
                                <?= count($surveys) ?>
                            </h3>
                            <p style="color: rgba(255, 255, 255, 0.8); font-size: 13px; margin: 5px 0 0 0;">Total Responses</p>
                        </div>
                    </div>
                </div>

                <!-- Department Statistics -->
                <div class="row mb-4">
                    <?php 
                    $departmentNames = [
                        'ECT' => 'Engineering & Computer Tech',
                        'CRIM' => 'Criminology',
                        'EDUC' => 'Education',
                        'BHT' => 'Hospitality & Tourism'
                    ];
                    
                    $departmentColors = [
                        'ECT' => ['bg' => '#667eea', 'light' => '#667eea20', 'icon' => 'bi-cpu'],
                        'CRIM' => ['bg' => '#10b981', 'light' => '#10b98120', 'icon' => 'bi-shield-check'],
                        'EDUC' => ['bg' => '#f59e0b', 'light' => '#f59e0b20', 'icon' => 'bi-book'],
                        'BHT' => ['bg' => '#ec4899', 'light' => '#ec489920', 'icon' => 'bi-cup-hot']
                    ];
                    
                    foreach (['ECT', 'CRIM', 'EDUC', 'BHT'] as $dept): 
                        $stats = $departmentStats[$dept];
                        $color = $departmentColors[$dept];
                    ?>
                        <div class="col-md-3 mb-2">
                            <div style="background: <?= $color['light'] ?>; border: 2px solid <?= $color['bg'] ?>; padding: 18px; border-radius: 10px; text-align: center;">
                                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
                                    <i class="bi <?= $color['icon'] ?>" style="font-size: 24px; color: <?= $color['bg'] ?>;"></i>
                                </div>
                                <h4 style="font-size: 20px; font-weight: 700; color: <?= $color['bg'] ?>; margin: 0;">
                                    <?= $stats['count'] ?>
                                </h4>
                                <p style="color: <?= $color['bg'] ?>; font-size: 12px; margin: 5px 0 0 0; font-weight: 600; text-transform: uppercase;">
                                    <?= $dept ?>
                                </p>
                                <p style="color: #666; font-size: 11px; margin: 8px 0 0 0;">
                                    Avg Score: <strong style="color: <?= $color['bg'] ?>; font-size: 12px;"><?= $stats['avg_score'] ?>/5</strong>
                                </p>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <!-- Survey Results Table -->
                <div class="survey-table-container">
                    <table class="table table-striped table-hover" id="responsesTable">
                        <thead>
                            <tr>
                                <th style="width: 5%;">#</th>
                                <th style="width: 15%;">User ID</th>
                                <th style="width: 10%;">Department</th>
                                <th style="width: 10%;">PU</th>
                                <th style="width: 10%;">PEU</th>
                                <th style="width: 10%;">AT</th>
                                <th style="width: 10%;">BI</th>
                                <th style="width: 12%;">Overall</th>
                                <th style="width: 13%;">Submitted</th>
                                <th style="width: 10%; text-align: center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $counter = 1;
                            foreach ($surveys as $survey): 
                                $surveyId = $survey['_id'] ?? '';
                            ?>
                                <tr>
                                    <td><?= $counter++ ?></td>
                                    <td><small><?= substr($survey['user_id'] ?? 'Unknown', 0, 20) ?></small></td>
                                    <td>
                                        <span style="background: #667eea20; color: #667eea; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">
                                            <?= $survey['department'] ?? 'N/A' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="rating-badge" style="background: <?= getRatingColor($survey['category_scores']['PU'] ?? 0) ?>20; color: <?= getRatingColor($survey['category_scores']['PU'] ?? 0) ?>;">
                                            <?= $survey['category_scores']['PU'] ?? '-' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="rating-badge" style="background: <?= getRatingColor($survey['category_scores']['PEU'] ?? 0) ?>20; color: <?= getRatingColor($survey['category_scores']['PEU'] ?? 0) ?>;">
                                            <?= $survey['category_scores']['PEU'] ?? '-' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="rating-badge" style="background: <?= getRatingColor($survey['category_scores']['AT'] ?? 0) ?>20; color: <?= getRatingColor($survey['category_scores']['AT'] ?? 0) ?>;">
                                            <?= $survey['category_scores']['AT'] ?? '-' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="rating-badge" style="background: <?= getRatingColor($survey['category_scores']['BI'] ?? 0) ?>20; color: <?= getRatingColor($survey['category_scores']['BI'] ?? 0) ?>;">
                                            <?= $survey['category_scores']['BI'] ?? '-' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <span class="rating-badge" style="background: <?= getRatingColor($survey['overall_score'] ?? 0) ?>20; color: <?= getRatingColor($survey['overall_score'] ?? 0) ?>; font-weight: 700;">
                                            <?= $survey['overall_score'] ?? '-' ?>/5.0
                                        </span>
                                    </td>
                                    <td>
                                        <small>
                                            <?php 
                                            $date = $survey['submitted_at'] ?? null;
                                            if ($date instanceof MongoDB\BSON\UTCDateTime) {
                                                $dt = $date->toDateTime();
                                                $dt->setTimezone(new DateTimeZone('Asia/Manila'));
                                                echo $dt->format('M d, Y h:i A');
                                            }
                                            ?>
                                        </small>
                                    </td>
                                    <td style="text-align: center;">
                                        <button class="view-btn" onclick="viewSurveyDetails('<?= $surveyId ?>')">
                                            <i class="bi bi-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

            <?php else: ?>
                <!-- No Data -->
                <div class="no-data">
                    <i class="bi bi-inbox"></i>
                    <h4>No Survey Responses Yet</h4>
                    <p>Survey responses will appear here once students submit their responses.</p>
                </div>
            <?php endif; ?>

        </div>
    </div>

    <!-- Survey Details Modal -->
    <div class="modal fade" id="surveyDetailModal" tabindex="-1" aria-labelledby="surveyDetailLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="surveyDetailLabel" style="color: white;">
                        <i class="bi bi-file-earmark-pdf"></i> Survey Response Details
                    </h5>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button type="button" class="btn btn-sm btn-light" onclick="printSurveyDetails()" title="Print Survey">
                            <i class="bi bi-printer"></i> Print
                        </button>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                </div>
                <div class="modal-body" id="surveyDetailContent">
                    <div class="text-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- DataTables -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // Initialize DataTable
        $(document).ready(function() {
            $('#responsesTable').DataTable({
                "pageLength": 10,
                "order": [[7, 'desc']],
                "columnDefs": [
                    { "orderable": false, "targets": 8 } // Disable sorting on Action column
                ]
            });
        });

        // View Survey Details
        function viewSurveyDetails(surveyId) {
            const modal = new bootstrap.Modal(document.getElementById('surveyDetailModal'));
            const contentDiv = document.getElementById('surveyDetailContent');
            
            // Show loading
            contentDiv.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
            
            modal.show();
            
            // Fetch survey details
            fetch('tam-survey-results.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'get_survey_details=' + encodeURIComponent(surveyId)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    let html = '';
                    
                    // Header info
                    html += `
                        <div class="detail-card">
                            <h6><i class="bi bi-person"></i> User Information</h6>
                            <p><strong>User ID:</strong> ${data.user_id}</p>
                            <p><strong>Department:</strong> ${data.department}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h6><i class="bi bi-info-circle"></i> Demographic Information</h6>
                            <p><strong>Age:</strong> ${data.age}</p>
                            <p><strong>Sex:</strong> ${data.sex}</p>
                            <p><strong>Year:</strong> ${data.year}</p>
                            <p><strong>Course:</strong> ${data.course}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h6><i class="bi bi-clock"></i> Submitted Date</h6>
                            <p>${data.submitted_at}</p>
                        </div>
                        
                        <div class="detail-card">
                            <h6><i class="bi bi-star"></i> Overall Score</h6>
                            <p><strong style="font-size: 18px; color: #667eea;">${data.overall_score}/5.0</strong></p>
                        </div>
                    `;
                    
                    // Category scores
                    html += '<h5 style="color: #333333; margin-top: 20px; margin-bottom: 15px;">Category Scores</h5>';
                    const categoryNames = {
                        'PU': 'Perceived Usefulness',
                        'PEU': 'Perceived Ease of Use',
                        'AT': 'Attitude',
                        'BI': 'Behavioral Intention'
                    };
                    
                    for (const [category, score] of Object.entries(data.category_scores)) {
                        html += `
                            <div class="category-score-display">
                                <strong>${categoryNames[category] || category}:</strong>
                                <span class="score-value">${score}/5.0</span>
                            </div>
                        `;
                    }
                    
                    // Detailed responses by category
                    html += '<h5 style="color: #333333; margin-top: 20px; margin-bottom: 15px;">Detailed Responses</h5>';
                    
                    for (const [category, catData] of Object.entries(data.responses_by_category)) {
                        html += `
                            <div class="category-section">
                                <div class="category-title">
                                    <i class="bi bi-list-check"></i>
                                    ${catData.name}
                                </div>
                        `;
                        
                        catData.items.forEach(item => {
                            html += `
                                <div class="question-item">
                                    <div class="question-code">${item.code}</div>
                                    <div class="question-text">${item.question}</div>
                                    <div class="question-rating">
                                        <span class="rating-value">${item.rating}/5</span>
                                    </div>
                                </div>
                            `;
                        });
                        
                        html += '</div>';
                    }
                    
                    contentDiv.innerHTML = html;
                } else {
                    contentDiv.innerHTML = `<div class="alert alert-danger">Error: ${data.message}</div>`;
                }
            })
            .catch(error => {
                contentDiv.innerHTML = `<div class="alert alert-danger">Error loading survey details</div>`;
                console.error('Error:', error);
            });
        }

        // Print Survey Details
        function printSurveyDetails() {
            const printWindow = window.open('', '', 'height=1000,width=900');
            const contentDiv = document.getElementById('surveyDetailContent');
            const content = contentDiv.innerHTML;
            
            printWindow.document.write(`
                <html>
                <head>
                    <title>Survey Response Details - Print</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                    <style>
                        body {
                            background: white;
                            padding: 20px;
                            color: #333;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                        }
                        
                        .print-header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #667eea;
                            padding-bottom: 15px;
                        }
                        
                        .print-header h1 {
                            color: #667eea;
                            font-size: 24px;
                            margin: 0;
                        }
                        
                        .print-header p {
                            color: #999;
                            margin: 5px 0 0 0;
                            font-size: 12px;
                        }
                        
                        .detail-card {
                            background: #f8f9fb;
                            border-radius: 8px;
                            padding: 15px;
                            margin-bottom: 15px;
                            border-left: 4px solid #667eea;
                            border: 1px solid #e8ebf0;
                            page-break-inside: avoid;
                        }
                        
                        .detail-card h6 {
                            color: #667eea;
                            font-weight: 600;
                            margin-bottom: 8px;
                            text-transform: uppercase;
                            font-size: 12px;
                            letter-spacing: 0.5px;
                        }
                        
                        .detail-card p {
                            margin: 0;
                            color: #555;
                            font-size: 13px;
                        }
                        
                        .category-score-display {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 10px;
                            background: #f8f9fb;
                            border-radius: 6px;
                            margin-bottom: 10px;
                            border: 1px solid #e8ebf0;
                            page-break-inside: avoid;
                        }
                        
                        .score-value {
                            background: #667eea;
                            color: white;
                            padding: 5px 12px;
                            border-radius: 4px;
                            font-weight: 600;
                            font-size: 14px;
                        }
                        
                        .category-section {
                            background: #f8f9fb;
                            border-radius: 8px;
                            padding: 15px;
                            margin-bottom: 15px;
                            border: 1px solid #e8ebf0;
                            page-break-inside: avoid;
                        }
                        
                        .category-title {
                            color: #667eea;
                            font-weight: 600;
                            margin-bottom: 12px;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            font-size: 14px;
                        }
                        
                        .question-item {
                            background: #ffffff;
                            padding: 12px;
                            margin-bottom: 10px;
                            border-radius: 6px;
                            border: 1px solid #e8ebf0;
                            page-break-inside: avoid;
                        }
                        
                        .question-code {
                            color: #667eea;
                            font-weight: 600;
                            font-size: 11px;
                            text-transform: uppercase;
                            margin-bottom: 5px;
                        }
                        
                        .question-text {
                            color: #555;
                            font-size: 13px;
                            margin-bottom: 8px;
                            line-height: 1.4;
                        }
                        
                        .question-rating {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        }
                        
                        .rating-value {
                            background: #667eea;
                            color: white;
                            padding: 2px 8px;
                            border-radius: 4px;
                            font-weight: 600;
                            font-size: 12px;
                            min-width: 40px;
                            text-align: center;
                        }
                        
                        h5 {
                            color: #333 !important;
                            margin-top: 20px;
                            margin-bottom: 15px;
                            font-weight: 600;
                        }
                        
                        @media print {
                            body {
                                padding: 0;
                            }
                            .detail-card, .category-section, .question-item {
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1><i class="bi bi-file-earmark-pdf"></i> TAM Survey Response</h1>
                        <p>Technology Acceptance Model Survey Details</p>
                        <p style="font-size: 11px; margin-top: 10px;">Printed on: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                    </div>
                    ${content}
                </body>
                </html>
            `);
            
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }

        // Export to CSV
        function exportToCSV() {
            const table = document.getElementById('responsesTable');
            let csv = [];
            
            // Headers
            const headers = [];
            table.querySelectorAll('thead th').forEach((th, index) => {
                if (index < 8) { // Exclude Action column
                    headers.push(th.textContent.trim());
                }
            });
            csv.push(headers.join(','));
            
            // Rows
            table.querySelectorAll('tbody tr').forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach((td, index) => {
                    if (index < 8) { // Exclude Action column
                        row.push('"' + td.textContent.trim().replace(/"/g, '""') + '"');
                    }
                });
                csv.push(row.join(','));
            });
            
            // Download
            const csvContent = csv.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tam-survey-results-' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
        }
    </script>
</body>
</html>
