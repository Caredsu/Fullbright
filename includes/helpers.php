<?php
/**
 * Helper Functions & Security
 * Includes: CSRF Protection, Input Sanitization, Authentication
 */

// Global error handler to prevent HTML error output in JSON APIs
if (!function_exists('isJsonApiRequest')) {
    function isJsonApiRequest() {
        $uri = $_SERVER['REQUEST_URI'] ?? '';
        // Exclude SSE endpoints (notifications-stream.php) from JSON error handler
        if (strpos($uri, 'notifications-stream.php') !== false) {
            return false;
        }
        return strpos($uri, '/api/') !== false;
    }
}

// Set error handler for JSON APIs (but NOT for SSE endpoints)
if (isJsonApiRequest()) {
    set_error_handler(function($errno, $errstr, $errfile, $errline) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error',
            'error' => $errstr,
            'file' => basename($errfile),
            'line' => $errline
        ]);
        exit;
    });
    
    set_exception_handler(function(Throwable $e) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Server error',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]);
        exit;
    });
}

// Set timezone to Manila, Philippines
date_default_timezone_set('Asia/Manila');

// ============================================
// SESSION & SECURITY FUNCTIONS
// ============================================

/**
 * Initialize secure session
 * Uses file-based sessions with enhanced reliability for Windows
 */
function initializeSession() {
    if (session_status() === PHP_SESSION_NONE) {
        // Set session config BEFORE starting
        ini_set('session.use_strict_mode', 0);  // Relaxed mode for Windows compatibility
        ini_set('session.use_only_cookies', 1);
        ini_set('session.gc_maxlifetime', 86400);  // 24 hours
        
        // Use project storage directory for sessions (avoids Windows permission issues)
        // This is under project root so Apache has write access
        $sessionSavePath = dirname(dirname(__FILE__)) . '/storage/sessions';
        
        // Ensure directory exists and is writable
        if (!is_dir($sessionSavePath)) {
            @mkdir($sessionSavePath, 0777, true);
        }
        // Set world-writable permissions for XAMPP compatibility
        @chmod($sessionSavePath, 0777);
        
        // Set session.save_path - MUST be done before session_start()
        ini_set('session.save_path', $sessionSavePath);
        
        // Configure session to handle permissions better
        // These settings help with file access on Windows/XAMPP
        ini_set('session.hash_bits_per_character', 6);
        ini_set('session.gc_probability', 1);
        ini_set('session.gc_divisor', 100);
        
        // Determine protocol and path
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;
        $basePath = $isLocalhost ? '/teacher-eval' : '/';
        
        // Set cookie params - these must be set before session_start()
        session_set_cookie_params([
            'path' => $basePath,
            'domain' => null,
            'secure' => $protocol === 'https',
            'httponly' => true,
            'samesite' => 'Lax',
            'lifetime' => 86400  // 24 hours
        ]);
        
        // Start session
        session_start();
        
        // After session starts, ensure the session file has proper permissions
        $sessionId = session_id();
        $sessionFile = $sessionSavePath . '/sess_' . $sessionId;
        if (file_exists($sessionFile)) {
            @chmod($sessionFile, 0666);  // Ensure file is readable/writable
        }
        
        error_log("[SESSION_INIT] Session started - ID: " . $sessionId . ", Path: $sessionSavePath, File exists: " . (file_exists($sessionFile) ? 'YES' : 'NO'));
    }
}

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Output CSRF token as hidden input
 */
function outputCSRFToken() {
    echo '<input type="hidden" name="csrf_token" value="' . escapeOutput(generateCSRFToken()) . '">';
}

/**
 * Check if request is AJAX
 */
function isAjaxRequest() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

// ============================================
// INPUT SANITIZATION & VALIDATION
// ============================================

/**
 * Escape output for security (XSS prevention)
 */
function escapeOutput($data) {
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize input for MongoDB (prevent injection)
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitizeInput($value);
        }
        return $data;
    }
    
    // Remove null bytes
    $data = str_replace("\0", '', $data);
    
    // Trim whitespace
    $data = trim($data);
    
    return $data;
}

/**
 * Validate email
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Validate MongoDB ObjectId
 */
function isValidObjectId($id) {
    return preg_match('/^[0-9a-f]{24}$/i', $id);
}

/**
 * Validate email format
 */
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Format full name from components
 * Format: Last Name, First Name M. (Middle Initial)
 * Handles both new (first/middle/last) and old (name) field structures
 */
