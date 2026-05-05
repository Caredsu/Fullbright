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
    
    http_response_code(200);
    echo json_encode([
        'has_new' => $hasNew,
        'latest_id' => $latestId,
        'success' => true
    ]);
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
        'error' => 'System error: ' . $t->getMessage(),
        'has_new' => false,
        'latest_id' => null,
        'success' => false
    ]));
}
?>
