<?php
require_once 'config/database.php';

// Create a test admin user with known password
$testAdmin = [
    'username' => 'admin_test',
    'email' => 'admin_test@gmail.com',
    'password' => password_hash('admin123', PASSWORD_BCRYPT),
    'role' => 'admin',
    'status' => 'active',
    'created_at' => new MongoDB\BSON\UTCDateTime(),
    'created_by' => 'system',
    'updated_at' => new MongoDB\BSON\UTCDateTime(),
    'updated_by' => 'system',
];

// Delete if exists
$admins_collection->deleteOne(['username' => 'admin_test']);

// Insert new user
$result = $admins_collection->insertOne($testAdmin);
echo "Test admin created: " . $result->getInsertedId();
?>
