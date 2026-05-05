<?php
/**
 * Improved Helpers File
 * Contains all utility and helper functions
 */

// ============================================
// STRING & OUTPUT FUNCTIONS
// ============================================

/**
 * Escape output for security (XSS prevention)
 */
function escape_output($data)
{
    return htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
}

/**
 * Sanitize input for MongoDB (prevent injection)
 */
function sanitize_input($data)
{
    if (is_array($data)) {
        return array_map('sanitize_input', $data);
    }

    // Remove null bytes
    $data = str_replace("\0", '', $data);
    // Trim whitespace
    $data = trim($data);

    return $data;
}

/**
 * Truncate string to length
 */
function truncate($text, $length = 50, $suffix = '...')
{
    if (strlen($text) > $length) {
        return substr($text, 0, $length) . $suffix;
    }
    return $text;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate email
 */
function is_valid_email($email)
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validate MongoDB ObjectId
 */
function is_valid_object_id($id)
{
    return preg_match('/^[0-9a-f]{24}$/i', $id) === 1;
}

/**
 * Validate password
 */
function is_valid_password($password)
{
    return strlen($password) >= 6;
}

// ============================================
// REQUEST FUNCTIONS
// ============================================

/**
 * Get GET parameter with sanitization
 */
function get_request($key, $default = '')
{
    if (isset($_GET[$key])) {
        return sanitize_input($_GET[$key]);
    }
    return $default;
}

/**
 * Get POST parameter with sanitization
 */
function post_request($key, $default = '')
{
    if (isset($_POST[$key])) {
        return sanitize_input($_POST[$key]);
    }
    return $default;
}

/**
 * Get request value (GET or POST)
 */
function get_value($key, $default = '')
{
    return post_request($key) ?: get_request($key, $default);
}

/**
 * Check if request is POST
 */
function is_post_request()
{
    return $_SERVER['REQUEST_METHOD'] === 'POST';
}

/**
 * Check if request is AJAX
 */
function is_ajax_request()
{
    return isset($_SERVER['HTTP_X_REQUESTED_WITH']) &&
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

// ============================================
// SESSION FUNCTIONS
// ============================================

/**
 * Initialize session
 */
function init_session()
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
        if (!isset($_SESSION['initialized'])) {
            session_regenerate_id(true);
            $_SESSION['initialized'] = true;
        }
    }
}

/**
 * Set flash message
 */
function set_flash($type, $message)
{
    init_session();
    $_SESSION['flash_type'] = $type;
    $_SESSION['flash_message'] = $message;
}

/**
 * Get flash message
 */
function get_flash()
{
    init_session();
    $type = $_SESSION['flash_type'] ?? '';
    $message = $_SESSION['flash_message'] ?? '';

    unset($_SESSION['flash_type']);
    unset($_SESSION['flash_message']);

    return ['type' => $type, 'message' => $message];
}

/**
 * Set success message
 */
function set_success($message)
{
    set_flash('success', $message);
}

/**
 * Set error message
 */
function set_error($message)
{
    set_flash('error', $message);
}

// ============================================
// SECURITY FUNCTIONS
// ============================================

/**
 * Generate CSRF token
 */
function generate_csrf_token()
{
    init_session();
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token
 */
function verify_csrf_token($token)
{
    init_session();
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Output CSRF token as hidden input
 */
function csrf_field()
{
    echo '<input type="hidden" name="csrf_token" value="' . escape_output(generate_csrf_token()) . '">';
}

/**
 * Hash password
 */
function hash_password($password)
{
    return password_hash($password, PASSWORD_BCRYPT);
}

/**
 * Verify password
 */
function verify_password($password, $hash)
{
    return password_verify($password, $hash);
}

// ============================================
// ARRAY FUNCTIONS
// ============================================

/**
 * Get nested array value
 */
function array_get($array, $key, $default = null)
{
    $keys = explode('.', $key);
    foreach ($keys as $k) {
        if (!is_array($array) || !isset($array[$k])) {
            return $default;
        }
        $array = $array[$k];
    }
    return $array;
}

/**
 * Filter array by keys
 */
function array_only($array, $keys)
{
    return array_intersect_key($array, array_flip($keys));
}

/**
 * Remove keys from array
 */
function array_except($array, $keys)
{
    return array_diff_key($array, array_flip($keys));
}

// ============================================
// DATE/TIME FUNCTIONS
// ============================================

/**
 * Format DateTime object
 */
function format_date($dateTime, $format = 'Y-m-d H:i')
{
    if ($dateTime instanceof \MongoDB\BSON\UTCDateTime) {
        $timestamp = (int)$dateTime;
        return date($format, $timestamp / 1000);
    }
    return '';
}

/**
 * Get human-readable time difference
 */
function time_ago($dateTime)
{
    if ($dateTime instanceof \MongoDB\BSON\UTCDateTime) {
        $timestamp = (int)$dateTime / 1000;
    } else {
        $timestamp = strtotime($dateTime);
    }

    $time = time() - $timestamp;
    $intervals = [
        'year' => 31536000,
        'month' => 2592000,
        'week' => 604800,
        'day' => 86400,
        'hour' => 3600,
        'minute' => 60
    ];

    foreach ($intervals as $name => $seconds) {
        $value = floor($time / $seconds);
        if ($value > 0) {
            return $value == 1 ? "1 $name ago" : "$value {$name}s ago";
        }
    }

    return 'just now';
}

// ============================================
// MONGODB FUNCTIONS
// ============================================

/**
 * Convert ObjectId to string
 */
function objectid_to_string($id)
{
    if ($id instanceof \MongoDB\BSON\ObjectId) {
        return (string)$id;
    }
    return $id;
}

/**
 * Convert string to ObjectId
 */
function string_to_objectid($id)
{
    if (is_valid_object_id($id)) {
        return new \MongoDB\BSON\ObjectId($id);
    }
    return null;
}

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log activity
 */
function log_activity($action, $description, $collection = null)
{
    if (!$collection) {
        return;
    }

    try {
        $collection->insertOne([
            'action' => $action,
            'description' => $description,
            'admin_id' => $_SESSION['admin_id'] ?? null,
            'ip_address' => $_SERVER['REMOTE_ADDR'],
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'created_at' => new \MongoDB\BSON\UTCDateTime(),
        ]);
    } catch (\Exception $e) {
        // Silent fail
    }
}

// ============================================
// REDIRECT FUNCTIONS
// ============================================

/**
 * Redirect to URL
 * NOTE: May be defined in includes/helpers.php, check before defining
 */
if (!function_exists('redirect')) {
    function redirect($url)
    {
        header('Location: ' . $url);
        exit;
    }
}

/**
 * Redirect with query parameter
 */
if (!function_exists('redirect_with')) {
    function redirect_with($path, $params = [])
    {
        $query = http_build_query($params);
        $url = $path . ($query ? '?' . $query : '');
        redirect($url);
    }
}

// ============================================
// JSON RESPONSE FUNCTIONS
// ============================================

/**
 * Send JSON response
 */
function json_response($success, $message = '', $data = [])
{
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

/**
 * Send JSON success response
 */
function json_success($message = '', $data = [])
{
    json_response(true, $message, $data);
}

/**
 * Send JSON error response
 */
function json_error($message = '', $data = [])
{
    json_response(false, $message, $data);
}
