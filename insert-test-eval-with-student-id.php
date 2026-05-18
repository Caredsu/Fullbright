<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';

// Find a teacher
$teacher = $teachers_collection->findOne([]);
if (!$teacher) {
    echo "No teachers found";
    exit;
}

// Create a test evaluation with student_id
$evaluation = [
    'teacher_id' => $teacher['_id'],
    'student_id' => '2201010092',  // TEST student ID
    'answers' => [
        ['question_id' => 'Q1', 'rating' => 5],
        ['question_id' => 'Q2', 'rating' => 5],
        ['question_id' => 'Q3', 'rating' => 5],
        ['question_id' => 'Q4', 'rating' => 5],
        ['question_id' => 'Q5', 'rating' => 5],
    ],
    'feedback' => 'Test evaluation with student ID',
    'submitted_at' => new \MongoDB\BSON\UTCDateTime(),
    'academic_year' => '2026',
    'semester' => 1,
];

$result = $evaluations_collection->insertOne($evaluation);

echo "✓ Test evaluation inserted successfully!\n";
echo "Evaluation ID: " . $result->getInsertedId() . "\n";
echo "Student ID: 2201010092\n";
echo "Teacher ID: " . $teacher['_id'] . "\n";
echo "\nCheck the admin results page to verify the student ID displays correctly.";
