<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';

// Get the latest test evaluation (the one we just inserted)
$eval = $evaluations_collection->findOne(
    ['student_id' => '2201010092'],
    ['sort' => ['submitted_at' => -1]]
);

if (!$eval) {
    echo "Test evaluation not found";
    exit;
}

$teacher = $teachers_collection->findOne(['_id' => $eval['teacher_id']]);
$student_id = $eval['student_id'] ?? 'Anonymous';

echo "<h2>Test Evaluation Display</h2>";
echo "<p><strong>Teacher:</strong> " . (($teacher['first_name'] ?? '') . ' ' . ($teacher['last_name'] ?? '')) . "</p>";
echo "<p><strong>Student Number:</strong> " . htmlspecialchars($student_id) . "</p>";
echo "<p><strong>Student ID from DB:</strong> " . var_export($eval['student_id'] ?? null, true) . "</p>";

// This should display: "Student Number: 2201010092"
// If it shows "Anonymous", then there's an issue with the field
