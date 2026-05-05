<?php
/**
 * Users API Endpoint - Admin Only
 */

// Import MongoDB classes first
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

// Clean output buffers and set JSON header FIRST
while (ob_get_level()) ob_end_clean();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    require_once __DIR__ . '/../vendor/autoload.php';
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../includes/helpers.php';

    // Initialize session properly
    initializeSession();
    
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
    
    // Check if logged in (without redirecting)
    if (empty($_SESSION['admin_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    
    $admin_role = $_SESSION['admin_role'] ?? null;
    if (!in_array($admin_role, ['admin', 'superadmin', 'staff', 'super_admin'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Forbidden']);
        exit;
    }
    
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    global $admins_collection;
    
    if (!isset($admins_collection)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database not initialized']);
        exit;
    }
    
    switch ($action) {
        case 'get_users':
            $users = $admins_collection->find([], ['sort' => ['created_at' => -1]])->toArray();
            
            $formatted_users = [];
            foreach ($users as $user) {
                $created_at = $user['created_at'] ?? null;
                $updated_at = $user['updated_at'] ?? null;
                $last_login = $user['last_login'] ?? null;
                
                // Handle both DateTime objects and strings
                if (is_object($created_at) && method_exists($created_at, 'toDateTime')) {
                    $created_at = $created_at->toDateTime()->format('Y-m-d H:i:s');
                } elseif (is_string($created_at)) {
                    $created_at = $created_at;
                } else {
                    $created_at = '';
                }
                
                if (is_object($updated_at) && method_exists($updated_at, 'toDateTime')) {
                    $updated_at = $updated_at->toDateTime()->format('Y-m-d H:i:s');
                } elseif (is_string($updated_at)) {
                    $updated_at = $updated_at;
                } else {
                    $updated_at = '';
                }
                
                if (is_object($last_login) && method_exists($last_login, 'toDateTime')) {
                    $last_login = $last_login->toDateTime()->format('Y-m-d H:i:s');
                } elseif (is_string($last_login)) {
                    $last_login = $last_login;
                } else {
                    $last_login = 'Never';
                }
                
                $formatted_users[] = [
                    'id' => (string)$user['_id'],
                    '_id' => (string)$user['_id'],
                    'username' => $user['username'] ?? '',
                    'email' => $user['email'] ?? '',
                    'role' => $user['role'] ?? 'admin',
                    'status' => $user['status'] ?? 'active',
                    'created_at' => $created_at,
                    'created_by' => $user['created_by'] ?? 'system',
                    'updated_at' => $updated_at,
                    'updated_by' => $user['updated_by'] ?? '',
                    'last_login' => $last_login
                ];
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Success',
                'data' => $formatted_users
            ]);
            break;
            
        case 'get_user':
            $user_id = $_GET['id'] ?? $_POST['user_id'] ?? '';
            
            if (empty($user_id) || !isValidObjectId($user_id)) {
                echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
                exit;
            }
            
            $user = $admins_collection->findOne(['_id' => new ObjectId($user_id)]);
            if (!$user) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'User not found']);
                exit;
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Success',
                'data' => $user
            ]);
            break;
            
        case 'add_user':
            if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
                echo json_encode(['success' => false, 'message' => 'CSRF token invalid']);
                exit;
            }
            
            $username = $_POST['username'] ?? '';
            $email = $_POST['email'] ?? '';
            $password = $_POST['password'] ?? '';
            $role = $_POST['role'] ?? 'admin';
            
            if (strlen($username) < 3) {
                echo json_encode(['success' => false, 'message' => 'Username must be at least 3 characters']);
                exit;
            }
            
            if (strlen($password) < 6) {
                echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
                exit;
            }
            
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['success' => false, 'message' => 'Invalid email format']);
                exit;
            }
            
            $existing = $admins_collection->findOne(['username' => $username]);
            if ($existing) {
                echo json_encode(['success' => false, 'message' => 'Username already exists']);
                exit;
            }
            
            $result = $admins_collection->insertOne([
                'username' => $username,
                'email' => $email,
                'password' => hashPassword($password),
                'role' => $role,
                'status' => 'active',
                'created_at' => new UTCDateTime(),
                'created_by' => $_SESSION['admin_username'] ?? 'admin',
                'updated_at' => new UTCDateTime(),
                'updated_by' => $_SESSION['admin_username'] ?? 'admin',
                'last_login' => null
            ]);
            
            echo json_encode([
                'success' => true,
                'message' => 'User added successfully',
                'data' => ['id' => (string)$result->getInsertedId()]
            ]);
            break;
            
        case 'update_user':
            if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
                echo json_encode(['success' => false, 'message' => 'CSRF token invalid']);
                exit;
            }
            
            $user_id = $_POST['user_id'] ?? '';
            $email = $_POST['email'] ?? '';
            $role = $_POST['role'] ?? 'admin';
            $password = $_POST['password'] ?? '';
            
            if (empty($user_id) || !isValidObjectId($user_id)) {
                echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
                exit;
            }
            
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['success' => false, 'message' => 'Invalid email format']);
                exit;
            }
            
            $update_data = [
                'email' => $email,
                'role' => $role,
                'updated_at' => new UTCDateTime(),
                'updated_by' => $_SESSION['admin_username'] ?? 'admin'
            ];
            
            if (!empty($password)) {
                if (strlen($password) < 6) {
                    echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
                    exit;
                }
                $update_data['password'] = hashPassword($password);
            }
            
            $admins_collection->updateOne(
                ['_id' => new ObjectId($user_id)],
                ['$set' => $update_data]
            );
            
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
            break;
            
        case 'delete_user':
            if (!verifyCSRFToken($_POST['csrf_token'] ?? '')) {
                echo json_encode(['success' => false, 'message' => 'CSRF token invalid']);
                exit;
            }
            
            $user_id = $_POST['user_id'] ?? '';
            
            if (empty($user_id) || !isValidObjectId($user_id)) {
                echo json_encode(['success' => false, 'message' => 'Invalid user ID']);
                exit;
            }
            
            if ($user_id === ($_SESSION['admin_id'] ?? null)) {
                echo json_encode(['success' => false, 'message' => 'Cannot delete your own account']);
                exit;
            }
            
            $user = $admins_collection->findOne(['_id' => new ObjectId($user_id)]);
            if (!$user) {
                echo json_encode(['success' => false, 'message' => 'User not found']);
                exit;
            }
            
            $admins_collection->deleteOne(['_id' => new ObjectId($user_id)]);
            
            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
