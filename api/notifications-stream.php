<?php
/**
 * Real-time Notifications Stream (Server-Sent Events)
 * Sends live notifications to admin dashboard when evaluations are submitted
 * 
 * Usage: fetch('/api/notifications-stream.php')
 *        .then(response => response.body.getReader())
 */

// Set headers for Server-Sent Events
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Disable Nginx buffering

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Prevent timeouts for long-lived connections
set_time_limit(0);
ignore_user_abort(true);

// Declare globals BEFORE including files
global $db, $database, $evaluations_collection, $teachers_collection, $collections;

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/Bootstrap.php';

session_start();

// Debug: Log access attempt
error_log("SSE Connection attempt - Admin ID: " . ($_SESSION['admin_id'] ?? 'none') . ", Role: " . ($_SESSION['admin_role'] ?? 'none'));

// Only admins can access this endpoint
if (!isset($_SESSION['admin_id']) || $_SESSION['admin_role'] !== 'admin') {
    // Still send SSE format but with error
    echo "event: error\n";
    echo "data: {\"message\": \"Unauthorized - not logged in as admin\"}\n\n";
    error_log("SSE Unauthorized access attempt");
    exit;
}

$adminId = $_SESSION['admin_id'];
$lastCheckTime = isset($_GET['since']) ? (int)$_GET['since'] : (time() - 5);

/**
 * Send SSE event
 */
function sendEvent($eventType, $data) {
    echo "event: $eventType\n";
    echo "data: " . json_encode($data) . "\n\n";
    ob_flush();
    flush();
}

// Send initial connection confirmation
sendEvent('connected', [
    'timestamp' => date('Y-m-d H:i:s'),
    'message' => 'Connected to notification stream'
]);

// Connection loop - keep connection open for 5 minutes
$startTime = time();
$maxDuration = 300; // 5 minutes

while ((time() - $startTime) < $maxDuration) {
    try {
        // Check for new evaluations since last check (use global collections already initialized)
        global $evaluations_collection, $teachers_collection;
        
        $recentEvaluations = $evaluations_collection->find([
            'created_at' => ['$gte' => new MongoDB\BSON\UTCDateTime($lastCheckTime * 1000)]
        ], [
            'sort' => ['created_at' => -1],
            'limit' => 10
        ]);
        
        // Convert cursor to array ONCE
        $evaluationsArray = $recentEvaluations->toArray();
        $newCount = count($evaluationsArray);
        
        if ($newCount > 0) {
            foreach ($evaluationsArray as $eval) {
                // Get teacher name
                $teacher = $teachers_collection->findOne([
                    '_id' => $eval->teacher_id ?? null
                ]);
                
                $teacherName = $teacher['name'] ?? 'Unknown Teacher';
                
                sendEvent('new_evaluation', [
                    'id' => (string)$eval->_id,
                    'teacher_id' => (string)($eval->teacher_id ?? ''),
                    'teacher_name' => $teacherName,
                    'submitted_by' => $eval->student_id ?? 'Unknown',
                    'timestamp' => $eval->created_at->toDateTime()->format('Y-m-d H:i:s'),
                    'rating' => $eval->rating ?? 0
                ]);
                
                // Update last check time
                $lastCheckTime = (int)($eval->created_at->toDateTime()->getTimestamp());
            }
        }
        
        // Send heartbeat every 10 seconds to keep connection alive
        sendEvent('heartbeat', [
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
    } catch (Exception $e) {
        $errorMsg = $e->getMessage();
        error_log("SSE Error: " . $errorMsg);
        sendEvent('error', [
            'message' => 'Database error: ' . $errorMsg
        ]);
    } catch (Throwable $t) {
        $errorMsg = $t->getMessage();
        error_log("SSE Throwable: " . $errorMsg);
        sendEvent('error', [
            'message' => 'System error: ' . $errorMsg
        ]);
    }
    
    // Sleep before checking again
    sleep(3);
}

// Connection closing
sendEvent('closed', [
    'message' => 'Notification stream closed',
    'timestamp' => date('Y-m-d H:i:s')
]);

exit;
?>
