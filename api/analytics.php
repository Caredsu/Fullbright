<?php
/**
 * Analytics API
 * Provides statistics and analytics data for admin dashboard
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/Bootstrap.php';

session_start();

// Check authorization
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

try {
    $evaluationsCollection = $database->teacher_eval->evaluations;
    $teachersCollection = $database->teacher_eval->teachers;
    
    // Get query parameters
    $type = $_GET['type'] ?? 'summary';
    $dateFrom = isset($_GET['date_from']) ? strtotime($_GET['date_from']) * 1000 : (time() - 30 * 24 * 3600) * 1000;
    $dateTo = isset($_GET['date_to']) ? strtotime($_GET['date_to']) * 1000 : time() * 1000;
    
    switch ($type) {
        case 'summary':
            // Summary statistics
            $totalEvaluations = $evaluationsCollection->countDocuments(['status' => 'submitted']);
            $totalTeachers = $teachersCollection->countDocuments();
            
            // Average rating
            $avgRatingPipeline = [
                ['$match' => ['status' => 'submitted']],
                ['$group' => [
                    '_id' => null,
                    'avg_rating' => ['$avg' => '$rating']
                ]]
            ];
            $avgRatingResult = $evaluationsCollection->aggregate($avgRatingPipeline)->toArray();
            $avgRating = $avgRatingResult[0]->avg_rating ?? 0;
            
            // Completion rate
            $completionRate = $totalTeachers > 0 ? round(($totalEvaluations / $totalTeachers) * 100, 2) : 0;
            
            // Recent evaluations (last 30 days)
            $thirtyDaysAgo = new MongoDB\BSON\UTCDateTime((time() - 30 * 24 * 3600) * 1000);
            $recentCount = $evaluationsCollection->countDocuments([
                'status' => 'submitted',
                'created_at' => ['$gte' => $thirtyDaysAgo]
            ]);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'total_evaluations' => (int)$totalEvaluations,
                    'total_teachers' => (int)$totalTeachers,
                    'average_rating' => round($avgRating, 2),
                    'completion_rate' => $completionRate,
                    'recent_30days' => (int)$recentCount
                ]
            ]);
            break;
            
        case 'ratings_distribution':
            // Ratings distribution (1-5 stars)
            $ratingsPipeline = [
                ['$match' => ['status' => 'submitted']],
                ['$group' => [
                    '_id' => '$rating',
                    'count' => ['$sum' => 1]
                ]],
                ['$sort' => ['_id' => 1]]
            ];
            
            $ratings = [
                '1' => 0,
                '2' => 0,
                '3' => 0,
                '4' => 0,
                '5' => 0
            ];
            
            foreach ($evaluationsCollection->aggregate($ratingsPipeline) as $result) {
                $rating = (int)$result->_id;
                if ($rating >= 1 && $rating <= 5) {
                    $ratings[(string)$rating] = (int)$result->count;
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $ratings
            ]);
            break;
            
        case 'timeline':
            // Evaluations over time (last 30 days)
            $timelinePipeline = [
                ['$match' => [
                    'status' => 'submitted',
                    'created_at' => [
                        '$gte' => new MongoDB\BSON\UTCDateTime($dateFrom),
                        '$lte' => new MongoDB\BSON\UTCDateTime($dateTo)
                    ]
                ]],
                ['$group' => [
                    '_id' => [
                        '$dateToString' => ['format' => '%Y-%m-%d', 'date' => '$created_at']
                    ],
                    'count' => ['$sum' => 1]
                ]],
                ['$sort' => ['_id' => 1]]
            ];
            
            $timeline = [];
            foreach ($evaluationsCollection->aggregate($timelinePipeline) as $result) {
                $timeline[$result->_id] = (int)$result->count;
            }
            
            echo json_encode([
                'success' => true,
                'data' => $timeline
            ]);
            break;
            
        case 'teacher_rankings':
            // Top/bottom rated teachers
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            $sort = isset($_GET['sort']) ? $_GET['sort'] : 'desc'; // desc = top, asc = bottom
            
            $rankingsPipeline = [
                ['$match' => ['status' => 'submitted']],
                ['$group' => [
                    '_id' => '$teacher_id',
                    'avg_rating' => ['$avg' => '$rating'],
                    'count' => ['$sum' => 1]
                ]],
                ['$sort' => ['avg_rating' => $sort === 'asc' ? 1 : -1]],
                ['$limit' => $limit]
            ];
            
            $rankings = [];
            foreach ($evaluationsCollection->aggregate($rankingsPipeline) as $result) {
                $teacher = $teachersCollection->findOne(['_id' => $result->_id]);
                $rankings[] = [
                    'teacher_id' => (string)$result->_id,
                    'teacher_name' => $teacher->name ?? 'Unknown',
                    'avg_rating' => round($result->avg_rating, 2),
                    'evaluation_count' => (int)$result->count
                ];
            }
            
            echo json_encode([
                'success' => true,
                'data' => $rankings
            ]);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid type parameter']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
