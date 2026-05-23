<?php
/**
 * Debug script to check if positive/negative feedback was saved
 */

require_once 'config/database.php';

// Get the latest evaluation
$latestEval = $evaluations_collection->findOne([], ['sort' => ['_id' => -1]]);

if ($latestEval) {
    echo "<pre>";
    echo "Latest Evaluation:\n";
    echo "Teacher ID: " . $latestEval['teacher_id'] . "\n";
    echo "Student ID: " . ($latestEval['student_id'] ?? 'N/A') . "\n";
    echo "Feedback field: " . ($latestEval['feedback'] ?? 'NOT SET') . "\n";
    echo "Positive Feedback: " . ($latestEval['positive_feedback'] ?? 'NOT SET') . "\n";
    echo "Negative Feedback: " . ($latestEval['negative_feedback'] ?? 'NOT SET') . "\n";
    echo "\nAll keys in document:\n";
    print_r(array_keys((array)$latestEval));
    echo "\nFull document:\n";
    print_r($latestEval);
    echo "</pre>";
} else {
    echo "No evaluations found";
}
?>
