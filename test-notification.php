<?php
/**
 * Test Notification - Creates a test evaluation to trigger notification system
 */

require_once __DIR__ . '/config/database.php';

try {
    // Get a random teacher to use for the test evaluation
    $teachers = $teachers_collection->find([])->toArray();
    if (empty($teachers)) {
        http_response_code(400);
        die(json_encode([
            'success' => false,
            'error' => 'No teachers found in the system'
        ], JSON_PRETTY_PRINT));
    }
    
    $randomTeacher = $teachers[array_rand($teachers)];
    $teacher_id = $randomTeacher['_id'];
    $teacher_name = isset($randomTeacher['first_name']) && isset($randomTeacher['last_name']) 
        ? trim($randomTeacher['first_name'] . ' ' . ($randomTeacher['middle_name'] ?? '') . ' ' . $randomTeacher['last_name'])
        : 'Unknown Teacher';
    
    // Create a test evaluation with proper structure
    $rating = rand(3, 5); // Random rating between 3-5
    
    $testEval = [
        'teacher_id' => $teacher_id,
        'teacher_name' => $teacher_name,
        'rating' => $rating,
        'answers' => [
            [
                'question_id' => 'teaching',
                'rating' => $rating
            ],
            [
                'question_id' => 'communication',
                'rating' => $rating
            ],
            [
                'question_id' => 'knowledge',
                'rating' => $rating
            ]
        ],
        'feedback' => 'Test evaluation - ' . date('Y-m-d H:i:s'),
        'submitted_at' => new MongoDB\BSON\UTCDateTime(time() * 1000),
        'created_at' => new MongoDB\BSON\UTCDateTime(time() * 1000),
        'evaluator_type' => 'student'
    ];

    $result = $evaluations_collection->insertOne($testEval);

    echo json_encode([
        'success' => true,
        'message' => 'Test evaluation created successfully!',
        'evaluation_id' => (string)$result->getInsertedId(),
        'teacher_name' => $teacher_name,
        'rating' => $rating,
        'created_at' => date('Y-m-d H:i:s'),
        'next_step' => 'Check dashboard - toast and badge should appear within 5 seconds'
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
