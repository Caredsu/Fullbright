<?php
/**
 * Users API Endpoint
 * Wrapper that handles GET requests for users
 * GET /api/users - Get all users
 * POST /api/users - Add new user
 * PUT /api/users/{id} - Update user
 * DELETE /api/users/{id} - Delete user
 */

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
    
    // Check if logged in
    if (empty($_SESSION['admin_id'])) {
        // Try to restore from PHPSESSID cookie if session is empty
        $phpSessionId = $_COOKIE['PHPSESSID'] ?? null;
        
        if ($phpSessionId) {
            // Restore session from session file
            $sessionSavePath = dirname(dirname(__FILE__)) . '/storage/sessions';
            $sessionFile = $sessionSavePath . '/sess_' . $phpSessionId;
            
            if (file_exists($sessionFile)) {
                $sessionData = @file_get_contents($sessionFile);
                if ($sessionData !== false && !empty($sessionData)) {
                    // Parse session data
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
                        $_SESSION[$varname] = $data;
                        $offset += strlen(serialize($data));
                    }
                }
            }
        }
    }
    
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
    
    global $admins_collection;
    
    if (!isset($admins_collection)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database not initialized']);
        exit;
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Get page and limit from query string
        $page = (int)($_GET['page'] ?? 1);
        $limit = (int)($_GET['limit'] ?? 10);
        $skip = ($page - 1) * $limit;
        
        // Get total count for pagination
        $total = $admins_collection->countDocuments([]);
        
        // Get users with pagination
        $users = $admins_collection->find(
            [],
            [
                'sort' => ['created_at' => -1],
                'skip' => $skip,
                'limit' => $limit
            ]
        )->toArray();
        
        $formatted_users = [];
        foreach ($users as $user) {
            $created_at = $user['created_at'] ?? null;
            $updated_at = $user['updated_at'] ?? null;
            $last_login = $user['last_login'] ?? null;
            
            // Format DateTime objects
            if (is_object($created_at) && method_exists($created_at, 'toDateTime')) {
                $created_at = $created_at->toDateTime()->format('Y-m-d H:i:s');
            } else {
                $created_at = '';
            }
            
            if (is_object($updated_at) && method_exists($updated_at, 'toDateTime')) {
                $updated_at = $updated_at->toDateTime()->format('Y-m-d H:i:s');
            } else {
                $updated_at = '';
            }
            
            if (is_object($last_login) && method_exists($last_login, 'toDateTime')) {
                $last_login = $last_login->toDateTime()->format('Y-m-d H:i:s');
            } else {
                $last_login = 'Never';
            }
            
            $formatted_users[] = [
                'id' => (string)$user['_id'],
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
        
        // Return paginated response
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'data' => $formatted_users,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ],
            'message' => 'Users retrieved successfully'
        ]);
        exit;
    }
    
    // For POST, PUT, DELETE - delegate to admin_users.php logic
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
