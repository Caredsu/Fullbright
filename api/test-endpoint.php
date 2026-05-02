<?php
/**
 * Test API Endpoint - verify .htaccess routing works
 */
header('Content-Type: application/json');

echo json_encode([
    'status' => 'ok',
    'message' => 'API routing is working!',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion()
]);
exit;
?>
