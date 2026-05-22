<?php
/**
 * Check Evaluated Teachers API
 * GET /api/check-evaluated-teachers
 * Returns list of teachers already evaluated by this device (from database, not localStorage)
 * Ensures accuracy and prevents false positives
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/duplicate-prevention.php';

// Handle CORS preflight requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

setJsonHeader();

try {
    // Try to get submission_logs collection
    // If it doesn't exist, return empty list (no evaluations yet)
    try {
        $submissionLogs = $db->selectCollection('submission_logs');
        
        // Check if collection exists by trying to get info
        $collections = $db->listCollections();
        $collectionNames = array_map(fn($c) => $c->getName(), iterator_to_array($collections));
        $collectionExists = in_array('submission_logs', $collectionNames);
        
        if (!$collectionExists) {
            // Collection doesn't exist yet - no evaluations have been submitted
            sendSuccess([
                'evaluated_teachers' => [],
                'count' => 0,
                'source' => 'database',
                'note' => 'No evaluations recorded yet'
            ], 'No evaluated teachers found', 200);
            exit;
        }
    } catch (\Exception $collectionError) {
        // Collection doesn't exist - no evaluations yet
        sendSuccess([
            'evaluated_teachers' => [],
            'count' => 0,
            'source' => 'database',
            'note' => 'No evaluations recorded yet'
        ], 'No evaluated teachers found', 200);
        exit;
    }
    
    // Check for single teacher check mode
    $teacherId = $_GET['teacher_id'] ?? null;
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    
    if ($teacherId) {
        // Single teacher + IP check (task spec)
        $teacherObjectId = stringToObjectId($teacherId);
        if (!$teacherObjectId) {
            sendError('Invalid teacher_id', 400);
        }
        
        $submissionLogs = $db->selectCollection('submission_logs');
        $collections = $db->listCollections();
        $collectionNames = array_map(fn($c) => $c->getName(), iterator_to_array($collections));
        
        if (!in_array('evaluations', $collectionNames)) {
            sendSuccess(['alreadyEvaluated' => false]);
        }
        
        $evaluations = $db->selectCollection('evaluations');
        $existing = $evaluations->findOne([
            'teacher_id' => $teacherObjectId,
            'ip_address' => $ipAddress
        ]);
        
        sendSuccess([
            'alreadyEvaluated' => (bool)$existing
        ]);
        exit;
    }
    
    // Bulk mode - Check by student_id or device fingerprint
    $studentId = $_GET['student_id'] ?? sanitizeInput($_POST['student_id'] ?? $_SESSION['student_id'] ?? '');
    $deviceId = $_GET['device_id'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    // Prepare query - Check by student_id first (primary), then device fingerprint (fallback)
    $query = [];
    $source = 'unknown';
    
    if (!empty($studentId)) {
      $query = ['student_id' => $studentId];
      $source = 'student_id';
    } else {
      $deviceFingerprint = generateDeviceFingerprint($deviceId, $ipAddress, $userAgent);
      $query = ['device_fingerprint' => $deviceFingerprint];
      $source = 'device_fingerprint';
    }

    // Get evaluations collection to find completed evaluations
    $collections = $db->listCollections();
    $collectionNames = array_map(fn($c) => $c->getName(), iterator_to_array($collections));
    
    $evaluatedTeacherIds = [];
    
    if (in_array('evaluations', $collectionNames)) {
      $evaluations = $db->selectCollection('evaluations');
      
      // Find all completed evaluations by this student/device
      $completedEvaluations = $evaluations->find($query, [
        'projection' => [
          'teacher_id' => 1,
          'submitted_at' => 1
        ]
      ])->toArray();
      
      // Convert to array of teacher IDs
      $evaluatedTeacherIds = array_map(function($eval) {
        return objectIdToString($eval['teacher_id']);
      }, $completedEvaluations);
    }
    
    sendSuccess([
      'evaluated_teachers' => array_map(function($id) { return ['_id' => $id, 'id' => $id]; }, $evaluatedTeacherIds),
      'count' => count($evaluatedTeacherIds),
      'source' => $source,
      'student_id' => !empty($studentId) ? substr($studentId, 0, 3) . '***' : null
    ], 'Evaluated teachers retrieved successfully', 200);
    
} catch (\Exception $e) {
    error_log('Error checking evaluated teachers: ' . $e->getMessage());
    sendError('Error checking evaluated teachers: ' . $e->getMessage(), 500);
}