function formatFullName($first_name = '', $middle_name = '', $last_name = '') {
    // If all fields are empty, return placeholder
    if (empty($first_name) && empty($last_name)) {
        return 'N/A';
    }
    
    // If only one of first or last name exists, use it
    if (empty($first_name) && !empty($last_name)) {
        return $last_name;
    }
    if (!empty($first_name) && empty($last_name)) {
        return $first_name;
    }
    
    // Build full name: Last Name, First Name M.
    $full_name = trim($last_name . ', ' . $first_name);
    
    if (!empty($middle_name)) {
        $middle_initial = strtoupper(substr($middle_name, 0, 1)) . '.';
        $full_name = trim($last_name . ', ' . $first_name . ' ' . $middle_initial);
    }
    
    return trim($full_name);
}

/**
 * Get POST data with sanitization
 */
function getPOST($key, $default = '') {
    if (isset($_POST[$key])) {
        return sanitizeInput($_POST[$key]);
    }
    return $default;
}

/**
 * Get GET data with sanitization
 */
function getGET($key, $default = '') {
    if (isset($_GET[$key])) {
        return sanitizeInput($_GET[$key]);
    }
    return $default;
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Hash password (bcrypt recommended)
 * Using cost 10 for balance between security and performance
 * Cost 12 takes ~1 second per login, cost 10 takes ~100ms
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
}

/**
 * Verify password
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['admin_id']) && !empty($_SESSION['admin_id']);
}

/**
 * Get logged in admin
 */
function getLoggedInAdmin() {
    return isset($_SESSION['admin_id']) ? $_SESSION['admin_id'] : null;
}

/**
 * Get logged in admin username
 */
function getLoggedInAdminUsername() {
    return isset($_SESSION['admin_username']) ? $_SESSION['admin_username'] : 'Unknown Admin';
}

/**
 * Check if user is admin role
 */
function isAdmin() {
    return isset($_SESSION['admin_role']) && $_SESSION['admin_role'] === 'admin';
}

/**
 * Check if user is staff role
 */
function isStaff() {
    return isset($_SESSION['admin_role']) && $_SESSION['admin_role'] === 'staff';
}

/**
 * Get admin login redirect URL (handles both production and development)
 */
function getAdminLoginUrl() {
    if (defined('BASE_URL')) {
        return BASE_URL . '/admin/login.php';
    }
    // Fallback if BASE_URL is not yet defined
    return '/teacher-eval/admin/login.php';
}

/**
 * Redirect to login if not authenticated
 */
