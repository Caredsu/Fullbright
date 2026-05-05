<?php
/**
 * Diagnostic script to check session file contents
 */

require_once 'includes/helpers.php';

// Initialize session
initializeSession();

$sessionId = session_id();
$sessionPath = ini_get('session.save_path');

echo "<h2>Session Diagnostics</h2>";
echo "<p><strong>Session ID:</strong> $sessionId</p>";
echo "<p><strong>Session Save Path:</strong> $sessionPath</p>";

// Build expected session file path
$sessionFile = $sessionPath . '/sess_' . $sessionId;

echo "<p><strong>Expected Session File:</strong> $sessionFile</p>";
echo "<p><strong>File Exists:</strong> " . (file_exists($sessionFile) ? "YES" : "NO") . "</p>";

if (file_exists($sessionFile)) {
    $contents = file_get_contents($sessionFile);
    echo "<p><strong>File Size:</strong> " . strlen($contents) . " bytes</p>";
    echo "<p><strong>File Contents (raw):</strong></p>";
    echo "<pre>" . htmlspecialchars($contents) . "</pre>";
    
    // Try to parse session data
    echo "<p><strong>File Contents (parsed):</strong></p>";
    $parsed = unserialize($contents);
    echo "<pre>" . htmlspecialchars(var_export($parsed, true)) . "</pre>";
}

echo "<p><strong>\$_SESSION Contents:</strong></p>";
echo "<pre>" . htmlspecialchars(var_export($_SESSION, true)) . "</pre>";

echo "<p><strong>HTTP Cookies Received:</strong> " . ($_SERVER['HTTP_COOKIE'] ?? 'NONE') . "</p>";

echo "<hr>";
echo "<h2>Set Session Data Now</h2>";
echo "<form method='post'>";
echo "<input type='submit' name='action' value='set'>";
echo "</form>";

if ($_POST['action'] === 'set') {
    $_SESSION['test_admin_id'] = 'TEST_ID_' . time();
    $_SESSION['test_timestamp'] = date('Y-m-d H:i:s');
    session_write_close();
    echo "<p style='color: green;'><strong>Session data set and written to disk</strong></p>";
    echo "<p>Refresh page to verify data persists</p>";
}
?>
