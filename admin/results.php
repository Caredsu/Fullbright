<?php
/**
 * Evaluation Results & Analytics
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

initializeSession();
requireLogin();

// ==================== AJAX GET EVALUATION DETAILS ====================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['get_eval_details'])) {
    header('Content-Type: application/json');
    
    $eval_id = trim($_POST['get_eval_details']);
    
    if (!isValidObjectId($eval_id)) {
        echo json_encode(['success' => false, 'message' => 'Invalid evaluation ID']);
        exit;
    }
    
    try {
        $eval = $evaluations_collection->findOne(['_id' => new MongoDB\BSON\ObjectId($eval_id)]);
        
        if (!$eval) {
            echo json_encode(['success' => false, 'message' => 'Evaluation not found']);
            exit;
        }
        
        $teacher = $teachers_collection->findOne(['_id' => new MongoDB\BSON\ObjectId($eval['teacher_id'])]);
        $teacher_name = 'Unknown';
        if ($teacher) {
            $teacher_name = formatFullName(
                (string)($teacher['first_name'] ?? ''),
                (string)($teacher['middle_name'] ?? ''),
                (string)($teacher['last_name'] ?? '')
            );
        }
        
        $answers = [];
        $ratings = [];
        if (isset($eval['answers'])) {
            $answers_array = iterator_to_array($eval['answers']);
            foreach ($answers_array as $answer) {
                $question_id = $answer['question_id'] ?? 'N/A';
                $rating = $answer['rating'] ?? 0;
                $ratings[] = (float)$rating;
                
                // Get question text from questions collection
                $question_text = $question_id;
                if (isValidObjectId($question_id)) {
                    $question = $questions_collection->findOne(['_id' => new MongoDB\BSON\ObjectId($question_id)]);
                    if ($question && isset($question['question_text'])) {
                        $question_text = $question['question_text'];
                    }
                }
                
                $answers[] = [
                    'question' => $question_text,
                    'rating' => $rating
                ];
            }
        }
        
        // Calculate average and qualitative assessment
        $avg_rating = count($ratings) > 0 ? round(array_sum($ratings) / count($ratings), 2) : 0;
        $qualitative = getQualitativeAssessment($avg_rating);
        
        // Format submitted_at with Manila timezone
        $submitted_at_formatted = 'N/A';
        if ($eval['submitted_at'] instanceof \MongoDB\BSON\UTCDateTime) {
            $dt = $eval['submitted_at']->toDateTime();
            $dt->setTimezone(new \DateTimeZone('Asia/Manila'));
            $submitted_at_formatted = $dt->format('M d, Y h:i A');
        }
        
        // Get overall feedback if available
        $feedback = $eval['feedback'] ?? 'No feedback provided';
        
        // Get student_id if available
        $student_id = $eval['student_id'] ?? 'Anonymous';
        
        echo json_encode([
            'success' => true,
            'teacher_name' => $teacher_name,
            'student_id' => $student_id,
            'submitted_at' => $submitted_at_formatted,
            'feedback' => $feedback,
            'avg_rating' => $avg_rating,
            'qualitative' => $qualitative['rating'],
            'qualitative_color' => $qualitative['badge_bg'],
            'qualitative_description' => $qualitative['description'],
            'answers' => $answers
        ]);
        exit;
    } catch (\Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        exit;
    }
}

$filter_teacher_id = getGET('teacher_id', '');
$filter_from_date = getGET('from_date', '');
$filter_to_date = getGET('to_date', '');
$filter_min_rating = getGET('min_rating', '');
$filter_academic_year = getGET('academic_year', '');
$filter_semester = getGET('semester', '');

// Get all teachers for filter dropdown (with field projection - 75% faster)
$teachers = $teachers_collection->find([], [
    'projection' => ['_id' => 1, 'first_name' => 1, 'last_name' => 1, 'name' => 1]
]);
$teachers_list = [];
foreach ($teachers as $teacher) {
    $teachers_list[] = $teacher;
}

// Get available academic years from evaluations
require_once '../app/Models/Evaluation.php';
$evaluationModel = new \App\Models\Evaluation($evaluations_collection);
$available_years = $evaluationModel->getAcademicYears();

// Build evaluations query
$query = [];

// Teacher filter
if (!empty($filter_teacher_id) && isValidObjectId($filter_teacher_id)) {
    $query['teacher_id'] = new MongoDB\BSON\ObjectId($filter_teacher_id);
}

// Academic year filter
if (!empty($filter_academic_year)) {
    $query['academic_year'] = $filter_academic_year;
}

// Semester filter
if (!empty($filter_semester) && in_array((int)$filter_semester, [1, 2])) {
    $query['semester'] = (int)$filter_semester;
}

// Date range filters
if (!empty($filter_from_date)) {
    try {
        $from_timestamp = strtotime($filter_from_date);
        if ($from_timestamp !== false) {
            $query['submitted_at']['$gte'] = new MongoDB\BSON\UTCDateTime($from_timestamp * 1000);
        }
    } catch (Exception $e) {
        // Invalid date format, skip filter
    }
}

if (!empty($filter_to_date)) {
    try {
        // Set to end of day
        $to_timestamp = strtotime($filter_to_date . ' 23:59:59');
        if ($to_timestamp !== false) {
            $query['submitted_at']['$lte'] = new MongoDB\BSON\UTCDateTime($to_timestamp * 1000);
        }
    } catch (Exception $e) {
        // Invalid date format, skip filter
    }
}

// Minimum rating filter - requires calculating average per evaluation
$min_rating = null;
if (!empty($filter_min_rating) && is_numeric($filter_min_rating)) {
    $min_rating = (float)$filter_min_rating;
}

// Pagination settings (removed - DataTables will handle)
// $per_page = 10;
// $current_page = max(1, (int)getGET('page', 1));
// $offset = ($current_page - 1) * $per_page;

// Get ALL evaluations first (with field projection - 75% faster)
$all_evaluations = $evaluations_collection->find($query, [
    'projection' => ['teacher_id' => 1, 'answers' => 1, 'submitted_at' => 1, 'academic_year' => 1, 'semester' => 1, 'feedback' => 1],
    'sort' => ['submitted_at' => -1]
])->toArray();

// Apply minimum rating filter (client-side calculation)
if ($min_rating !== null) {
    $filtered_evals = [];
    foreach ($all_evaluations as $eval) {
        if (isset($eval['answers'])) {
            $answers_array = iterator_to_array($eval['answers']);
            $ratings = array_column($answers_array, 'rating');
            if (!empty($ratings)) {
                $avg = array_sum($ratings) / count($ratings);
                if ($avg >= $min_rating) {
                    $filtered_evals[] = $eval;
                }
            }
        }
    }
    $all_evaluations = $filtered_evals;
}

// DataTables will handle pagination - show all evaluations
$total_evaluations = count($all_evaluations);
$total_pages = 1;
$current_page = 1;

// For DataTables, pass all evaluations
$evaluations = $all_evaluations;

// Calculate statistics
$stats = [];
$question_stats = [];

if (!empty($evaluations)) {
    // Get all questions
    $questions_all = $questions_collection->find();
    $questions_map = [];
    foreach ($questions_all as $q) {
        $questions_map[objectIdToString($q['_id'])] = $q['question_text'];
    }
    
    // Process evaluations
    foreach ($evaluations as $eval) {
        if (isset($eval['answers'])) {
            foreach ($eval['answers'] as $answer) {
                $q_id = $answer['question_id'];
                $rating = $answer['rating'];
                
                if (!isset($question_stats[$q_id])) {
                    $question_stats[$q_id] = [
                        'total' => 0,
                        'sum' => 0,
                        'count' => 0,
                        'ratings' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0]
                    ];
                }
                
                $question_stats[$q_id]['total']++;
                $question_stats[$q_id]['sum'] += $rating;
                $question_stats[$q_id]['count']++;
                $question_stats[$q_id]['ratings'][$rating]++;
            }
        }
    }
    
    // Calculate averages
    foreach ($question_stats as $q_id => &$stats_item) {
        $stats_item['avg'] = $stats_item['count'] > 0 ? round($stats_item['sum'] / $stats_item['count'], 2) : 0;
    }
}

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Results - Teacher Evaluation System</title>
    <!-- Preload critical CSS -->
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" as="style">
    <link rel="preload" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0" as="style">
    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- DataTables CSS -->
    <link href="https://cdn.datatables.net/1.13.7/css/dataTables.bootstrap5.min.css" rel="stylesheet" media="print" onload="this.media='all'">
    <!-- Responsive extension disabled due to compatibility issues -->
    <!-- <link href="https://cdn.datatables.net/responsive/2.5.0/css/responsive.bootstrap5.min.css" rel="stylesheet"> -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" media="print" onload="this.media='all'">
    
    <!-- Chart.js - defer loading -->
    <script defer src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    
    <!-- Real-Time Notifications Toast - SYNCHRONOUS load (critical for visibility) -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/notification-toast.css">
    
    <!-- Non-critical CSS - async load -->
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/results.css" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/results-advanced.css">
    
    <!-- DataTables Dark Theme Customization -->
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
        <style>
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        </style>
    </div>
    
    <!-- Main Content Wrapper -->
    <div class="content-loader">
        <div class="container-fluid py-5">
        <div class="row mb-4">
            <div class="col-md-6">
                <h1 class="h2"><i class="bi bi-clipboard-check"></i> Evaluation Results</h1>
                <p class="text-muted">View and analyze evaluation results</p>
            </div>
            <div class="col-md-6 text-end">
                <?php if (!empty($filter_teacher_id)): ?>
                    <button class="btn btn-outline-info me-2" onclick="printTeacherResults('<?= escapeOutput($filter_teacher_id) ?>')">
                        <i class="bi bi-printer"></i> Print Teacher Results
                    </button>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Detailed Evaluations Card with Integrated Filters -->
        <div class="row">
            <div class="col-12">
                <div class="card border-0 shadow-sm">
                    <!-- Collapsible Filter Header -->
                    <div class="card-header p-0" style="background: linear-gradient(135deg, #f1f5f9 0%, #ffffff 100%); border-left: 4px solid #8b5cf6;">
                        <button class="btn w-100 text-start p-3" type="button" data-bs-toggle="collapse" data-bs-target="#filterPanel" style="color: #1e293b; font-weight: 600; font-size: 15px;">
                            <i class="bi bi-funnel-fill" style="color: #8b5cf6; margin-right: 8px;"></i>🔍 Advanced Filters
                            <i class="bi bi-chevron-down float-end" id="filterToggle" style="transition: transform 0.3s ease;"></i>
                        </button>
                    </div>
                    
                    <!-- Collapsible Filter Panel -->
                    <div class="collapse" id="filterPanel">
                        <div class="card-body" style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <form method="GET" class="row g-3" id="filterForm">
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <label for="teacher_filter" class="form-label" style="font-weight: 500; color: #000000; font-size: 12px;">
                                        <i class="bi bi-person-fill" style="color: #8b5cf6;"></i> Teacher
                                    </label>
                                    <select class="form-select form-select-sm" id="teacher_filter" name="teacher_id" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px; background: #ffffff; color: #1e293b;">
                                        <option value="" style="background: #ffffff; color: #1e293b;">All Teachers</option>
                                        <?php
                                        foreach ($teachers_list as $teacher) {
                                            $teacher_id = objectIdToString($teacher['_id']);
                                            $selected = $teacher_id === $filter_teacher_id ? 'selected' : '';
                                            $full_name = formatFullName(
                                                $teacher['first_name'] ?? '',
                                                $teacher['middle_name'] ?? '',
                                                $teacher['last_name'] ?? ''
                                            );
                                            echo '<option value="' . escapeOutput($teacher_id) . '" ' . $selected . ' style="background: #ffffff; color: #1e293b;">' . escapeOutput($full_name) . '</option>';
                                        }
                                        ?>
                                    </select>
                                </div>

                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <label for="academic_year" class="form-label" style="font-weight: 500; color: #000000; font-size: 12px;">
                                        <i class="bi bi-book" style="color: #8b5cf6;"></i> Year
                                    </label>
                                    <select class="form-select form-select-sm" id="academic_year" name="academic_year" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px; background: #ffffff; color: #1e293b;">
                                        <option value="" style="background: #ffffff; color: #1e293b;">All Years</option>
                                        <?php
                                        foreach ($available_years as $year) {
                                            $selected = $year === $filter_academic_year ? 'selected' : '';
                                            echo '<option value="' . escapeOutput($year) . '" ' . $selected . ' style="background: #ffffff; color: #1e293b;">' . escapeOutput($year) . '</option>';
                                        }
                                        ?>
                                    </select>
                                </div>

                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <label for="semester" class="form-label" style="font-weight: 500; color: #000000; font-size: 12px;">
                                        <i class="bi bi-calendar2-quarter" style="color: #10b981;"></i> Semester
                                    </label>
                                    <select class="form-select form-select-sm" id="semester" name="semester" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px; background: #ffffff; color: #1e293b;">
                                        <option value="" style="background: #ffffff; color: #1e293b;">All</option>
                                        <option value="1" <?= $filter_semester === '1' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">1st (Jan-Jun)</option>
                                        <option value="2" <?= $filter_semester === '2' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">2nd (Jul-Dec)</option>
                                    </select>
                                </div>

                                <div class="col-lg-2 col-md-6 col-sm-12">
                                    <label for="from_date" class="form-label" style="font-weight: 500; color: #000000; font-size: 12px;">
                                        <i class="bi bi-calendar-event" style="color: #8b5cf6;"></i> From
                                    </label>
                                    <input type="date" class="form-control form-control-sm" id="from_date" name="from_date" value="<?= escapeOutput($filter_from_date) ?>" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px; background: #ffffff; color: #1e293b;">
                                </div>

                                <div class="col-lg-2 col-md-6 col-sm-12">
                                    <label for="to_date" class="form-label" style="font-weight: 500; color: #000000; font-size: 12px;">
                                        <i class="bi bi-calendar-check" style="color: #8b5cf6;"></i> To
                                    </label>
                                    <input type="date" class="form-control form-control-sm" id="to_date" name="to_date" value="<?= escapeOutput($filter_to_date) ?>" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px; background: #ffffff; color: #1e293b;">
                                </div>

                                <div class="col-lg-2 col-md-6 col-sm-12">
                                    <label for="min_rating" class="form-label" style="font-weight: 500; color: #000000; font-size: 12px;">
                                        <i class="bi bi-star-fill" style="color: #ffc107;"></i> Min Rating
                                    </label>
                                    <select class="form-select form-select-sm" id="min_rating" name="min_rating" style="border-radius: 6px; border: 1.5px solid #cbd5e1; padding: 8px 10px; font-size: 13px; background: #ffffff; color: #1e293b;">
                                        <option value="" style="background: #ffffff; color: #1e293b;">All</option>
                                        <option value="1" <?= $filter_min_rating === '1' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">1+ ⭐</option>
                                        <option value="2" <?= $filter_min_rating === '2' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">2+ ⭐</option>
                                        <option value="3" <?= $filter_min_rating === '3' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">3+ ⭐</option>
                                        <option value="4" <?= $filter_min_rating === '4' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">4+ ⭐</option>
                                        <option value="5" <?= $filter_min_rating === '5' ? 'selected' : '' ?> style="background: #ffffff; color: #1e293b;">5 ⭐</option>
                                    </select>
                                </div>

                                <div class="col-12 pt-2">
                                    <button type="submit" class="btn btn-sm" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 6px; font-weight: 500; padding: 8px 16px;">
                                        <i class="bi bi-search"></i> Apply Filters
                                    </button>
                                    <?php if ($filter_teacher_id || $filter_from_date || $filter_to_date || $filter_min_rating || $filter_academic_year || $filter_semester): 
                                        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                                        $isProduction = strpos($host, 'localhost') === false && strpos($host, '127.0.0.1') === false;
                                        $adminBase = $isProduction ? '/admin' : '/teacher-eval/admin';
                                    ?>
                                        <a href="<?= $adminBase ?>/results.php" class="btn btn-sm" style="color: #ffffff; background: #3b4a5c; border: 1px solid #555; border-radius: 6px; margin-left: 5px;">
                                            <i class="bi bi-arrow-clockwise"></i> Clear All
                                        </a>
                                    <?php endif; ?>
                                </div>

                                <!-- Active Filters Display -->
                                <?php
                                $active_filters = [];
                                if (!empty($filter_teacher_id)) {
                                    $teacher = $teachers_collection->findOne(['_id' => new MongoDB\BSON\ObjectId($filter_teacher_id)]);
                                    if ($teacher) {
                                        $active_filters[] = '<span class="badge bg-info text-dark">👨‍🏫 ' . formatFullName((string)($teacher['first_name'] ?? ''), (string)($teacher['middle_name'] ?? ''), (string)($teacher['last_name'] ?? '')) . '</span>';
                                    }
                                }
                                if (!empty($filter_academic_year)) {
                                    $active_filters[] = '<span class="badge bg-info text-dark">📚 ' . escapeOutput($filter_academic_year) . '</span>';
                                }
                                if (!empty($filter_semester)) {
                                    $sem_text = $filter_semester === '1' ? '1st Sem' : '2nd Sem';
                                    $active_filters[] = '<span class="badge bg-info text-dark">📋 ' . $sem_text . '</span>';
                                }
                                if (!empty($filter_from_date)) {
                                    $active_filters[] = '<span class="badge bg-secondary">📅 ' . escapeOutput($filter_from_date) . '</span>';
                                }
                                if (!empty($filter_to_date)) {
                                    $active_filters[] = '<span class="badge bg-secondary">📅 ' . escapeOutput($filter_to_date) . '</span>';
                                }
                                if (!empty($filter_min_rating)) {
                                    $active_filters[] = '<span class="badge bg-warning text-dark">⭐ ' . escapeOutput($filter_min_rating) . '+</span>';
                                }
                                
                                if (!empty($active_filters)): ?>
                                    <div class="col-12 pt-2" style="border-top: 1px solid #555;">
                                        <small style="color: #000000; font-weight: 500;">Active: </small>
                                        <?= implode(' ', $active_filters) ?>
                                    </div>
                                <?php endif; ?>
                            </form>
                        </div>
                    </div>
                    
                    <!-- DataTable Section -->
                    <div class="card-body">
                        <div class="table-responsive">
                            <table id="evaluationsTable" class="table table-hover table-striped mb-0 w-100">
                                <thead class="table-light">
                                    <tr>
                                        <th>Teacher</th>
                                        <th>Submitted Date</th>
                                        <th>Academic Year</th>
                                        <th>Semester</th>
                                        <th>Avg Rating</th>
                                        <th>Responses</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php
                                    foreach ($evaluations as $eval) {
                                        if (!isValidObjectId($eval['teacher_id'])) continue;
                                        
                                        $teacher = $teachers_collection->findOne(['_id' => new MongoDB\BSON\ObjectId($eval['teacher_id'])]);
                                        $avg_rating = 0;
                                        
                                        if (isset($eval['answers'])) {
                                            $answers_array = iterator_to_array($eval['answers']);
                                            $ratings = [];
                                            foreach ($answers_array as $answer) {
                                                if (isset($answer['rating'])) {
                                                    $ratings[] = (float)$answer['rating'];
                                                }
                                            }
                                            $avg_rating = count($ratings) > 0 ? round(array_sum($ratings) / count($ratings), 1) : 0;
                                        }
                                        
                                        // Get qualitative assessment
                                        $qualitative = getQualitativeAssessment($avg_rating);
                                        
                                        $teacher_name = 'Unknown';
                                        if ($teacher) {
                                            $teacher_name = formatFullName(
                                                (string)($teacher['first_name'] ?? ''),
                                                (string)($teacher['middle_name'] ?? ''),
                                                (string)($teacher['last_name'] ?? '')
                                            );
                                        }
                                        
                                        $eval_id = objectIdToString($eval['_id']);
                                        $submitted_date = formatDateTime($eval['submitted_at'] ?? '');
                                        $academic_year = $eval['academic_year'] ?? 'N/A';
                                        $semester = isset($eval['semester']) ? ($eval['semester'] === 1 ? '1st Sem' : '2nd Sem') : 'N/A';
                                        $response_count = isset($eval['answers']) ? count($eval['answers']) : 0;
                                        
                                        echo '
                                        <tr>
                                            <td class="fw-500"><i class="bi bi-person-fill me-2" style="color: #8b5cf6;"></i>' . escapeOutput($teacher_name) . '</td>
                                            <td><small class="text-muted">' . escapeOutput($submitted_date) . '</small></td>
                                            <td><span class="badge bg-info text-dark">' . escapeOutput($academic_year) . '</span></td>
                                            <td><span class="badge bg-secondary">' . escapeOutput($semester) . '</span></td>
                                            <td>
                                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                                    <div class="rating-badge" style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white; padding: 4px 10px; border-radius: 12px; display: inline-block; font-weight: bold; font-size: 13px;">⭐ ' . $avg_rating . '/5</div>
                                                    <span class="badge" style="background: ' . $qualitative['color'] . '; color: white; display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px;">' . escapeOutput($qualitative['rating']) . '</span>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-light text-dark">' . $response_count . '</span></td>
                                            <td><button class="btn btn-sm btn-primary btn-view-eval" data-eval-id="' . escapeOutput($eval_id) . '" title="View Details"><i class="bi bi-eye"></i> View</button></td>
                                        </tr>
                                        ';
                                    }
                                    ?>
                                </tbody>
                            </table>
                        </div>
                    
                    </div>
                </div>
            </div>
        </div>
        
        <?php if (empty($evaluations)): ?>
        <div class="alert alert-info text-center py-5">
            <i class="bi bi-info-circle fs-2"></i>
            <p class="mt-3">No evaluations found yet.</p>
        </div>
        <?php endif; ?>
        
        <!-- Question-wise Analysis Charts -->
        <?php if (!empty($question_stats)): ?>
        <div class="row mt-5">
            <div class="col-12">
                <h3 class="mb-4" style="color: #000000;">
                    <i class="bi bi-graph-up" style="color: #8b5cf6;"></i> Question Analysis
                </h3>
            </div>
            <?php
            foreach ($question_stats as $q_id => $stats) {
                $question_text = isset($questions_map[$q_id]) ? $questions_map[$q_id] : 'Unknown Question';
                ?>
                <div class="col-md-6 mb-4">
                    <div class="card border-0 shadow-sm" style="background: #ffffff; border: 1px solid #e2e8f0;">
                        <div class="card-header" style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0;">
                            <div class="row">
                                <div class="col-md-8">
                                    <h6 class="mb-0" style="color: #000000;"><?= escapeOutput($question_text) ?></h6>
                                </div>
                                <div class="col-md-4 text-end">
                                    <span class="badge" style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white;">Avg: <?= $stats['avg'] ?>/5</span>
                                </div>
                            </div>
                        </div>
                        <div class="card-body" style="padding: 20px;">
                            <canvas id="chart_<?= escapeOutput($q_id) ?>"></canvas>
                        </div>
                    </div>
                </div>
                <?php
            }
            ?>
        </div>
        <?php endif; ?>
    </div>
    </div>  <!-- Close main-content -->

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="<?= ASSETS_URL ?>/js/api-service.js?v=2"></script>
    <script src="<?= ASSETS_URL ?>/js/main.js"></script>
    <script src="<?= ASSETS_URL ?>/js/confirmation.js"></script>
    <script>
        // DataTable and filter initialization
        // Chart generation removed - using integrated filter layout instead
        
        // Generate charts for each question
        <?php foreach ($question_stats as $q_id => $stats): ?>
        const ctx_<?= str_replace('-', '_', str_replace(['{', '}', '$', '.'], '_', $q_id)) ?> = document.getElementById('chart_<?= escapeOutput($q_id) ?>');
        if (ctx_<?= str_replace('-', '_', str_replace(['{', '}', '$', '.'], '_', $q_id)) ?>) {
            new Chart(ctx_<?= str_replace('-', '_', str_replace(['{', '}', '$', '.'], '_', $q_id)) ?>.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['1 ⭐', '2 ⭐', '3 ⭐', '4 ⭐', '5 ⭐'],
                    datasets: [{
                        label: 'Number of Responses',
                        data: [
                            <?= $stats['ratings'][1] ?>,
                            <?= $stats['ratings'][2] ?>,
                            <?= $stats['ratings'][3] ?>,
                            <?= $stats['ratings'][4] ?>,
                            <?= $stats['ratings'][5] ?>
                        ],
                        backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#198754'],
                        borderColor: ['#c82333', '#e77600', '#ffb300', '#1e7e34', '#15692f'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#ffffff',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            titleColor: '#000000',
                            bodyColor: '#000000'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#999' },
                            grid: { color: '#3d5066' }
                        },
                        x: {
                            ticks: { color: '#999' },
                            grid: { color: '#3d5066' }
                        }
                    }
                }
            });
        }
        <?php endforeach; ?>
        
        // Get CSRF token
        function getCSRFToken() {
            return document.querySelector('input[name="csrf_token"]')?.value || '';
        }
        
        // Print Teacher Results
        function printTeacherResults(teacherId) {
            Swal.fire({
                title: 'Generating Report...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: async (modal) => {
                    Swal.showLoading();
                    
                    try {
                        const response = await fetch(`/teacher-eval/api/export-pdf.php?type=results&teacher_id=${teacherId}`);
                        
                        if (!response.ok) {
                            throw new Error(`HTTP Error: ${response.status}`);
                        }
                        
                        const result = await response.json();
                        
                        if (!result.success) {
                            Swal.fire('Error', result.message || 'Failed to generate report', 'error');
                            return;
                        }
                        
                        const data = result.data;
                        
                        // Create printable HTML
                        const printWindow = window.open('', '', 'width=900,height=600');
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <title>${data.teacher_name} - Evaluation Results</title>
                                <style>
                                    * { margin: 0; padding: 0; box-sizing: border-box; }
                                    body {
                                        font-family: Arial, sans-serif;
                                        padding: 20px;
                                        background: white;
                                        color: #333;
                                        line-height: 1.6;
                                    }
                                    .header {
                                        text-align: center;
                                        margin-bottom: 30px;
                                        padding-bottom: 20px;
                                        border-bottom: 2px solid #333;
                                    }
                                    .logo {
                                        height: 60px;
                                        width: 60px;
                                        border-radius: 50%;
                                        margin: 0 auto 10px;
                                        object-fit: cover;
                                    }
                                    h1 {
                                        font-size: 22px;
                                        margin-bottom: 5px;
                                        text-transform: uppercase;
                                        letter-spacing: 1px;
                                    }
                                    .subtitle {
                                        font-size: 12px;
                                        color: #666;
                                        margin: 5px 0;
                                    }
                                    .title {
                                        text-align: center;
                                        margin-bottom: 20px;
                                        font-size: 18px;
                                        font-weight: bold;
                                        text-transform: uppercase;
                                        letter-spacing: 0.5px;
                                    }
                                    .info-section {
                                        margin-bottom: 20px;
                                        padding: 15px;
                                        background: #f5f5f5;
                                        border-radius: 6px;
                                        border-left: 4px solid #667eea;
                                    }
                                    .info-section h3 {
                                        font-size: 12px;
                                        color: #667eea;
                                        text-transform: uppercase;
                                        margin-bottom: 8px;
                                        font-weight: bold;
                                    }
                                    .info-section p {
                                        font-size: 14px;
                                        margin: 5px 0;
                                    }
                                    table {
                                        width: 100%;
                                        margin-bottom: 20px;
                                        border-collapse: collapse;
                                        font-size: 12px;
                                    }
                                    th {
                                        background: #f1f5f9;
                                        color: #000000;
                                        padding: 12px;
                                        text-align: left;
                                        font-weight: 600;
                                    }
                                    td {
                                        padding: 10px;
                                        border-bottom: 1px solid #ddd;
                                    }
                                    tr:nth-child(even) {
                                        background: #f9f9f9;
                                    }
                                    tr:hover {
                                        background: #f0f0f0;
                                    }
                                    .rating-badge {
                                        background: #667eea;
                                        color: white;
                                        padding: 4px 8px;
                                        border-radius: 4px;
                                        display: inline-block;
                                        font-weight: bold;
                                    }
                                    .footer {
                                        text-align: center;
                                        margin-top: 30px;
                                        padding-top: 20px;
                                        border-top: 1px solid #ddd;
                                        font-size: 11px;
                                        color: #999;
                                    }
                                    @media print {
                                        body { margin: 0; padding: 10px; }
                                        .no-print { display: none; }
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="header">
                                    <img src="<?= ASSETS_URL ?>/img/2.png" alt="Logo" class="logo">
                                    <h1>FULLBRIGHT COLLEGE INC</h1>
                                    <p class="subtitle">KM 5 National Highway, San Jose, Puerto Princesa, Philippines, 5300</p>
                                    <p class="subtitle">Email: fullbrightcollege@yahoo.com</p>
                                </div>
                                
                                <div class="title">Teacher Evaluation Results</div>
                                
                                <div class="info-section">
                                    <h3>Evaluatee Information</h3>
                                    <p><strong>Teacher Name:</strong> ${escapeHtml(data.teacher_name)}</p>
                                    <p><strong>Department:</strong> ${escapeHtml(data.department || 'N/A')}</p>
                                    <p><strong>Total Evaluations:</strong> ${data.evaluations.length}</p>
                                </div>
                                
                                <div class="info-section">
                                    <h3>Summary Statistics</h3>
                                    <p><strong>Overall Average Rating:</strong> <span class="rating-badge">${data.overall_avg}/5</span></p>
                                    <p><strong>Highest Rating:</strong> ${data.highest_rating}/5</p>
                                    <p><strong>Lowest Rating:</strong> ${data.lowest_rating}/5</p>
                                </div>
                                
                                <h3 style="margin: 20px 0 10px; font-size: 14px; font-weight: bold;">Individual Evaluations</h3>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Submission Date</th>
                                            <th>Average Rating</th>
                                            <th>Feedback</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.evaluations.map(eval => `
                                            <tr>
                                                <td>${escapeHtml(eval.submitted_date)}</td>
                                                <td><span class="rating-badge">${eval.avg_rating}/5</span></td>
                                                <td>${escapeHtml(eval.feedback.substring(0, 100))}${eval.feedback.length > 100 ? '...' : ''}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                                
                                <div class="footer">
                                    <p>Generated on: ${new Date().toLocaleString()}</p>
                                    <p style="margin-top: 10px;">This document is confidential and intended for administrative purposes only.</p>
                                </div>
                                
                                <div class="no-print" style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #ddd;">
                                    <button onclick="window.print()" style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Print</button>
                                    <button onclick="window.close()" style="padding: 10px 20px; background: #ccc; color: #333; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; font-size: 14px;">Close</button>
                                </div>
                            </body>
                            </html>
                        `);
                        printWindow.document.close();
                        
                        // Auto-print if not already in print preview
                        setTimeout(() => {
                            Swal.close();
                        }, 500);
                        
                    } catch (error) {
                        console.error('Error:', error);
                        Swal.fire('Error', 'Failed to generate report: ' + error.message, 'error');
                    }
                }
            });
        }
        
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Setup view buttons
        document.querySelectorAll('.btn-view-eval').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const evalId = this.getAttribute('data-eval-id');
                viewEvaluationDetails(evalId);
            });
        });
        
        // Fetch and display evaluation details
        function viewEvaluationDetails(evalId) {
            const formData = new FormData();
            formData.append('get_eval_details', evalId);
            
            fetch('/teacher-eval/admin/results.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayEvalDetails(data);
                    const modal = new bootstrap.Modal(document.getElementById('evalDetailsModal'));
                    modal.show();
                } else {
                    Toast.error(data.message || 'Failed to load evaluation details');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                Toast.error('Error loading evaluation details');
            });
        }
        
        // Display evaluation details in modal
        function displayEvalDetails(data) {
            let html = '<div class="evaluation-details">';
            html += '<div class="mb-3" style="color: #000000;"><strong style="color: #000000;">Teacher:</strong> ' + escapeHtml(data.teacher_name) + '</div>';
            if (data.student_id) {
                html += '<div class="mb-3" style="color: #000000;"><strong style="color: #000000;">Student Number:</strong> ' + escapeHtml(data.student_id) + '</div>';
            }
            html += '<div class="mb-3" style="color: #000000;"><strong style="color: #000000;">Submitted:</strong> ' + escapeHtml(data.submitted_at) + '</div>';
            html += '<div class="mb-3" style="color: #000000;"><strong style="color: #000000;">Overall Rating:</strong> <span class="badge" style="background: ' + data.qualitative_color + '; color: white; padding: 6px 12px; font-size: 13px;">⭐ ' + data.avg_rating + '/5 - ' + escapeHtml(data.qualitative) + '</span></div>';
            html += '<div class="mb-3" style="color: #666; font-size: 13px;"><em>' + escapeHtml(data.qualitative_description) + '</em></div>';
            html += '<hr style="border-color: #e2e8f0;">';
            html += '<h6 style="color: #000000;">Ratings by Question:</h6>';
            html += '<div class="table-responsive">';
            html += '<table class="table table-sm" style="color: #000000;">';
            html += '<thead style="background: #f1f5f9; color: #000000; border-bottom: 2px solid #e2e8f0;"><tr><th>Question</th><th>Rating</th></tr></thead>';
            html += '<tbody>';
            
            if (data.answers && data.answers.length > 0) {
                data.answers.forEach((answer, index) => {
                    const rowBg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
                    html += '<tr style="background: ' + rowBg + '; color: #000000;">';
                    html += '<td style="color: #000000;">' + escapeHtml(answer.question) + '</td>';
                    html += '<td><span class="badge" style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white;">' + answer.rating + '/5</span></td>';
                    html += '</tr>';
                });
            } else {
                html += '<tr><td colspan="2" class="text-center" style="color: #999;">No ratings found</td></tr>';
            }
            
            html += '</tbody></table></div>';
            html += '<hr style="border-color: #e2e8f0;">';
            html += '<h6 style="color: #000000;">Qualitative Feedback:</h6>';
            html += '<div style="background: #f8fafc; color: #000000; padding: 15px; border-radius: 6px; border-left: 3px solid #8b5cf6; min-height: 80px; word-wrap: break-word;">' + escapeHtml(data.feedback) + '</div>';
            html += '</div>';
            
            const container = document.getElementById('evalDetailsContent');
            container.className = '';
            container.innerHTML = html;
        }
        
        // Simple HTML escape function
        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
    
    <!-- Evaluation Details Modal -->
    <div class="modal fade" id="evalDetailsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content" style="background: #ffffff; color: #000000; border: none; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                <div class="modal-header" style="background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 15px 20px;">
                    <h5 class="modal-title" style="color: #000000; margin: 0;">Evaluation Details</h5>
                    <button type="button" class="btn-close btn-close-dark" data-bs-dismiss="modal" aria-label="Close" style="opacity: 0.7;"></button>
                </div>
                <div class="modal-body" style="background: #ffffff; max-height: 70vh; overflow-y: auto;">
                    <div id="evalDetailsContent" class="spinner-border text-dark" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
                <div class="modal-footer" style="background: #f1f5f9; border-top: 1px solid #e2e8f0;">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
    
    <style>
        /* Fix modal backdrop transparency */
        .modal.fade .modal-dialog {
            transition: transform .3s ease-out;
        }
        
        .modal-backdrop {
            --bs-backdrop-bg: #000;
            --bs-backdrop-opacity: 0.5 !important;
        }
        
        .modal-backdrop.show {
            opacity: 0.5 !important;
        }
    </style>
    
    <!-- Footer -->
    <?php include '../includes/footer.php'; ?>
    
    <!-- DataTables JS Libraries -->
    <script src="https://code.jquery.com/jquery-3.7.0.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.7/js/dataTables.bootstrap5.min.js"></script>
    <!-- Responsive extension disabled due to compatibility issues -->
    <!-- <script src="https://cdn.datatables.net/responsive/2.5.0/js/responsive.bootstrap5.min.js"></script> -->
    
    <!-- DataTables Initialization & Enhanced Features -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Hide skeleton loader
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
            
            // Chevron rotation animation for filter collapse
            const filterPanel = document.getElementById('filterPanel');
            const filterToggle = document.getElementById('filterToggle');
            
            filterPanel.addEventListener('show.bs.collapse', function() {
                filterToggle.style.transform = 'rotate(180deg)';
            });
            
            filterPanel.addEventListener('hide.bs.collapse', function() {
                filterToggle.style.transform = 'rotate(0deg)';
            });
            
            // Initialize DataTable
            let table;
            try {
                table = new DataTable('#evaluationsTable', {
                    responsive: true,
                    pageLength: 10,
                    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']],
                    order: [[1, 'desc']],
                    language: {
                        search: ' Quick Search:',
                        lengthMenu: 'Show _MENU_ per page',
                        info: 'Showing _START_ to _END_ of _TOTAL_ evaluations',
                        infoEmpty: 'No evaluations available',
                        infoFiltered: '(filtered from _MAX_ total)',
                        paginate: {
                            first: '« First',
                            last: 'Last »',
                            next: 'Next ›',
                            previous: '‹ Previous'
                        }
                    },
                    columnDefs: [
                        { orderable: false, targets: [6] },
                        { className: 'text-center', targets: [4, 5, 6] }
                    ],
                    dom: '<"top mb-2"<"row g-2"<"col-md-6"l><"col-md-6"f>>>' +
                         '<"table-wrapper"tr>' +
                         '<"bottom mt-3"<"row"<"col-md-6"i><"col-md-6"p>>>',
                    drawCallback: function() {
                        // Reattach event listeners after DataTable redraws
                        attachViewButtonListeners();
                        
                        // Style the paging elements
                        $('.dataTables_paginate').addClass('pagination pagination-sm justify-content-end');
                        $('.paginate_button').addClass('page-item');
                        $('.paginate_button a').addClass('page-link');
                        $('.paginate_button.current a').closest('.page-item').addClass('active');
                    }
                });
            } catch (error) {
                console.error('Error initializing DataTable:', error);
                // Suppress errors from responsive extension and continue
                table = new DataTable('#evaluationsTable', {
                    responsive: false,  // Disable responsive to avoid errors
                    pageLength: 10,
                    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']],
                    order: [[1, 'desc']],
                    language: {
                        search: ' Quick Search:',
                        lengthMenu: 'Show _MENU_ per page',
                        info: 'Showing _START_ to _END_ of _TOTAL_ evaluations',
                        infoEmpty: 'No evaluations available',
                        infoFiltered: '(filtered from _MAX_ total)',
                        paginate: {
                            first: '« First',
                            last: 'Last »',
                            next: 'Next ›',
                            previous: '‹ Previous'
                        }
                    },
                    columnDefs: [
                        { orderable: false, targets: [6] },
                        { className: 'text-center', targets: [4, 5, 6] }
                    ],
                    dom: '<"top mb-2"<"row g-2"<"col-md-6"l><"col-md-6"f>>>' +
                         '<"table-wrapper"tr>' +
                         '<"bottom mt-3"<"row"<"col-md-6"i><"col-md-6"p>>>'
                });
            }
            
            // Attach view button listeners
            attachViewButtonListeners();
            
            // Update record count
            updateRecordCount();
            table.on('draw', updateRecordCount);
            
            function updateRecordCount() {
                const info = table.page.info();
                const recordCountEl = document.getElementById('recordCount');
                if (recordCountEl) {
                    recordCountEl.textContent = info.recordsDisplay;
                }
            }
            
            function attachViewButtonListeners() {
                document.querySelectorAll('.btn-view-eval').forEach(btn => {
                    // Remove existing listener if any
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                    
                    newBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const evalId = this.getAttribute('data-eval-id');
                        viewEvaluationDetails(evalId);
                    });
                });
            }
        });
    </script>
</body>
</html>

