<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

// Get the database instance using the same pattern as other API files
function getDatabase() {
    global $db;
    return $db;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? null;
    
    // Handle delete feedback
    if ($action === 'delete_feedback') {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Try to restore session from PHPSESSID if not already set
        if (empty($_SESSION['admin_id'])) {
            $phpSessionId = $_COOKIE['PHPSESSID'] ?? null;
            if ($phpSessionId) {
                $sessionSavePath = dirname(dirname(__FILE__)) . '/storage/sessions';
                $sessionFile = $sessionSavePath . '/sess_' . $phpSessionId;
                if (file_exists($sessionFile)) {
                    $sessionData = @file_get_contents($sessionFile);
                    if ($sessionData !== false && !empty($sessionData)) {
                        $offset = 0;
                        while ($offset < strlen($sessionData)) {
                            if (!stristr(substr($sessionData, $offset), "|")) break;
                            $pos = strpos($sessionData, "|", $offset);
                            $num = $pos - $offset;
                            $varname = substr($sessionData, $offset, $num);
                            $offset += $num + 1;
                            $data_item = unserialize(substr($sessionData, $offset));
                            $_SESSION[$varname] = $data_item;
                            $offset += strlen(serialize($data_item));
                        }
                    }
                }
            }
        }
        
        // Check if user is admin
        if (!isset($_SESSION['admin_id'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
        
        $feedbackId = $data['feedback_id'] ?? null;
        
        if (!$feedbackId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Feedback ID required']);
            exit;
        }
        
        try {
            $db = getDatabase();
            $feedbackCollection = $db->selectCollection('system_feedback');
            
            $result = $feedbackCollection->deleteOne([
                '_id' => new ObjectId($feedbackId)
            ]);
            
            if ($result->getDeletedCount() > 0) {
                http_response_code(200);
                echo json_encode(['success' => true, 'message' => 'Feedback deleted successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Feedback not found']);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
    
    // Handle save feedback (original functionality)
    $rating = intval($data['rating'] ?? 0);
    $user_id = $data['user_id'] ?? null;
    $comments = trim($data['comments'] ?? '');
    
    if ($rating < 1 || $rating > 5) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid rating']);
        exit;
    }
    
    try {
        $db = getDatabase();
        $feedbackCollection = $db->selectCollection('system_feedback');
        
        $result = $feedbackCollection->insertOne([
            'user_id' => $user_id,
            'rating' => $rating,
            'comments' => $comments,
            'created_at' => new UTCDateTime(time() * 1000),
        ]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Feedback saved successfully'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get all feedback (admin only)
    try {
        $db = getDatabase();
        $feedbackCollection = $db->selectCollection('system_feedback');
        
        $cursor = $feedbackCollection->find([], ['sort' => ['created_at' => -1]]);
        $feedback = iterator_to_array($cursor);
        
        echo json_encode([
            'success' => true,
            'data' => $feedback,
            'count' => count($feedback)
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}
else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
