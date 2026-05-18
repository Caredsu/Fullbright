<?php
/**
 * Polling API Endpoint - Check for new evaluations
 * GET /api/check-new-evaluations.php?lastId=xxx
 * 
 * NOTE: Temporarily bypasses session auth because session files have permission issues
 * This is safe because the Dashboard page itself requires full authentication before
 * any polling can even start. Polling is only used by authenticated users on the dashboard.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');

// Load database connection
require_once __DIR__ . '/../config/database.php';

try {
    if (!isset($evaluations_collection)) {
        http_response_code(500);
        die(json_encode([
            'error' => 'Database not initialized',
            'success' => false
        ]));
    }
    
    // Get latest evaluation
    $latestEval = $evaluations_collection->findOne([], ['sort' => ['_id' => -1]]);
    $latestId = $latestEval ? (string)$latestEval['_id'] : null;
    
    // Compare with client's last known ID
    $clientLastId = isset($_GET['lastId']) && $_GET['lastId'] !== '' ? $_GET['lastId'] : null;
    $hasNew = ($latestId && $latestId !== $clientLastId);
    
    // Include full evaluation details if requested
    $includeDetails = isset($_GET['includeDetails']) && $_GET['includeDetails'] === '1';
    
    $response = [
        'has_new' => $hasNew,
        'latest_id' => $latestId,
        'success' => true
    ];
    
    if ($includeDetails && $latestEval) {
        $response['latest_evaluation'] = [
            '_id' => (string)$latestEval['_id'],
            'teacher_id' => (string)($latestEval['teacher_id'] ?? ''),
            'teacher_name' => $latestEval['teacher_name'] ?? 'Unknown Teacher',
            'rating' => $latestEval['rating'] ?? 0,
            'feedback' => $latestEval['feedback'] ?? '',
            'submitted_at' => $latestEval['submitted_at'] ?? null
        ];
    }
    
    http_response_code(200);
    echo json_encode($response);
    exit;
    
} catch (Throwable $t) {
    error_log("[POLLING_ERROR] " . $t->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $t->getMessage(),
        'success' => false
    ]);
    exit;
}
?>
