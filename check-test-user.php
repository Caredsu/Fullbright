<?php
require_once 'config/database.php';
$admin = $admins_collection->findOne(['username' => 'test']);
if ($admin) {
    echo "Found test user: " . var_export($admin, true);
} else {
    echo "Test user not found";
}
?>
