<?php
/**
 * Simple Users API - Direct copy from what works
 */

// Clean output first
while (ob_get_level()) ob_end_clean();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
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
    
    // Check authentication
    if (empty($_SESSION['admin_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'Not logged in']));
    }
    
    // Check authorization
    $role = $_SESSION['admin_role'] ?? null;
    if (!in_array($role, ['admin', 'superadmin', 'staff', 'super_admin'])) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'Forbidden']));
    }
    
    // Load dependencies
    require_once __DIR__ . '/../vendor/autoload.php';
    require_once __DIR__ . '/../config/database.php';
    
    // Get action
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    // Get collections
    global $admins_collection;
    
    if (!isset($admins_collection)) {
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'DB error']));
    }
    
    // Handle action
    if ($action === 'get_users') {
        $users = $admins_collection->find([], ['sort' => ['created_at' => -1]])->toArray();
        
        $data = [];
        foreach ($users as $user) {
            $created_at = $user['created_at'] ?? '';
            $updated_at = $user['updated_at'] ?? '';
            $last_login = $user['last_login'] ?? '';
            
            if (is_object($created_at) && method_exists($created_at, 'toDateTime')) {
                $created_at = $created_at->toDateTime()->format('Y-m-d H:i:s');
            }
            
            if (is_object($updated_at) && method_exists($updated_at, 'toDateTime')) {
                $updated_at = $updated_at->toDateTime()->format('Y-m-d H:i:s');
            }
            
            if (is_object($last_login) && method_exists($last_login, 'toDateTime')) {
                $last_login = $last_login->toDateTime()->format('Y-m-d H:i:s');
            } else {
                $last_login = 'Never';
            }
            
            $data[] = [
                '_id' => (string)$user['_id'],
                'username' => $user['username'] ?? '',
                'email' => $user['email'] ?? '',
                'role' => $user['role'] ?? 'admin',
                'status' => $user['status'] ?? 'active',
                'created_at' => $created_at,
                'created_by' => $user['created_by'] ?? '',
                'updated_at' => $updated_at,
                'updated_by' => $user['updated_by'] ?? '',
                'last_login' => $last_login
            ];
        }
        
        http_response_code(200);
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }
    
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
