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

require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/Bootstrap.php';

// Use proper session initialization from helpers
initializeSession();

// Debug: Log session info
$sessionId = session_id();
$sessionPath = ini_get('session.save_path');
$sessionFile = $sessionPath . '/sess_' . $sessionId;
error_log("SSE Session Check - ID: $sessionId, File: $sessionFile, Exists: " . (file_exists($sessionFile) ? 'YES' : 'NO'));
error_log("SSE SESSION Contents: " . json_encode($_SESSION));

// IMPORTANT: EventSource doesn't send PHPSESSID cookie automatically
// So we need to accept auth via query parameter or header
// Get admin_id from query parameter (set by JavaScript)
$adminIdFromParam = isset($_GET['admin_id']) ? $_GET['admin_id'] : null;
$adminRoleFromParam = isset($_GET['admin_role']) ? $_GET['admin_role'] : null;

// Fall back to session if available
if (!$adminIdFromParam && isset($_SESSION['admin_id'])) {
    $adminIdFromParam = $_SESSION['admin_id'];
    $adminRoleFromParam = $_SESSION['admin_role'] ?? null;
}

// Also check for Bearer token or auth header
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
    // Validate token format (should be admin_id:token)
    $tokenParts = explode(':', $matches[1]);
    if (count($tokenParts) === 2) {
        $adminIdFromParam = $tokenParts[0];
        $adminRoleFromParam = 'admin';  // Assume admin role for bearer tokens
    }
}

error_log("SSE Auth Check - AdminID from param: $adminIdFromParam, Role: $adminRoleFromParam");

// Only admins can access this endpoint
// IMPORTANT: The browser DOES send the PHPSESSID cookie with EventSource requests!
// Let's use that to restore the admin session

// Check if we have a valid PHPSESSID cookie
$phpSessionId = $_COOKIE['PHPSESSID'] ?? null;
error_log("SSE: PHPSESSID from cookie: " . ($phpSessionId ? 'YES (' . substr($phpSessionId, 0, 10) . '...)' : 'NO'));

// Try to manually restore the session from the session file if PHPSESSID exists
if ($phpSessionId && !$adminIdFromParam) {
    // Use the SAME session save path as configured in initializeSession()
    $sessionSavePath = dirname(dirname(__FILE__)) . '/storage/sessions';
    $sessionFile = $sessionSavePath . '/sess_' . $phpSessionId;
    
    error_log("SSE: Trying to read session file: $sessionFile");
    
    if (file_exists($sessionFile)) {
        $sessionData = @file_get_contents($sessionFile);
        if ($sessionData !== false && !empty($sessionData)) {
            error_log("SSE: Session file found, size: " . strlen($sessionData) . " bytes");
            // Parse the session data
            $sessionArray = [];
            $offset = 0;
            while ($offset < strlen($sessionData)) {
                if (!stristr(substr($sessionData, $offset), "|")) {
                    break;
                }
                $pos = strpos($sessionData, "|", $offset);
                $num = $pos - $offset;
                $varname = substr($sessionData, $offset, $num);
                $offset += $num + 1;
                $data = unserialize(substr($sessionData, $offset));
                $sessionArray[$varname] = $data;
                $offset += strlen(serialize($data));
            }
            
            error_log("SSE: Parsed session data: " . json_encode($sessionArray));
            
            // Extract admin credentials from parsed session
            if (isset($sessionArray['admin_id']) && isset($sessionArray['admin_role'])) {
                $adminIdFromParam = $sessionArray['admin_id'];
                $adminRoleFromParam = $sessionArray['admin_role'];
                error_log("SSE: Restored admin from session file - ID: $adminIdFromParam, Role: $adminRoleFromParam");
            }
        }
    } else {
        error_log("SSE: Session file NOT found at: $sessionFile");
    }
}

