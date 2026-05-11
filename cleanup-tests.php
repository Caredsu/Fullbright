<?php
/**
 * Clean up test evaluations
 */

require_once __DIR__ . '/config/database.php';

try {
    // Delete test evaluations (those with test_teacher_ prefix)
    $result = $evaluations_collection->deleteMany([
        'teacher_id' => ['$regex' => '^test_teacher_']
    ]);

    echo json_encode([
        'success' => true,
        'deleted_count' => $result->getDeletedCount(),
        'message' => 'Test evaluations cleaned up!'
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
