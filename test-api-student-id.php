<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';
require_once 'includes/helpers.php';

// Disable session for this test
// Get a teacher ID
$teacher = $teachers_collection->findOne([]);
if (!$teacher) {
    die("No teachers found");
}
$teacherId = (string)$teacher['_id'];

// Simulate an API request with student_id
$payload = [
    'teacher_id' => $teacherId,
    'answers' => [
        'q1' => 5,
        'q2' => 5,
        'q3' => 5,
        'q4' => 5,
        'q5' => 5,
    ],
    'student_id' => '2201010099',  // TEST with student ID
];

// Simulate the API call
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';
$_SERVER['HTTP_USER_AGENT'] = 'TestClient/1.0';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';

// Temporarily override getJsonBody() to return our payload
$GLOBALS['test_json_body'] = $payload;

// Check if student_id extraction works
$studentId = sanitizeInput($payload['student_id'] ?? '');
echo "Extracted student_id: '" . $studentId . "' (length: " . strlen($studentId) . ")\n";
echo "Is it empty? " . ($studentId ? "No" : "Yes") . "\n";

// Now let's directly test the model
require_once 'app/Models/Evaluation.php';
$model = new \App\Models\Evaluation($evaluations_collection);

$evalId = $model->create([
    'teacher_id' => new MongoDB\BSON\ObjectId($teacherId),
    'answers' => [
        ['question_id' => 'q1', 'rating' => 5],
        ['question_id' => 'q2', 'rating' => 5],
    ],
    'student_id' => $studentId,
    'device_id' => 'test-device',
    'ip_address' => '127.0.0.1',
    'user_agent' => 'Test',
    'device_fingerprint' => 'test-fingerprint',
    'session_identifier' => '127.0.0.1'
]);

echo "\n✓ Model created evaluation: " . $evalId . "\n";

// Now retrieve it and check
$savedEval = $evaluations_collection->findOne(['_id' => $evalId]);
echo "\nSaved to DB:\n";
echo "  student_id field exists: " . (isset($savedEval['student_id']) ? "Yes" : "No") . "\n";
echo "  student_id value: '" . ($savedEval['student_id'] ?? 'NOT SET') . "'\n";
