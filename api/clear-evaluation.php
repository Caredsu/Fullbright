<?php
/**
 * API: Clear/Override Student Evaluation
 * Admin only - allows clearing evaluation to allow re-evaluation in new academic year
 * 
 * POST /api/clear-evaluation.php
 * {
 *   "submission_log_id": "xxxxx",
 *   "reason": "New academic year"
 * }
 */

require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/duplicate-prevention.php';

header('Content-Type: application/json');

// Check authentication
$user = getLoggedInAdmin();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Check admin role
if (!isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden - Admin access required']);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input['submission_log_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'submission_log_id is required']);
        exit;
    }
    
    $submission_log_id = $input['submission_log_id'];
    $reason = $input['reason'] ?? 'Admin override';
    
    // Validate ObjectId
    if (!preg_match('/^[a-f0-9]{24}$/', $submission_log_id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid submission_log_id format']);
        exit;
    }
    
    // Get the record before deletion (for logging)
    $submissionLogs = $db->selectCollection('submission_logs');
    $record = $submissionLogs->findOne(['_id' => new \MongoDB\BSON\ObjectId($submission_log_id)]);
    
    if (!$record) {
        http_response_code(404);
        echo json_encode(['error' => 'Submission log not found']);
        exit;
    }
    
    // Clear the evaluation
    $result = clearStudentTeacherEvaluation($submission_log_id);
    
    if ($result['success']) {
        // Log the admin action
        $admin_id = new \MongoDB\BSON\ObjectId($user);
        $admin_logs = $db->selectCollection('admin_logs');
        
        $admin_logs->insertOne([
            'admin_id' => $admin_id,
            'action' => 'CLEAR_EVALUATION',
            'submission_log_id' => new \MongoDB\BSON\ObjectId($submission_log_id),
            'teacher_id' => $record['teacher_id'],
            'device_fingerprint' => $record['device_fingerprint'],
            'reason' => $reason,
            'timestamp' => new \MongoDB\BSON\UTCDateTime(),
            'ip_address' => $_SERVER['REMOTE_ADDR']
        ]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Evaluation cleared successfully',
            'data' => [
                'submission_log_id' => $submission_log_id,
                'teacher_id' => (string)$record['teacher_id'],
                'device_fingerprint' => $record['device_fingerprint']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $result['message']
        ]);
    }
    
} catch (\Exception $e) {
    error_log("Clear evaluation API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