function requireLogin() {
    if (!isLoggedIn()) {
        // Log why login is required
        error_log("[REQUIRE_LOGIN_FAIL] Session state:");
        error_log("  - Session status: " . session_status());
        error_log("  - Session ID: " . session_id());
        error_log("  - \$_SESSION keys: " . implode(', ', array_keys($_SESSION ?? [])));
        error_log("  - admin_id: " . ($_SESSION['admin_id'] ?? 'NOT SET'));
        error_log("  - admin_role: " . ($_SESSION['admin_role'] ?? 'NOT SET'));
        error_log("  - Request: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
        error_log("  - Cookie header: " . ($_SERVER['HTTP_COOKIE'] ?? 'NO COOKIES'));
        
        header('Location: ' . getAdminLoginUrl());
        exit;
    }
}

/**
 * Logout user
 */
function logout() {
    session_destroy();
    header('Location: ' . getAdminLoginUrl());
    exit;
}

/**
 * Set success message
 */
function setSuccessMessage($message) {
    $_SESSION['success_message'] = $message;
}

/**
 * Set error message
 */
function setErrorMessage($message) {
    $_SESSION['error_message'] = $message;
}

/**
 * Get and clear success message
 */
function getSuccessMessage() {
    $message = $_SESSION['success_message'] ?? '';
    unset($_SESSION['success_message']);
    return $message;
}

/**
 * Get and clear error message
 */
function getErrorMessage() {
    $message = $_SESSION['error_message'] ?? '';
    unset($_SESSION['error_message']);
    return $message;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Redirect to URL
 */
function redirect($url) {
    header("Location: $url");
    exit;
}

/**
 * Generate random token
 */
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

/**
 * Format date/time for display (Manila, PH timezone)
 */
function formatDateTime($date) {
    if ($date instanceof \MongoDB\BSON\UTCDateTime) {
        $dateTime = $date->toDateTime();
        $dateTime->setTimezone(new \DateTimeZone('Asia/Manila'));
        return $dateTime->format('M d, Y h:i A'); // Example: Jan 15, 2025 02:30 PM
    }
    return $date;
}

/**
 * Format date/time with username (for Last Updated column)
 */
function formatDateTimeWithUser($date, $username = '') {
    if ($date instanceof \MongoDB\BSON\UTCDateTime) {
        $dateTime = $date->toDateTime();
        $dateTime->setTimezone(new \DateTimeZone('Asia/Manila'));
        $formatted_date = $dateTime->format('M d, Y h:i A');
        
        if (!empty($username)) {
            return $formatted_date . '<br><small class="text-muted">by ' . escapeOutput($username) . '</small>';
        }
        return $formatted_date;
    }
    return $date;
}

/**
 * Convert MongoDB ObjectId to string
 */
function objectIdToString($id) {
    return (string) $id;
}

/**
 * Log activity to console/file
 */
function logActivity($action, $details = '') {
    $log = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'details' => $details,
        'admin_id' => getLoggedInAdmin(),
        'admin_username' => getLoggedInAdminUsername(),
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ];
    
    // Log to file for development
    // error_log(json_encode($log) . PHP_EOL, 3, __DIR__ . '/../logs/activity.log');
}

/**
 * Generate response JSON
 */
function jsonResponse($success, $message, $data = []) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// ============================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================

/**
 * Get user role
 */
function getUserRole() {
    return $_SESSION['admin_role'] ?? 'guest';
}

/**
 * Check if user has specific permission
 */
function hasPermission($permission) {
    $role = getUserRole();
    
    if (!isset(ROLE_PERMISSIONS[$role])) {
        return false;
    }
    
    return in_array($permission, ROLE_PERMISSIONS[$role]);
}

/**
 * Check if user has specific role
 */
function hasRole($role) {
    return getUserRole() === $role;
}

/**
 * Check if user role is greater than or equal to specified role
 */
function hasRoleLevel($target_role) {
    $user_role = getUserRole();
    $user_level = ROLE_HIERARCHY[$user_role] ?? 0;
    $target_level = ROLE_HIERARCHY[$target_role] ?? 0;
    
    return $user_level >= $target_level;
}

/**
 * Require specific permission (exit if not authorized)
 */
function requirePermission($permission) {
    if (!hasPermission($permission)) {
        http_response_code(403);
        die('Access Denied: You do not have permission to access this resource.');
    }
}

/**
 * Require specific role (exit if not authorized)
 */
function requireRole($role) {
    if (!hasRole($role)) {
        http_response_code(403);
        $role_display = USER_ROLES[$role] ?? ucfirst($role);
        die('Access Denied: This action requires ' . $role_display . ' role or higher.');
    }
}

/**
 * Require minimum role level
 */
function requireRoleLevel($target_role) {
    if (!hasRoleLevel($target_role)) {
        http_response_code(403);
        die('Access Denied: This action requires ' . ucfirst($target_role) . ' role or higher.');
    }
}

/**
 * Get all role options for dropdowns
 */
function getRoleOptions() {
    return USER_ROLES;
}

/**
 * Get permissions for a role
 */
function getRolePermissions($role) {
    return ROLE_PERMISSIONS[$role] ?? [];
}

/**
 * Get user role display name
 */
function getRoleDisplayName($role) {
    return USER_ROLES[$role] ?? 'Unknown';
}

/**
 * Get role hierarchy level
 */
function getRoleLevel($role) {
    return ROLE_HIERARCHY[$role] ?? 0;
}

// ============================================
// API HELPER FUNCTIONS
// ============================================

/**
 * Set JSON response header
 */
function setJsonHeader() {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
}

/**
 * Get HTTP request method
 */
function getRequestMethod() {
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

/**
 * Get JSON body from request
 */
function getJsonBody() {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}

/**
 * Send success response (JSON)
 */
function sendSuccess($data = [], $message = 'Success', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

/**
 * Send error response (JSON)
 */
function sendError($message = 'Error', $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'data' => []
    ]);
    exit;
}

/**
 * Validate required fields in request body
 */
function validateRequiredFields($body, $requiredFields) {
    foreach ($requiredFields as $field) {
        if (empty($body[$field])) {
            return [
                'valid' => false,
                'message' => "Field '$field' is required"
            ];
        }
    }
    return ['valid' => true, 'message' => 'OK'];
}

/**
 * Check if department exists in allowed list
 */
function isValidDepartment($dept) {
    $allowed = ['ECT', 'EDUC', 'CCJE', 'BHT'];
    return in_array($dept, $allowed);
}

/**
 * Validate rating is between 1-5
 */
function isValidRating($rating) {
    return is_numeric($rating) && (int)$rating >= 1 && (int)$rating <= 5;
}

/**
 * Convert string ID to MongoDB ObjectId
 */
function stringToObjectId($id) {
    if (!isValidObjectId($id)) {
        return null;
    }
    try {
        return new MongoDB\BSON\ObjectId($id);
    } catch (\Exception $e) {
        return null;
    }
}

/**
 * Get list of valid departments
 */
function getValidDepartments() {
    return ['ECT', 'EDUC', 'CCJE', 'BHT'];
}

/**
 * Get ID from URL path (used in REST API endpoints)
 * Extracts the last segment of the path as an ID, handling both .php and non-.php cases
 */
function getIdFromPath() {
    global $ORIGINAL_REQUEST_PATH;
    
    $path = '';
    
    // Try to use the original request path set by index.php router
    if (isset($ORIGINAL_REQUEST_PATH) && !empty($ORIGINAL_REQUEST_PATH)) {
        $path = $ORIGINAL_REQUEST_PATH;
    } else {
        // Fallback to REQUEST_URI parsing
        $path = $_SERVER['REQUEST_URI'] ?? '';
    }
    
    // Validate that we have a path
    if (empty($path)) {
        return '';
    }
    
    // Remove .php extension if present
    $path = str_replace('.php', '', $path);
    $path = str_replace('.PHP', '', $path);
    
    // Split by / and get non-empty segments
    $segments = array_filter(explode('/', trim($path, '/')), function($s) {
        return strlen(trim($s)) > 0;
    });
    
    if (empty($segments)) {
        return '';
    }
    
    // Get the last segment
    $last_segment = end($segments);
    
    // List of keywords that are route names, not IDs
    $keywords = [
        'api', 'admin', 'index', 'login', 'teachers', 'questions', 'evaluations', 
        'departments', 'dashboard', 'users', 'analytics', 'results', 'settings',
        'edit', 'delete', 'create', 'update', 'export', 'import', 'teacher-eval'
    ];
    
    // If the last segment is a keyword, return empty
    if (in_array(strtolower($last_segment), $keywords)) {
        return '';
    }
    
    // Otherwise, it's likely an ID (MongoDB ObjectId or numeric ID)
    return $last_segment;
}

/**
 * Require authentication and specific roles
 */
function requireAuth($required_roles = []) {
    // API endpoints are public by default
    // Override this function if you need authentication for specific endpoints
    return null;
}

/**
 * Convert numeric rating to qualitative assessment
 * @param float $rating Average rating (1-5)
 * @return array ['rating' => 'label', 'color' => 'hex_color', 'description' => 'full_text']
 */
function getQualitativeAssessment($rating) {
    $rating = (float)$rating;
    
    if ($rating >= 4.5) {
        return [
            'rating' => 'Outstanding',
            'color' => '#198754',
            'badge_bg' => 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            'description' => 'Exceptionally excellent performance'
        ];
    } elseif ($rating >= 4.0) {
        return [
            'rating' => 'Excellent',
            'color' => '#28a745',
            'badge_bg' => 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
            'description' => 'Consistently excellent performance'
        ];
    } elseif ($rating >= 3.0) {
        return [
            'rating' => 'Good',
            'color' => '#17a2b8',
            'badge_bg' => 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
            'description' => 'Good performance overall'
        ];
    } elseif ($rating >= 2.0) {
        return [
            'rating' => 'Satisfactory',
            'color' => '#ffc107',
            'badge_bg' => 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            'description' => 'Satisfactory but needs improvement'
        ];
    } else {
        return [
            'rating' => 'Needs Improvement',
            'color' => '#dc3545',
            'badge_bg' => 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
            'description' => 'Significant improvement needed'
        ];
    }
}

/**
 * Build admin path
 * @param string $file Filename to build path for
 * @return string Full admin path
 */
function adminPath($file = '') {
    $base = '/teacher-eval/admin/';
    return $base . $file;
}

