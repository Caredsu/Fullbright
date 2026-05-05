<?php
/**
 * Session Diagnostic Endpoint
 * GET /api/diagnose-session.php
 * 
 * Returns diagnostic information about current session state
 * THIS IS A DIAGNOSTIC TOOL - Should be removed before production
 */

// Initialize session
require_once __DIR__ . '/../includes/helpers.php';

// Set JSON response header
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// Initialize session
initializeSession();

try {
    $sessionId = session_id();
    $cookieName = session_name();
    $sessPath = session_save_path();
    $sessFile = $sessPath . '/sess_' . $sessionId;
    
    // Get information about the session file
    $fileInfo = [];
    if (file_exists($sessFile)) {
        $fileInfo = [
            'exists' => true,
            'path' => $sessFile,
            'size' => 'unknown',
            'readable' => 'unknown',
            'writable' => 'unknown',
            'modified' => 'unknown',
            'permissions' => 'unknown'
        ];
        
        try {
            $fileInfo['size'] = filesize($sessFile);
            $fileInfo['readable'] = is_readable($sessFile) ? 'yes' : 'no';
            $fileInfo['writable'] = is_writable($sessFile) ? 'yes' : 'no';
            $fileInfo['modified'] = date('Y-m-d H:i:s', filemtime($sessFile));
            $fileInfo['permissions'] = substr(sprintf('%o', fileperms($sessFile)), -4);
        } catch (Exception $e) {
            $fileInfo['stat_error'] = $e->getMessage();
        }
        
        // Try to read content safely
        try {
            if (is_readable($sessFile)) {
                $content = file_get_contents($sessFile);
                if ($content !== false) {
                    $fileInfo['content_size'] = strlen($content);
                    $fileInfo['content_empty'] = empty($content);
                    $fileInfo['content_preview'] = strlen($content) > 200 
                        ? substr($content, 0, 200) . '...' 
                        : $content;
                } else {
                    $fileInfo['content_error'] = 'Could not read file content';
                }
            } else {
                $fileInfo['readable_error'] = 'File not readable (permissions issue)';
            }
        } catch (Exception $e) {
            $fileInfo['read_error'] = $e->getMessage();
        }
    } else {
        $fileInfo = [
            'exists' => false,
            'path' => $sessFile,
            'message' => 'Session file does not exist'
        ];
    }
    
    $diagnostic = [
        'timestamp' => date('Y-m-d H:i:s'),
        'session' => [
            'id' => $sessionId,
            'name' => $cookieName,
            'status' => session_status(),
            'status_text' => session_status() === PHP_SESSION_ACTIVE ? 'ACTIVE' : 'INACTIVE'
        ],
        'session_data' => [
            'admin_id' => $_SESSION['admin_id'] ?? null,
            'admin_username' => $_SESSION['admin_username'] ?? null,
            'admin_role' => $_SESSION['admin_role'] ?? null,
            'admin_logged_in' => isset($_SESSION['admin_id']) ? 'yes' : 'no',
            'all_keys' => array_keys($_SESSION ?? [])
        ],
        'cookie' => [
            'sent_by_client' => isset($_COOKIE[$cookieName]) ? 'yes' : 'no',
            'cookie_value_from_client' => $_COOKIE[$cookieName] ?? null,
            'http_cookie_header' => $_SERVER['HTTP_COOKIE'] ?? null
        ],
        'storage' => [
            'save_path' => $sessPath,
            'save_path_valid' => is_dir($sessPath) ? 'yes' : 'no',
            'file_info' => $fileInfo
        ],
        'php_info' => [
            'session_use_cookies' => ini_get('session.use_cookies'),
            'session_use_only_cookies' => ini_get('session.use_only_cookies'),
            'session_use_strict_mode' => ini_get('session.use_strict_mode'),
            'session_gc_maxlifetime' => ini_get('session.gc_maxlifetime'),
            'upload_tmp_dir' => ini_get('upload_tmp_dir'),
            'tmp_dir' => sys_get_temp_dir()
        ]
    ];
    
    http_response_code(200);
    echo json_encode($diagnostic, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
} catch (Throwable $t) {
    http_response_code(500);
    echo json_encode([
        'error' => $t->getMessage(),
        'file' => $t->getFile(),
        'line' => $t->getLine()
    ]);
}
?>
