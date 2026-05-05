<?php
/**
 * Admin Dashboard - Main Page with Multi-Tab Interface
 */

session_start();

// Check if user is logged in
if (!isset($_SESSION['admin_id'])) {
    header('Location: login.php');
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

// Add HTTP cache headers (3 minutes)
header('Cache-Control: public, max-age=180'); // 3 minutes
header('Pragma: cache');

// Enable gzip compression if available
if (!ob_get_contents() && extension_loaded('zlib')) {
    ob_start('ob_gzhandler');
}

use MongoDB\BSON\ObjectId;

$db = Database::getInstance();
$teachersCollection = $db->getCollection('teachers');
$evaluationsCollection = $db->getCollection('evaluations');

// Use aggregation pipeline instead of N+1 queries!
$teacherStats = [];
try {
    // Optimized pipeline: project fields early, limit scope, then aggregate
    $pipeline = [
        // Project only fields we need
        [
            '$project' => [
                'teacher_id' => 1,
                'ratings' => 1
            ]
        ],
        // Group by teacher
        [
            '$group' => [
                '_id' => '$teacher_id',
                'count' => ['$sum' => 1],
                'avgTeaching' => ['$avg' => '$ratings.teaching'],
                'avgCommunication' => ['$avg' => '$ratings.communication'],
                'avgKnowledge' => ['$avg' => '$ratings.knowledge'],
            ]
        ],
        // Sort by count descending
        ['$sort' => ['count' => -1]],
        // Limit to top 100 teachers
        ['$limit' => 100]
    ];
    
    $statsResult = $evaluationsCollection->aggregate($pipeline);
    foreach ($statsResult as $stat) {
        $teacherId = (string)$stat['_id'];
        $teaching = $stat['avgTeaching'] ?? 0;
        $communication = $stat['avgCommunication'] ?? 0;
        $knowledge = $stat['avgKnowledge'] ?? 0;
        
        $teacherStats[$teacherId] = [
            'count' => $stat['count'],
            'avgTeaching' => round($teaching, 2),
            'avgCommunication' => round($communication, 2),
            'avgKnowledge' => round($knowledge, 2),
            'overallAvg' => round(($teaching + $communication + $knowledge) / 3, 2)
        ];
    }
} catch (\Exception $e) {
    error_log('Aggregation error: ' . $e->getMessage());
}

// Get only teachers that have evaluations (limit to 100 for performance, with field projection)
$teachers = $teachersCollection->find(
    [],
    [
        'projection' => [
            'first_name' => 1,
            'last_name' => 1,
            'middle_name' => 1,
            'department' => 1,
            'email' => 1,
            'status' => 1
        ],
        'limit' => 100
    ]
)->toArray();

// Calculate overall statistics - use aggregation instead of loading all data
$totalEvaluations = $evaluationsCollection->estimatedDocumentCount();
$avgOverallRating = 0;
try {
    $statsResult = $evaluationsCollection->aggregate([
        [
            '$group' => [
                '_id' => null,
                'avgTeaching' => ['$avg' => '$ratings.teaching'],
                'avgCommunication' => ['$avg' => '$ratings.communication'],
                'avgKnowledge' => ['$avg' => '$ratings.knowledge'],
            ]
        ]
    ])->toArray();
    
    if (count($statsResult) > 0) {
        $stats = $statsResult[0];
        $teaching = $stats['avgTeaching'] ?? 0;
        $communication = $stats['avgCommunication'] ?? 0;
        $knowledge = $stats['avgKnowledge'] ?? 0;
        $avgOverallRating = round(($teaching + $communication + $knowledge) / 3, 2);
    }
} catch (\Exception $e) {
    error_log('Overall stats aggregation error: ' . $e->getMessage());
}

// Get top-rated teachers (by overall average)
$topTeachers = array_filter($teachers, function($teacher) use ($teacherStats) {
    $tid = (string)$teacher['_id'];
    return $teacherStats[$tid]['count'] > 0;
});
usort($topTeachers, function($a, $b) use ($teacherStats) {
    $tidA = (string)$a['_id'];
    $tidB = (string)$b['_id'];
    return $teacherStats[$tidB]['overallAvg'] <=> $teacherStats[$tidA]['overallAvg'];
});
$topTeachers = array_slice($topTeachers, 0, 3);

// Get lowest-rated teachers
$bottomTeachers = array_reverse($topTeachers);
$bottomTeachers = array_slice($bottomTeachers, 0, 3);

// Determine current tab
$currentTab = isset($_GET['tab']) ? $_GET['tab'] : 'dashboard';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Teacher Evaluation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/admin-dashboard.css">
</head>
<body>
    <!-- Top Navbar -->
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-brand">
                🎓 Teacher Evaluation System
            </div>
            <div class="nav-user">
                <div class="user-info">
                    <p>Welcome, <strong><?= htmlspecialchars($_SESSION['username']) ?></strong></p>
                    <p style="font-size: 12px; opacity: 0.9;"><?= ucfirst($_SESSION['role']) ?></p>
                </div>
                <form method="POST" action="logout.php" style="display: inline;">
                    <button type="submit" class="logout-btn">Logout</button>
                </form>
            </div>
        </div>
    </nav>
    
    <!-- Tab Navigation -->
    <div class="tabs-container">
        <div class="tabs">
            <button class="tab-btn <?= $currentTab === 'dashboard' ? 'active' : '' ?>" onclick="switchTab('dashboard')">
                📊 Dashboard
            </button>
            <button class="tab-btn <?= $currentTab === 'teachers' ? 'active' : '' ?>" onclick="switchTab('teachers')">
                👨‍🏫 Teachers
            </button>
            <button class="tab-btn <?= $currentTab === 'results' ? 'active' : '' ?>" onclick="switchTab('results')">
                📈 Results
            </button>
        </div>
    </div>
    
    <!-- Main Content -->
    <div class="container">
        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content <?= $currentTab === 'dashboard' ? 'active' : '' ?>">
            <div class="header">
                <h1>📊 Dashboard</h1>
                <p>Real-time overview of teacher evaluations</p>
            </div>
            
            <!-- Stats Cards -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Teachers</div>
                    <div class="stat-value"><?= count($teachers) ?></div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Evaluations</div>
                    <div class="stat-value"><?= $totalEvaluations ?></div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Overall Average Rating</div>
                    <div class="stat-value"><?= $avgOverallRating ?> ⭐</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Evaluation Period</div>
                    <div class="stat-value" style="font-size: 18px;"><?= date('Y-m-d') ?></div>
                </div>
            </div>
            
            <!-- Top Rated Teachers -->
            <div class="section">
                <h2>⭐ Top-Rated Teachers</h2>
                <?php if (count($topTeachers) > 0): ?>
                    <div class="teachers-grid">
                        <?php foreach ($topTeachers as $teacher):
                            $tid = (string)$teacher['_id'];
                            $stats = $teacherStats[$tid];
                        ?>
                            <div class="teacher-card">
                                <div class="teacher-name"><?= htmlspecialchars($teacher['firstname'] . ' ' . $teacher['lastname']) ?></div>
                                <span class="teacher-dept"><?= htmlspecialchars($teacher['department']) ?></span>
                                <div style="margin-bottom: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
                                    <div class="rating-item">
                                        <span class="rating-label">Teaching:</span>
                                        <span class="rating-star high"><?= $stats['avgTeaching'] ?> ★</span>
                                    </div>
                                    <div class="rating-item">
                                        <span class="rating-label">Communication:</span>
                                        <span class="rating-star high"><?= $stats['avgCommunication'] ?> ★</span>
                                    </div>
                                    <div class="rating-item">
                                        <span class="rating-label">Knowledge:</span>
                                        <span class="rating-star high"><?= $stats['avgKnowledge'] ?> ★</span>
                                    </div>
                                    <div class="rating-item" style="font-weight: 700; font-size: 16px; margin-top: 10px;">
                                        <span class="rating-label">Overall:</span>
                                        <span class="rating-star high"><?= $stats['overallAvg'] ?></span>
                                    </div>
                                </div>
                                <div style="font-size: 12px; color: #666; margin-top: 10px;">
                                    <span class="eval-count"><?= $stats['count'] ?> evaluations</span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <div class="no-data">📭 No evaluations yet</div>
                <?php endif; ?>
            </div>
            
            <!-- Needs Improvement Teachers -->
            <?php if (count($bottomTeachers) > 0): ?>
            <div class="section">
                <h2>⚠️ Teachers Needing Support</h2>
                <div class="teachers-grid">
                    <?php foreach ($bottomTeachers as $teacher):
                        $tid = (string)$teacher['_id'];
                        $stats = $teacherStats[$tid];
                    ?>
                        <div class="teacher-card" style="border-left-color: #f44;">
                            <div class="teacher-name"><?= htmlspecialchars($teacher['firstname'] . ' ' . $teacher['lastname']) ?></div>
                            <span class="teacher-dept" style="background: #f44;"><?= htmlspecialchars($teacher['department']) ?></span>
                            <div style="margin-bottom: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.1);">
                                <div class="rating-item">
                                    <span class="rating-label">Teaching:</span>
                                    <span class="rating-star low"><?= $stats['avgTeaching'] ?> ★</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Communication:</span>
                                    <span class="rating-star low"><?= $stats['avgCommunication'] ?> ★</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Knowledge:</span>
                                    <span class="rating-star low"><?= $stats['avgKnowledge'] ?> ★</span>
                                </div>
                                <div class="rating-item" style="font-weight: 700; font-size: 16px; margin-top: 10px;">
                                    <span class="rating-label">Overall:</span>
                                    <span class="rating-star low"><?= $stats['overallAvg'] ?></span>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: #666; margin-top: 10px;">
                                <span class="eval-count"><?= $stats['count'] ?> evaluations</span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
        </div>
        
        <!-- Teachers Tab -->
        <div id="teachers" class="tab-content <?= $currentTab === 'teachers' ? 'active' : '' ?>">
            <div class="header">
                <h1>👨‍🏫 Teachers Management</h1>
                <p>Manage all teachers in the system</p>
            </div>
            
            <div class="section">
                <h2>Teachers List & Evaluations</h2>
                
                <?php if (count($teachers) > 0): ?>
                    <table>
                        <thead>
                            <tr>
                                <th>Teacher Name</th>
                                <th>Department</th>
                                <th>Evaluations</th>
                                <th>Teaching</th>
                                <th>Communication</th>
                                <th>Knowledge</th>
                                <th>Overall</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($teachers as $teacher): 
                                $tid = (string)$teacher['_id'];
                                $stats = $teacherStats[$tid];
                            ?>
                                <tr>
                                    <td class="teacher-col"><?= htmlspecialchars($teacher['firstname'] . ' ' . $teacher['lastname']) ?></td>
                                    <td><span class="dept-badge"><?= htmlspecialchars($teacher['department']) ?></span></td>
                                    <td><span class="eval-count"><?= $stats['count'] ?></span></td>
                                    <td class="rating <?= $stats['avgTeaching'] >= 4 ? 'high' : 'low' ?>"><?= $stats['avgTeaching'] ?> ★</td>
                                    <td class="rating <?= $stats['avgCommunication'] >= 4 ? 'high' : 'low' ?>"><?= $stats['avgCommunication'] ?> ★</td>
                                    <td class="rating <?= $stats['avgKnowledge'] >= 4 ? 'high' : 'low' ?>"><?= $stats['avgKnowledge'] ?> ★</td>
                                    <td class="rating <?= $stats['overallAvg'] >= 4 ? 'high' : 'low' ?>" style="font-weight: bold;"><?= $stats['overallAvg'] ?></td>
                                    <td>
                                        <button class="action-btn" onclick="alert('Edit functionality coming soon')">Edit</button>
                                        <button class="action-btn delete" onclick="alert('Delete functionality coming soon')">Delete</button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <div class="no-data">ℹ️ No teachers found in the system</div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- Results Tab -->
        <div id="results" class="tab-content <?= $currentTab === 'results' ? 'active' : '' ?>">
            <div class="header">
                <h1>📈 Evaluation Results</h1>
                <p>Detailed evaluation results and performance analysis</p>
            </div>
            
            <div class="section">
                <h2>Teachers Performance Summary</h2>
                
                <?php if (count($teachers) > 0): ?>
                    <div class="results-grid">
                        <?php foreach ($teachers as $teacher):
                            $tid = (string)$teacher['_id'];
                            $stats = $teacherStats[$tid];
                            
                            // Determine status
                            $status = 'poor';
                            $statusClass = 'status-poor';
                            if ($stats['overallAvg'] >= 4.5) {
                                $status = 'Excellent';
                                $statusClass = 'status-excellent';
                            } elseif ($stats['overallAvg'] >= 4) {
                                $status = 'Good';
                                $statusClass = 'status-good';
                            } elseif ($stats['overallAvg'] >= 3) {
                                $status = 'Fair';
                                $statusClass = 'status-fair';
                            } else {
                                $status = 'Needs Improvement';
                                $statusClass = 'status-poor';
                            }
                        ?>
                            <div class="result-card">
                                <h3>
                                    <?= htmlspecialchars($teacher['firstname'] . ' ' . $teacher['lastname']) ?>
                                    <span class="status-badge <?= $statusClass ?>" style="float: right; margin-top: -5px;">
                                        <?= $status ?>
                                    </span>
                                </h3>
                                
                                <div class="result-stat">
                                    <span class="result-label">Department:</span>
                                    <span class="result-value"><?= htmlspecialchars($teacher['department']) ?></span>
                                </div>
                                <div class="result-stat">
                                    <span class="result-label">Total Evaluations:</span>
                                    <span class="result-value"><?= $stats['count'] ?></span>
                                </div>
                                <div class="result-stat">
                                    <span class="result-label">Teaching Rating:</span>
                                    <span class="result-value"><?= $stats['avgTeaching'] ?> / 5.0</span>
                                </div>
                                <div class="result-stat">
                                    <span class="result-label">Communication Rating:</span>
                                    <span class="result-value"><?= $stats['avgCommunication'] ?> / 5.0</span>
                                </div>
                                <div class="result-stat">
                                    <span class="result-label">Knowledge Rating:</span>
                                    <span class="result-value"><?= $stats['avgKnowledge'] ?> / 5.0</span>
                                </div>
                                <div class="result-stat" style="font-weight: bold; border-top: 2px solid #667eea; padding-top: 10px; margin-top: 10px;">
                                    <span class="result-label">Overall Average:</span>
                                    <span class="result-value" style="font-size: 18px;"><?= $stats['overallAvg'] ?> / 5.0</span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php else: ?>
                    <div class="no-data">📭 No evaluation data available</div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    
    <script>
        function switchTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked button
            event.target.classList.add('active');
            
            // Update URL
            window.history.replaceState({}, '', '?tab=' + tabName);
        }
    </script>
</body>
</html>
