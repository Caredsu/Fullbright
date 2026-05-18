<?php
/**
 * Simplified Teachers API - minimal version for debugging
 */

// Headers first
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Load dependencies
    require_once __DIR__ . '/../vendor/autoload.php';
    require_once __DIR__ . '/../app/Constants.php';
    require_once __DIR__ . '/../includes/helpers.php';
    require_once __DIR__ . '/../config/database.php';
    
    // For now, just return all teachers on GET
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all teachers
        $teachers = $teachers_collection->find([], [
            'projection' => [
                'firstname' => 1, 'lastname' => 1, 'middlename' => 1,
                'department' => 1, 'email' => 1, 'status' => 1, 'picture' => 1,
                'created_at' => 1, 'updated_at' => 1, 'updated_by' => 1
            ]
        ])->toArray();

        // Format teachers
        $formatted = array_map(function($t) {
            return [
                'id' => (string)$t['_id'],
                'first_name' => $t['firstname'] ?? '',
                'last_name' => $t['lastname'] ?? '',
                'middle_name' => $t['middlename'] ?? '',
                'department' => $t['department'] ?? '',
                'email' => $t['email'] ?? '',
                'status' => $t['status'] ?? 'active',
                'picture' => $t['picture'] ?? null,
                'created_at' => isset($t['created_at']) ? $t['created_at']->toDateTime()->format('Y-m-d H:i:s') : '',
                'updated_at' => isset($t['updated_at']) ? $t['updated_at']->toDateTime()->format('Y-m-d H:i:s') : '',
                'updated_by' => $t['updated_by'] ?? 'system'
            ];
        }, $teachers);

        echo json_encode([
            'success' => true,
            'message' => 'Teachers retrieved successfully',
            'data' => $formatted
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ]);
}
?>
