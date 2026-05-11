<?php
/**
 * Test Notification - Creates a test evaluation to trigger notification system
 */

require_once __DIR__ . '/config/database.php';

try {
    // Create a test evaluation
    $testEval = [
        'teacher_id' => 'test_teacher_' . time(),
        'student_id' => 'test_student',
        'evaluator_type' => 'student',
        'ratings' => [
            'Teaching Effectiveness' => 5,
            'Communication' => 4,
            'Knowledge' => 5
        ],
        'comments' => 'Test evaluation for notification demo - ' . date('Y-m-d H:i:s'),
        'submitted_at' => new MongoDB\BSON\UTCDateTime(time() * 1000),
        'created_at' => new MongoDB\BSON\UTCDateTime(time() * 1000),
        'average_rating' => 4.67
    ];

    $result = $evaluations_collection->insertOne($testEval);

    echo json_encode([
        'success' => true,
        'message' => 'Test evaluation created successfully!',
        'evaluation_id' => (string)$result->getInsertedId(),
        'created_at' => date('Y-m-d H:i:s'),
        'next_step' => 'Return to admin dashboard - badge should appear within 5 seconds'
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
