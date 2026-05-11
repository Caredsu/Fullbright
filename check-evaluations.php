<?php
require_once __DIR__ . '/config/database.php';

$evals = $evaluations_collection->find([], ['sort' => ['_id' => -1], 'limit' => 10]);

echo "=== EVALUATIONS IN DATABASE ===\n";
foreach ($evals as $eval) {
    echo "ID: " . (string)$eval['_id'] . "\n";
    echo "Teacher: " . ($eval['teacher_id'] ?? 'N/A') . "\n";
    echo "Rating: " . ($eval['average_rating'] ?? 'N/A') . "\n";
    echo "Comments: " . (substr($eval['comments'] ?? '', 0, 50)) . "\n";
    echo "---\n";
}

echo "\nTotal evaluations: " . $evaluations_collection->countDocuments() . "\n";
?>
