<?php
/**
 * Evaluations API Endpoint
 * POST /api/evaluations - Submit new evaluation (anonymous/student)
 * GET /api/evaluations/:teacher_id - Get evaluations for a teacher (requires admin/staff)
 */

// Make global request path available (set by index.php router)
global $ORIGINAL_REQUEST_PATH;

// Handle CORS preflight requests FIRST
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/duplicate-prevention.php';

setJsonHeader();

$method = getRequestMethod();

try {
    if ($method === 'POST') {
        // Submit new evaluation - anonymous/student (no authentication required)
        
        // Check if evaluations are enabled
        $evalSettings = $settings_collection->findOne(['_id' => 'evaluation_settings']);
        $evaluationStatus = $evalSettings['status'] ?? 'on';
        
        if ($evaluationStatus !== 'on') {
            sendError('Evaluations are currently closed. Please try again later.', 403);
        }
        
        $body = getJsonBody();
        if (!$body) {
            sendError('Invalid JSON body', 400);
        }

        // Validate required fields - accept either 'ratings' or 'answers'
        $hasRatings = isset($body['ratings']);
        $hasAnswers = isset($body['answers']);
        
        if (!($hasRatings || $hasAnswers)) {
            sendError('Field \'ratings\' or \'answers\' is required', 400);
        }

        $teacherId = $body['teacher_id'] ?? null;
        $studentId = sanitizeInput($body['student_id'] ?? '');
        $feedback = sanitizeInput($body['feedback'] ?? '');

        // DEBUG: Log what we received
        error_log('=== EVALUATION API DEBUG ===');
        error_log('Body keys: ' . implode(', ', array_keys($body)));
        error_log('student_id value: ' . var_export($studentId, true));
        error_log('student_id from body: ' . var_export($body['student_id'] ?? 'NOT SET', true));
        error_log('teacher_id value: ' . var_export($teacherId, true));

        // Validate teacher_id - MUST be provided
        if (!$teacherId) {
            sendError('Teacher ID is required', 400);
        }

        // Validate teacher_id
        $teacherObjectId = stringToObjectId($teacherId);
        if (!$teacherObjectId) {
            sendError('Invalid teacher ID format', 400);
        }

        // Check if teacher exists
        $teacher = $teachers_collection->findOne(['_id' => $teacherObjectId]);
        if (!$teacher) {
            sendError('Teacher not found', 404);
        }

        // Process answers/ratings based on format
        $answers = [];
        
        if ($hasAnswers) {
            // New dynamic format: answers = { question_id => rating }
            $answersData = $body['answers'];
            if (!is_array($answersData) || empty($answersData)) {
                sendError('Answers must be a non-empty object/array', 400);
            }
            
            // Validate each answer
            foreach ($answersData as $questionId => $rating) {
                if (!is_string($questionId) || empty($questionId)) {
                    sendError('Question IDs must be valid strings', 400);
                }
                if (!isValidRating($rating)) {
                    sendError("Rating for question $questionId must be between 1 and 5", 400);
                }
                $answers[] = [
                    'question_id' => $questionId,
                    'rating' => (int)$rating
                ];
            }
        } else {
            // Old format: ratings = { teaching, communication, knowledge }
            $ratings = $body['ratings'];
            if (!is_array($ratings)) {
                sendError('Ratings must be an object/array', 400);
            }

            // Validate each rating
            $validRatings = ['teaching', 'communication', 'knowledge'];
            foreach ($validRatings as $ratingType) {
                if (!isset($ratings[$ratingType])) {
                    sendError("Missing rating for: $ratingType", 400);
                }
                if (!isValidRating($ratings[$ratingType])) {
                    sendError("$ratingType rating must be between 1 and 5", 400);
                }
                $answers[] = [
                    'question_id' => $ratingType,
                    'rating' => (int)$ratings[$ratingType]
                ];
            }
        }

        // Validate feedback length (optional, but if provided must be valid)
        if (!empty($feedback)) {
            if (strlen($feedback) < 10) {
                sendError('Feedback must be at least 10 characters long', 400);
            }
            if (strlen($feedback) > 1000) {
                sendError('Feedback must not exceed 1000 characters', 400);
            }
        }

        // Get session identifier (IP address + device ID for better tracking)
        $ipAddress = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $deviceId = $body['device_id'] ?? null; // Sent from frontend
        
        // Check for duplicate submission
        $dupCheck = checkDuplicateSubmission($teacherId, $deviceId, $ipAddress, $userAgent);
        if ($dupCheck['is_duplicate']) {
            sendError($dupCheck['message'], 400);
        }
        
        // Log submission attempt (creates tracking record)
        $logId = logSubmissionAttempt($teacherId, 'pending', $deviceId, $ipAddress, $userAgent);
        
        // OLD CODE - kept for backward compatibility reference:
        // Check for any previous evaluation from same device for this teacher (permanent block)
        // $existingEvaluation = $evaluations_collection->findOne([
        //     'teacher_id' => $teacherObjectId,
        //     'ip_address' => $ipAddress,
        //     'user_agent' => $userAgent
        // ]);
        //
        // if ($existingEvaluation) {
        //     sendError('You have already submitted an evaluation for this teacher from your device. Each teacher can only be evaluated once per device.', 400);
        // }

        // Use Evaluation model to save with semester/year tracking
        require_once __DIR__ . '/../app/Models/Evaluation.php';
        $evaluationModel = new \App\Models\Evaluation($evaluations_collection);
        
        $evaluationId = $evaluationModel->create([
            'teacher_id' => $teacherObjectId,
            'answers' => $answers,
            'feedback' => $feedback,
            'student_id' => $studentId,  // Add student number/ID
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'device_id' => $deviceId,
            'device_fingerprint' => generateDeviceFingerprint($deviceId, $ipAddress, $userAgent),
            'session_identifier' => $ipAddress  // For quick lookups
        ]);
        
        // Update submission log to completed
        if ($logId) {
            updateSubmissionLogStatus($logId, 'completed');
        }

        sendSuccess([
            'id' => objectIdToString($evaluationId),
            'teacher_id' => $teacherId,
            'submitted_at' => date('Y-m-d H:i:s')
        ], 'Evaluation submitted successfully', 201);

    } elseif ($method === 'GET') {
        // Check if asking for evaluation status (no auth required)
        $teacherId = getIdFromPath();
        if ($teacherId === 'status') {
            $evalSettings = $settings_collection->findOne(['_id' => 'evaluation_settings']);
            $evaluationStatus = $evalSettings['status'] ?? 'on';
            
            sendSuccess([
                'status' => $evaluationStatus,
                'is_open' => $evaluationStatus === 'on'
            ], 'Evaluation status retrieved', 200);
        }
        
        // Get evaluations for a specific teacher - requires auth (admin/staff)
        $user = requireAuth(['superadmin', 'staff']);

        $teacherId = getIdFromPath();
        if (!$teacherId) {
            sendError('Teacher ID not provided', 400);
        }

        $teacherObjectId = stringToObjectId($teacherId);
        if (!$teacherObjectId) {
            sendError('Invalid teacher ID format', 400);
        }

        // Check if teacher exists
        $teacher = $teachers_collection->findOne(['_id' => $teacherObjectId]);
        if (!$teacher) {
            sendError('Teacher not found', 404);
        }

        // Get all evaluations for this teacher
        $evaluations = $evaluations_collection->find(['teacher_id' => $teacherObjectId])->toArray();

        // Calculate statistics (handle both old and new formats)
        $stats = [
            'total' => count($evaluations),
            'average_teaching' => 0,
            'average_communication' => 0,
            'average_knowledge' => 0
        ];

        if (count($evaluations) > 0) {
            $teachingSum = 0;
            $communicationSum = 0;
            $knowledgeSum = 0;
            $teachingCount = 0;
            $communicationCount = 0;
            $knowledgeCount = 0;

            foreach ($evaluations as $eval) {
                // Handle new format (answers array)
                if (isset($eval['answers']) && is_array($eval['answers'])) {
                    foreach ($eval['answers'] as $answer) {
                        $qId = $answer['question_id'] ?? '';
                        $rating = $answer['rating'] ?? 0;
                        
                        if ($qId === 'teaching') {
                            $teachingSum += $rating;
                            $teachingCount++;
                        } elseif ($qId === 'communication') {
                            $communicationSum += $rating;
                            $communicationCount++;
                        } elseif ($qId === 'knowledge') {
                            $knowledgeSum += $rating;
                            $knowledgeCount++;
                        }
                    }
                } 
                // Handle old format (ratings object)
                elseif (isset($eval['ratings']) && is_array($eval['ratings'])) {
                    if (isset($eval['ratings']['teaching'])) {
                        $teachingSum += $eval['ratings']['teaching'];
                        $teachingCount++;
                    }
                    if (isset($eval['ratings']['communication'])) {
                        $communicationSum += $eval['ratings']['communication'];
                        $communicationCount++;
                    }
                    if (isset($eval['ratings']['knowledge'])) {
                        $knowledgeSum += $eval['ratings']['knowledge'];
                        $knowledgeCount++;
                    }
                }
            }

            $stats['average_teaching'] = $teachingCount > 0 ? round($teachingSum / $teachingCount, 2) : 0;
            $stats['average_communication'] = $communicationCount > 0 ? round($communicationSum / $communicationCount, 2) : 0;
            $stats['average_knowledge'] = $knowledgeCount > 0 ? round($knowledgeSum / $knowledgeCount, 2) : 0;
        }

        // Format evaluations (removed session_identifier for security)
        $formattedEvaluations = array_map(function($eval) {
            $data = [
                'id' => objectIdToString($eval['_id']),
                'teacher_id' => objectIdToString($eval['teacher_id']),
                'feedback' => $eval['feedback'],
                'submitted_at' => date('Y-m-d H:i:s', $eval['submitted_at']->toDateTime()->getTimestamp())
            ];
            
            // Include either answers or ratings based on what's stored
            if (isset($eval['answers'])) {
                $data['answers'] = $eval['answers'];
            }
            if (isset($eval['ratings'])) {
                $data['ratings'] = $eval['ratings'];
            }
            
            return $data;
        }, $evaluations);

        sendSuccess([
            'teacher' => [
                'id' => objectIdToString($teacher['_id']),
                'firstname' => $teacher['firstname'],
                'lastname' => $teacher['lastname'],
                'middlename' => $teacher['middlename'] ?? '',
                'department' => $teacher['department']
            ],
            'statistics' => $stats,
            'evaluations' => $formattedEvaluations
        ], 'Evaluations retrieved successfully', 200);

    } else {
        sendError('Method not allowed', 405);
    }

} catch (\Exception $e) {
    sendError('Database error: ' . $e->getMessage(), 500);
}
