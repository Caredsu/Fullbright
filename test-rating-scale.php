<?php
/**
 * Test endpoint to verify rating scale is being saved and retrieved
 */
require_once __DIR__ . '/config/database.php';

// Get all questions with rating_scale
$questions = $questions_collection->find(
    ['status' => 'active'],
    ['sort' => ['question_order' => 1]]
)->toArray();

echo "<h2>Questions with Rating Scales</h2>";
foreach ($questions as $q) {
    echo "<div style='margin: 20px; border: 1px solid #ccc; padding: 10px;'>";
    echo "<h3>" . htmlspecialchars($q['question_text']) . "</h3>";
    
    echo "<p><strong>Rating Scale:</strong></p>";
    if (isset($q['rating_scale'])) {
        echo "<pre>" . json_encode($q['rating_scale'], JSON_PRETTY_PRINT) . "</pre>";
    } else {
        echo "<p style='color: red;'><strong>❌ No rating_scale found in database!</strong></p>";
    }
    
    echo "</div>";
}

// Also test the API response
echo "<h2>API Response Test</h2>";
echo "<pre>";
echo "Testing GET /api/questions.php\n\n";

// Manually format the response as the API would
$formattedQuestions = array_map(function($question) {
    $defaultRatingScale = [
        1 => 'Does not meet expectations',
        2 => 'Below average / Needs improvement',
        3 => 'Meets expectations / Average',
        4 => 'Exceeds expectations / Good',
        5 => 'Outstanding / Excellent'
    ];
    
    $ratingScale = $question['rating_scale'] ?? $defaultRatingScale;
    
    return [
        'id' => (string)$question['_id'],
        'question_text' => $question['question_text'] ?? '',
        'rating_scale' => $ratingScale
    ];
}, $questions);

echo json_encode($formattedQuestions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
echo "</pre>";
?>
