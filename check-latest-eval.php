<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';

// Get latest 3 evaluations
$evaluations = $evaluations_collection->find([], [
    'sort' => ['submitted_at' => -1],
    'limit' => 3,
    'projection' => [
        '_id' => 1,
        'teacher_id' => 1,
        'student_id' => 1,
        'submitted_at' => 1,
        'answers' => 1
    ]
]);

echo "<h2>Latest 3 Evaluations</h2>";
echo "<pre>";
foreach ($evaluations as $eval) {
    echo "ID: " . $eval['_id'] . "\n";
    echo "Teacher ID: " . $eval['teacher_id'] . "\n";
    echo "Student ID: " . ($eval['student_id'] ?? 'NOT SET') . "\n";
    if ($eval['submitted_at'] instanceof \MongoDB\BSON\UTCDateTime) {
        $dt = $eval['submitted_at']->toDateTime();
        $dt->setTimezone(new \DateTimeZone('Asia/Manila'));
        echo "Submitted: " . $dt->format('Y-m-d H:i:s A') . "\n";
    }
    echo "Answers Count: " . (is_array($eval['answers']) ? count($eval['answers']) : count(iterator_to_array($eval['answers']))) . "\n";
    echo "---\n";
}
echo "</pre>";

// Check if there are ANY evaluations with student_id
$evaluationsWithStudentId = $evaluations_collection->find(['student_id' => ['$exists' => true, '$ne' => '']], [
    'limit' => 1,
    'projection' => ['_id' => 1, 'student_id' => 1]
]);

$count = 0;
foreach ($evaluationsWithStudentId as $eval) {
    $count++;
}
echo "\n<h3>Evaluations with student_id: $count</h3>";
