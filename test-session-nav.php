<?php
/**
 * Test Session Persistence Across Navigation
 * Simulates clicking between admin pages to check session survival
 */

require_once 'includes/helpers.php';
require_once 'config/database.php';

// Start from dashboard
echo "=== TEST: Session Navigation ===\n\n";

// Simulate dashboard page load
echo "1️⃣ Dashboard Page Load:\n";
initializeSession();
$_SESSION['admin_id'] = 'test_admin_123';
$_SESSION['admin_username'] = 'test_admin';
$_SESSION['admin_role'] = 'admin';
echo "   ✅ Session set:\n";
echo "   - admin_id: " . $_SESSION['admin_id'] . "\n";
echo "   - admin_role: " . $_SESSION['admin_role'] . "\n";
echo "   - Session ID: " . session_id() . "\n";
echo "   - Session Status: " . (session_status() === PHP_SESSION_ACTIVE ? 'ACTIVE' : 'NOT ACTIVE') . "\n\n";

// Save session
session_write_close();
echo "   ✅ Session saved and closed\n\n";

// Simulate page navigation - new request to Teachers page
echo "2️⃣ Teachers Page Navigation (simulating new HTTP request):\n";

// Restart PHP to simulate new page request
echo "   ⚠️  Simulating new HTTP request to /admin/teachers.php\n";

// Re-initialize like teachers.php does
initializeSession();
echo "   ✅ Session re-initialized\n";
echo "   - admin_id: " . ($_SESSION['admin_id'] ?? 'MISSING!') . "\n";
echo "   - admin_role: " . ($_SESSION['admin_role'] ?? 'MISSING!') . "\n";
echo "   - Session ID: " . session_id() . "\n\n";

// Check login status
if (!isset($_SESSION['admin_id']) || empty($_SESSION['admin_id'])) {
    echo "   ❌ ERROR: Session lost! auto_id is missing\n";
} else {
    echo "   ✅ Session preserved\n";
}

// Check permissions
if (isset($_SESSION['admin_role'])) {
    $role = $_SESSION['admin_role'];
    echo "   - Checking permissions for role: $role\n";
    
    // This is what requirePermission does
    if (!isset(ROLE_PERMISSIONS[$role])) {
        echo "   ❌ ERROR: Role not found in ROLE_PERMISSIONS!\n";
        echo "   Available roles: " . implode(', ', array_keys(ROLE_PERMISSIONS)) . "\n";
    } elseif (in_array('manage_teachers', ROLE_PERMISSIONS[$role])) {
        echo "   ✅ Permission 'manage_teachers' granted\n";
    } else {
        echo "   ❌ Permission 'manage_teachers' denied\n";
    }
}

// Check for cookie settings
echo "\n3️⃣ Session Cookie Settings:\n";
echo "   - session.cookie_path: " . ini_get('session.cookie_path') . "\n";
echo "   - session.cookie_domain: " . ini_get('session.cookie_domain') . "\n";
echo "   - session.cookie_secure: " . (ini_get('session.cookie_secure') ? 'true' : 'false') . "\n";
echo "   - session.cookie_httponly: " . (ini_get('session.cookie_httponly') ? 'true' : 'false') . "\n";
echo "   - session.cookie_samesite: " . ini_get('session.cookie_samesite') . "\n";
echo "   - session.use_strict_mode: " . (ini_get('session.use_strict_mode') ? 'true' : 'false') . "\n";

echo "\n4️⃣ Session Handler:\n";
echo "   - Handler: " . ini_get('session.save_handler') . "\n";
echo "   - Save path: " . ini_get('session.save_path') . "\n";

?>
