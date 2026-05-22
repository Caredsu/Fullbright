<?php
/**
 * Questions API Endpoint
 * GET /api/questions - Get all active questions (public)
 * GET /api/questions?id=:id - Get specific question
 * POST /api/questions - Add new question (requires manage_questions)
 * PUT /api/questions?id=:id - Edit question (requires manage_questions)
 * DELETE /api/questions?id=:id - Delete question (requires manage_questions)
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';
require_once __DIR__ . '/../includes/cors-headers.php';

// Initialize session AFTER loading helpers.php with proper configuration
initializeSession();

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

setJsonHeader();

$method = getRequestMethod();

try {
    if ($method === 'GET') {
        // Check if requesting a specific question by ID
        $id = $_GET['id'] ?? '';
        
        if ($id) {
            // Get specific question by ID
            $objectId = stringToObjectId($id);
            if (!$objectId) {
                sendError('Invalid question ID format', 400);
            }
            
            try {
                $question = $questions_collection->findOne(['_id' => $objectId]);
                if (!$question) {
                    sendError('Question not found', 404);
                }
                
                // Default rating scale if not defined
                $defaultRatingScale = [
                    1 => 'Does not meet expectations',
                    2 => 'Below average / Needs improvement',
                    3 => 'Meets expectations / Average',
                    4 => 'Exceeds expectations / Good',
                    5 => 'Outstanding / Excellent'
                ];
                
                $ratingScale = $question['rating_scale'] ?? $defaultRatingScale;
                
                // Ensure rating scale keys are strings for consistent access in React
                $ratingScaleWithStringKeys = [];
                foreach ($ratingScale as $key => $value) {
                    $ratingScaleWithStringKeys[(string)$key] = $value;
                }
                
                sendSuccess([
                    'id' => objectIdToString($question['_id']),
                    'question_text' => $question['question_text'] ?? '',
                    'question_order' => $question['question_order'] ?? $question['display_order'] ?? 0,
                    'required' => $question['required'] ?? 0,
                    'status' => $question['status'] ?? 'active',
                    'rating_scale' => $ratingScaleWithStringKeys,
                    'created_at' => isset($question['created_at']) ? $question['created_at']->toDateTime()->format('Y-m-d H:i:s') : '',
                    'updated_at' => isset($question['updated_at']) ? $question['updated_at']->toDateTime()->format('Y-m-d H:i:s') : '',
                    'updated_by' => $question['updated_by'] ?? 'system'
                ], 'Question retrieved successfully', 200);
            } catch (\Exception $e) {
                sendError('Error retrieving question: ' . $e->getMessage(), 500);
            }
        }
        
        // Get all questions - PUBLIC ACCESS (only active questions)
        try {
            $questions = $questions_collection->find(
                ['status' => 'active'],
                ['sort' => ['question_order' => 1, 'created_at' => -1]]
            )->toArray();

            $formattedQuestions = array_map(function($question) {
                // Default rating scale if not defined
                $defaultRatingScale = [
                    1 => 'Does not meet expectations',
                    2 => 'Below average / Needs improvement',
                    3 => 'Meets expectations / Average',
                    4 => 'Exceeds expectations / Good',
                    5 => 'Outstanding / Excellent'
                ];
                
                $ratingScale = $question['rating_scale'] ?? $defaultRatingScale;
                
                // Ensure rating scale keys are strings for consistent access in React
                $ratingScaleWithStringKeys = [];
                foreach ($ratingScale as $key => $value) {
                    $ratingScaleWithStringKeys[(string)$key] = $value;
                }
                
                return [
                    'id' => objectIdToString($question['_id']),
                    'question_text' => $question['question_text'] ?? '',
                    'question_order' => $question['question_order'] ?? $question['display_order'] ?? 0,
                    'required' => $question['required'] ?? 0,
                    'status' => $question['status'] ?? 'active',
                    'rating_scale' => $ratingScaleWithStringKeys,
                    'created_at' => isset($question['created_at']) ? $question['created_at']->toDateTime()->format('Y-m-d H:i:s') : '',
                    'updated_at' => isset($question['updated_at']) ? $question['updated_at']->toDateTime()->format('Y-m-d H:i:s') : '',
                    'updated_by' => $question['updated_by'] ?? 'system'
                ];
            }, $questions);

            sendSuccess($formattedQuestions, 'Questions retrieved successfully', 200);
        } catch (\Exception $e) {
            sendError('Error retrieving questions: ' . $e->getMessage(), 500);
        }

    } elseif ($method === 'POST') {
        // Add new question - requires manage_questions permission
        // Check authentication first - return JSON error instead of HTML redirect
        if (empty($_SESSION['admin_id'])) {
            sendError('Unauthorized: Please log in', 401);
        }
        
        // Check permission - return JSON error instead of plain text
        $role = $_SESSION['admin_role'] ?? null;
        if (!in_array($role, ['admin', 'superadmin', 'staff', 'super_admin'])) {
            sendError('Forbidden: You do not have permission to manage questions', 403);
        }

        $body = getJsonBody();
        if (!$body) {
            sendError('Invalid JSON body', 400);
        }

        // Validate required fields
        $validation = validateRequiredFields($body, ['question_text']);
        if (!$validation['valid']) {
            sendError($validation['message'], 400);
        }

        $questionText = sanitizeInput($body['question_text']);
        $status = sanitizeInput($body['status'] ?? 'active');
        $required = isset($body['required']) ? (int)$body['required'] : 0;
        
        // Handle rating scale (optional)
        $ratingScale = [];
        if (isset($body['rating_scale']) && is_array($body['rating_scale'])) {
            $ratingScale = $body['rating_scale'];
        }

        // Get next question order
        $lastQuestion = $questions_collection->findOne([], ['sort' => ['question_order' => -1]]);
        $nextOrder = ($lastQuestion['question_order'] ?? 0) + 1;

        // Insert new question
        $now = new MongoDB\BSON\UTCDateTime(time() * 1000);
        $insertData = [
            'question_text' => $questionText,
            'question_order' => $nextOrder,
            'required' => $required,
            'status' => $status,
            'created_at' => $now,
            'updated_at' => $now,
            'updated_by' => $_SESSION['admin_username'] ?? $_SESSION['admin_id'] ?? 'system'
        ];
        
        // Add rating scale if provided
        if (!empty($ratingScale)) {
            $insertData['rating_scale'] = $ratingScale;
        }
        
        $result = $questions_collection->insertOne($insertData);

        sendSuccess([
            'id' => objectIdToString($result->getInsertedId()),
            'question_text' => $questionText,
            'question_order' => $nextOrder,
            'required' => $required,
            'status' => $status,
            'rating_scale' => !empty($ratingScale) ? $ratingScale : []
        ], 'Question added successfully', 201);

    } elseif ($method === 'PUT') {
        // Edit question - requires manage_questions permission
        // Check authentication first - return JSON error instead of HTML redirect
        if (empty($_SESSION['admin_id'])) {
            sendError('Unauthorized: Please log in', 401);
        }
        
        // Check permission - return JSON error instead of plain text
        $role = $_SESSION['admin_role'] ?? null;
        if (!in_array($role, ['admin', 'superadmin', 'staff', 'super_admin'])) {
            sendError('Forbidden: You do not have permission to manage questions', 403);
        }

        $id = $_GET['id'] ?? '';
        if (!$id) {
            sendError('Question ID not provided', 400);
        }

        $objectId = stringToObjectId($id);
        if (!$objectId) {
            sendError('Invalid question ID', 400);
        }

        $body = getJsonBody();
        if (!$body) {
            sendError('Invalid JSON body', 400);
        }

        // Check if question exists
        $question = $questions_collection->findOne(['_id' => $objectId]);
        if (!$question) {
            sendError('Question not found', 404);
        }

        // Prepare update data
        $updateData = [];
        if (isset($body['question_text'])) {
            $updateData['question_text'] = sanitizeInput($body['question_text']);
        }
        
        if (isset($body['status'])) {
            $updateData['status'] = sanitizeInput($body['status']);
        }
        
        if (isset($body['required'])) {
            $updateData['required'] = (int)$body['required'];
        }
        
        // Handle rating scale (optional)
        if (isset($body['rating_scale'])) {
            if (is_array($body['rating_scale']) && !empty($body['rating_scale'])) {
                $updateData['rating_scale'] = $body['rating_scale'];
            } else {
                // If empty rating_scale is sent, remove it from the document
                $updateData['rating_scale'] = null;
            }
        }

        if (empty($updateData)) {
            sendError('No fields to update', 400);
        }

        $updateData['updated_at'] = new MongoDB\BSON\UTCDateTime(time() * 1000);
        $updateData['updated_by'] = $_SESSION['admin_username'] ?? $_SESSION['admin_id'] ?? 'system';

        // Update question
        $questions_collection->updateOne(
            ['_id' => $objectId],
            ['$set' => $updateData]
        );

        $updatedQuestion = $questions_collection->findOne(['_id' => $objectId]);
        
        // Return with rating scale in response
        $defaultRatingScale = [
            1 => 'Does not meet expectations',
            2 => 'Below average / Needs improvement',
            3 => 'Meets expectations / Average',
            4 => 'Exceeds expectations / Good',
            5 => 'Outstanding / Excellent'
        ];
        
        $ratingScale = $updatedQuestion['rating_scale'] ?? $defaultRatingScale;

        sendSuccess([
            'id' => objectIdToString($updatedQuestion['_id']),
            'question_text' => $updatedQuestion['question_text'] ?? '',
            'question_order' => $updatedQuestion['question_order'] ?? 0,
            'required' => $updatedQuestion['required'] ?? 0,
            'status' => $updatedQuestion['status'] ?? 'active',
            'rating_scale' => $ratingScale
        ], 'Question updated successfully', 200);

    } elseif ($method === 'DELETE') {
        // Delete question - requires manage_questions permission
        // Check authentication first - return JSON error instead of HTML redirect
        if (empty($_SESSION['admin_id'])) {
            sendError('Unauthorized: Please log in', 401);
        }
        
        // Check permission - return JSON error instead of plain text
        $role = $_SESSION['admin_role'] ?? null;
        if (!in_array($role, ['admin', 'superadmin', 'staff', 'super_admin'])) {
            sendError('Forbidden: You do not have permission to manage questions', 403);
        }

        $id = $_GET['id'] ?? '';
        if (!$id) {
            sendError('Question ID not provided', 400);
        }

        $objectId = stringToObjectId($id);
        if (!$objectId) {
            sendError('Invalid question ID', 400);
        }

        // Check if question exists
        $question = $questions_collection->findOne(['_id' => $objectId]);
        if (!$question) {
            sendError('Question not found', 404);
        }

        // Delete question
        $questions_collection->deleteOne(['_id' => $objectId]);

        sendSuccess(null, 'Question deleted successfully', 200);

    } else {
        sendError('Method not allowed', 405);
    }

} catch (\Exception $e) {
    sendError('Error: ' . $e->getMessage(), 500);
}