// Check authentication (either from param, query, or restored from session file)
if (!$adminIdFromParam || $adminRoleFromParam !== 'admin') {
    session_write_close(); // Release session lock before exiting
    
    // Send SSE format error
    echo "event: error\n";
    echo "data: {\"message\": \"Unauthorized - not logged in as admin. AdminID: " . json_encode($adminIdFromParam) . ", Role: " . json_encode($adminRoleFromParam) . "\"}\n\n";
    error_log("SSE Unauthorized - AdminID: " . json_encode($adminIdFromParam) . ", Role: " . json_encode($adminRoleFromParam));
    exit;
}

$adminId = $adminIdFromParam;
$lastCheckTime = isset($_GET['since']) ? (int)$_GET['since'] : (time() - 5);

// Set error handler for SSE endpoint to output in SSE format
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Send error as SSE event
    echo "event: error\n";
    echo "data: {\"message\": \"Server error: " . addslashes($errstr) . "\"}\n\n";
    ob_flush();
    flush();
    error_log("SSE Error Handler - $errstr in $errfile:$errline");
    // Continue execution instead of dying, so the loop can clean up
});

// Set exception handler for SSE endpoint
set_exception_handler(function(Throwable $e) {
    echo "event: error\n";
    echo "data: {\"message\": \"Exception: " . addslashes($e->getMessage()) . "\"}\n\n";
    ob_flush();
    flush();
    error_log("SSE Exception Handler - " . $e->getMessage());
    exit;
});

// Release the session lock immediately after reading admin_id
// This allows other pages to access their own session while SSE connection stays open
session_write_close();

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
                // Get teacher name - safely extract teacher_id from MongoDB object
                $teacherName = 'Unknown Teacher';
                $teacherRating = 0;
                
                // MongoDB objects can be accessed as arrays or objects
                $teacherId = isset($eval['teacher_id']) ? $eval['teacher_id'] : (isset($eval->teacher_id) ? $eval->teacher_id : null);
                
                error_log("SSE Processing eval - Teacher ID: " . json_encode($teacherId));
                
                if ($teacherId) {
                    try {
                        // Find teacher by ID
                        $teacher = $teachers_collection->findOne(['_id' => $teacherId]);
                        if ($teacher) {
                            $teacherName = isset($teacher['name']) ? $teacher['name'] : $teacherName;
                            error_log("SSE Found teacher: $teacherName");
                        } else {
                            error_log("SSE Teacher not found for ID: " . $teacherId);
                        }
                    } catch (Exception $e) {
                        error_log("SSE Teacher lookup error: " . $e->getMessage());
                    }
                }
                
                // Extract rating from various sources
                // Priority 1: Direct rating field
                if (isset($eval['rating']) && $eval['rating'] > 0) {
                    $teacherRating = $eval['rating'];
                    error_log("SSE Rating from direct field: $teacherRating");
                } 
                // Priority 2: Average of answers array
                else if (isset($eval['answers']) && is_array($eval['answers'])) {
                    $ratings = [];
                    foreach ($eval['answers'] as $answer) {
                        if (isset($answer['rating']) && $answer['rating'] > 0) {
                            $ratings[] = $answer['rating'];
                        }
                    }
                    if (count($ratings) > 0) {
                        $teacherRating = round(array_sum($ratings) / count($ratings), 1);
                        error_log("SSE Rating from answers: $teacherRating (from " . count($ratings) . " answers)");
                    }
                }
                
                // Log the complete event data
                $eventData = [
                    'id' => (string)$eval['_id'],
                    'teacher_id' => (string)$teacherId,
                    'teacher_name' => $teacherName,
                    'submitted_by' => isset($eval['student_id']) ? $eval['student_id'] : 'Unknown',
                    'timestamp' => isset($eval['created_at']) ? $eval['created_at']->toDateTime()->format('Y-m-d H:i:s') : date('Y-m-d H:i:s'),
                    'rating' => $teacherRating
                ];
                
                error_log("SSE Sending event: " . json_encode($eventData));
                
                sendEvent('new_evaluation', $eventData);
                
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
