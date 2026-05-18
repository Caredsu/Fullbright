<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';

// Get admin users
$admins = $admins_collection->find([], ['limit' => 5]);

echo "<h2>Admin Users</h2>";
echo "<pre>";
foreach ($admins as $admin) {
    echo "Username: " . ($admin['username'] ?? 'N/A') . "\n";
    echo "Role: " . ($admin['role'] ?? 'N/A') . "\n";
    echo "---\n";
}
echo "</pre>";

// Try to find credentials in any test files
echo "\n<h3>Quick Login</h3>";
echo "Try: admin / admin123<br>";
echo "Or: superadmin / superadmin123";
