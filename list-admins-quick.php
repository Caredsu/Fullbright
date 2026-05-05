<?php
require_once 'config/database.php';
$admins = $admins_collection->find([], ['projection' => ['username' => 1, 'email' => 1, '_id' => 0]]);
foreach ($admins as $admin) {
    echo 'Username: ' . $admin['username'] . ', Email: ' . $admin['email'] . PHP_EOL;
}
?>
