<?php
/**
 * Login API Endpoint
 * POST /api/login
 */

// DEBUG: Print .env file content to verify PHP can read it
if (isset($_GET['debug_env']) && $_GET['debug_env'] === 'file') {
    header('Content-Type: text/plain');
    $envPath = __DIR__ . '/../.env';
    if (file_exists($envPath)) {
        echo ".env file found at: $envPath\n\n";
        echo file_get_contents($envPath);
    } else {
        echo ".env file NOT FOUND at: $envPath\n";
    }
    exit;
}

// Handle CORS preflight requests FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

use App\Database;

// DEBUG OUTPUT - REMOVE AFTER TEST
if (isset($_GET['debug_env']) && $_GET['debug_env'] === '1') {
    header('Content-Type: text/plain');
    echo "DB_HOST: ", defined('DB_HOST') ? DB_HOST : '', "\n";
    echo "DB_NAME: ", defined('DB_NAME') ? DB_NAME : '', "\n";
    echo "getenv('DB_HOST'): ", var_export(getenv('DB_HOST'), true), "\n";
    echo "\n\n";
    echo "_ENV:\n";
    print_r($_ENV);
    echo "\n_SERVER:\n";
    print_r($_SERVER);
    exit;
}

setJsonHeader();

$method = getRequestMethod();

if ($method !== 'POST') {
    sendError('Method not allowed', 405);
}

// Get JSON body
$body = getJsonBody();

if (!$body) {
    sendError('Invalid JSON body', 400);
}

// Validate required fields
$validation = validateRequiredFields($body, ['username', 'password']);
if (!$validation['valid']) {
    sendError($validation['message'], 400);
}

$username = sanitizeInput($body['username']);
$password = $body['password'];

try {
    $db = Database::getInstance();
    $usersCollection = $db->getCollection('users');

    // Find user by username
    $user = $usersCollection->findOne(['username' => $username]);

    if (!$user) {
        sendError('Invalid username or password', 401);
    }

    // Verify password
    if (!verifyPassword($password, $user['password_hashed'])) {
        sendError('Invalid username or password', 401);
    }

    // Check if user account is active
    $user_status = $user['status'] ?? 'active';
    if ($user_status !== 'active') {
        sendError('Your account has been deactivated. Please contact an administrator.', 403);
    }

    // Check if role is admin (superadmin or staff)
    if (!in_array($user['role'], ['superadmin', 'staff'])) {
        sendError('Access denied for your role', 403);
    }

    // Generate token
    $token = generateToken($user['_id'], $user['role']);

    // Return success response
    sendSuccess([
        'token' => $token,
        'user' => [
            'id' => objectIdToString($user['_id']),
            'username' => $user['username'],
            'role' => $user['role']
        ]
    ], 'Login successful', 200);

} catch (\Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
