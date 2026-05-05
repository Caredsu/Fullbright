<?php
/**
 * Session Test Script
 * Test if sessions are being saved and loaded correctly
 */

require_once __DIR__ . '/includes/helpers.php';

// Initialize session
initializeSession();

$action = $_GET['action'] ?? 'check';
$sessionId = session_id();

header('Content-Type: application/json; charset=utf-8');

if ($action === 'set') {
    // SET data in session
    $_SESSION['admin_id'] = 'test_admin_123';
    $_SESSION['admin_role'] = 'admin';
    $_SESSION['admin_username'] = 'testuser';
    $_SESSION['test_time'] = time();
    
    // Force write to disk
    session_write_close();
    
    die(json_encode([
        'action' => 'set',
        'session_id' => $sessionId,
        'data_set' => [
            'admin_id' => $_SESSION['admin_id'],
            'admin_role' => $_SESSION['admin_role'],
            'test_time' => $_SESSION['test_time']
        ],
        'message' => 'Session data set and written'
    ]));
    
} elseif ($action === 'get') {
    // GET data from session
    die(json_encode([
        'action' => 'get',
        'session_id' => $sessionId,
        'data_loaded' => [
            'admin_id' => $_SESSION['admin_id'] ?? null,
            'admin_role' => $_SESSION['admin_role'] ?? null,
            'admin_username' => $_SESSION['admin_username'] ?? null,
            'test_time' => $_SESSION['test_time'] ?? null
        ],
        'all_session_keys' => array_keys($_SESSION),
        'message' => 'Session data retrieved'
    ]));
    
} else {
    // CHECK status
    die(json_encode([
        'action' => 'check',
        'session_id' => $sessionId,
        'session_status' => session_status(),
        'session_status_text' => session_status() === PHP_SESSION_ACTIVE ? 'ACTIVE' : 'INACTIVE',
        'cookie_sent' => isset($_COOKIE[session_name()]) ? 'yes' : 'no',
        'data_in_session' => [
            'admin_id' => $_SESSION['admin_id'] ?? 'NOT SET',
            'admin_role' => $_SESSION['admin_role'] ?? 'NOT SET'
        ],
        'message' => 'Session status checked'
    ]));
}
?>
