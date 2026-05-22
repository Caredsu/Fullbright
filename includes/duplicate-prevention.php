<?php
/**
 * Duplicate Submission Prevention
 * Prevents spam and multiple evaluations from same device/IP
 */

require_once __DIR__ . '/../config/database.php';

/**
 * Generate device fingerprint
 * Combines multiple factors for unique device identification
 */
function generateDeviceFingerprint($deviceId = null, $ipAddress = null, $userAgent = null) {
    global $db;
    
    $ipAddress = $ipAddress ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $userAgent ?? $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $deviceId = $deviceId ?? $_POST['device_id'] ?? null;
    
    // Create multi-factor fingerprint
    $fingerprint = hash('sha256', implode('|', [
        $ipAddress,
        $userAgent,
        $deviceId
    ]));
    
    return $fingerprint;
}

/**
 * Check if submission is duplicate
 * Returns: ['is_duplicate' => bool, 'reason' => string, 'wait_seconds' => int]
 */
function checkDuplicateSubmission($teacherId, $deviceId = null, $ipAddress = null, $userAgent = null) {
    global $db;
    
    $ipAddress = $ipAddress ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $userAgent ?? $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $deviceId = $deviceId ?? $_POST['device_id'] ?? null;
    $now = new \MongoDB\BSON\UTCDateTime();
    
    try {
        // Get or create submission logs collection
        $submissionLogs = $db->selectCollection('submission_logs');
        
        // Convert teacher ID to ObjectId
        $teacherObjectId = new \MongoDB\BSON\ObjectId($teacherId);
        
        // 1. Check: Has this device already evaluated this teacher? (PERMANENT)
        $permanentDuplicate = $submissionLogs->findOne([
            'teacher_id' => $teacherObjectId,
            'device_fingerprint' => generateDeviceFingerprint($deviceId, $ipAddress, $userAgent),
            'status' => 'completed'
        ]);
        
        if ($permanentDuplicate) {
            return [
                'is_duplicate' => true,
                'reason' => 'duplicate_teacher',
                'message' => 'You have already evaluated this teacher. One evaluation per teacher per device.'
            ];
        }
        
        // 2. Check: Rate limiting - Max 10 evaluations per hour from same device
        $oneHourAgo = new \MongoDB\BSON\UTCDateTime(time() * 1000 - 3600 * 1000);
        $recentSubmissions = $submissionLogs->countDocuments([
            'device_fingerprint' => generateDeviceFingerprint($deviceId, $ipAddress, $userAgent),
            'status' => 'completed',
            'submitted_at' => ['$gte' => $oneHourAgo]
        ]);
        
        if ($recentSubmissions >= 10) {
            return [
                'is_duplicate' => true,
                'reason' => 'rate_limit_exceeded',
                'message' => 'Too many submissions from your device. Please try again later.',
                'wait_seconds' => 3600
            ];
        }
        
        // 3. Check: IP address spam - Max 30 evaluations per hour from same IP
        $ipRecentSubmissions = $submissionLogs->countDocuments([
            'ip_address' => $ipAddress,
            'status' => 'completed',
            'submitted_at' => ['$gte' => $oneHourAgo]
        ]);
        
        if ($ipRecentSubmissions >= 30) {
            return [
                'is_duplicate' => true,
                'reason' => 'ip_rate_limit',
                'message' => 'Too many submissions from your location. Please try again later.',
                'wait_seconds' => 3600
            ];
        }
        
        // 4. Check: In-progress submissions from same device (wait for completion)
        $inProgressSubmission = $submissionLogs->findOne([
            'teacher_id' => $teacherObjectId,
            'device_fingerprint' => generateDeviceFingerprint($deviceId, $ipAddress, $userAgent),
            'status' => 'pending'
        ]);
        
        if ($inProgressSubmission) {
            // Check if it's been pending for more than 5 minutes
            $submittedTime = $inProgressSubmission['submitted_at']->toDateTime()->getTimestamp();
            $nowTime = time();
            $elapsed = $nowTime - $submittedTime;
            
            if ($elapsed < 300) { // 5 minutes
                return [
                    'is_duplicate' => true,
                    'reason' => 'already_submitting',
                    'message' => 'You have a submission in progress. Please wait for it to complete.',
                    'wait_seconds' => max(0, 300 - $elapsed)
                ];
            }
        }
        
        return [
            'is_duplicate' => false,
            'reason' => 'allowed',
            'message' => 'OK'
        ];
        
    } catch (\Exception $e) {
        // Log error but don't block submission
        error_log("Duplicate check error: " . $e->getMessage());
        return [
            'is_duplicate' => false,
            'reason' => 'check_error',
            'message' => 'OK'
        ];
    }
}

/**
 * Log a submission attempt
 */
function logSubmissionAttempt($teacherId, $status = 'pending', $deviceId = null, $ipAddress = null, $userAgent = null) {
    global $db;
    
    $ipAddress = $ipAddress ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $userAgent ?? $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $deviceId = $deviceId ?? $_POST['device_id'] ?? null;
    
    try {
        $submissionLogs = $db->selectCollection('submission_logs');
        $teacherObjectId = new \MongoDB\BSON\ObjectId($teacherId);
        
        $log = [
            'teacher_id' => $teacherObjectId,
            'device_fingerprint' => generateDeviceFingerprint($deviceId, $ipAddress, $userAgent),
            'device_id' => $deviceId,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'status' => $status,
            'submitted_at' => new \MongoDB\BSON\UTCDateTime(),
            'updated_at' => new \MongoDB\BSON\UTCDateTime()
        ];
        
        $result = $submissionLogs->insertOne($log);
        return $result->getInsertedId();
        
    } catch (\Exception $e) {
        error_log("Submission log error: " . $e->getMessage());
        return null;
    }
}

/**
 * Update submission log status
 */
function updateSubmissionLogStatus($logId, $status) {
    global $db;
    
    try {
        $submissionLogs = $db->selectCollection('submission_logs');
        $submissionLogs->updateOne(
            ['_id' => $logId],
            ['$set' => ['status' => $status, 'updated_at' => new \MongoDB\BSON\UTCDateTime()]]
        );
    } catch (\Exception $e) {
        error_log("Update submission log error: " . $e->getMessage());
    }
}

/**
 * Create indexes for submission_logs (call once on setup)
 */
function createSubmissionLogIndexes() {
    global $db;
    
    try {
        $submissionLogs = $db->selectCollection('submission_logs');
        
        // Index for duplicate checks
        $submissionLogs->createIndex([
            'teacher_id' => 1,
            'device_fingerprint' => 1,
            'status' => 1
        ]);
        
        // Index for rate limiting
        $submissionLogs->createIndex([
            'ip_address' => 1,
            'status' => 1,
            'submitted_at' => 1
        ]);
        
        // TTL index: auto-delete pending submissions after 24 hours
        $submissionLogs->createIndex(
            ['submitted_at' => 1],
            ['expireAfterSeconds' => 86400, 'partialFilterExpression' => ['status' => 'pending']]
        );
        
    } catch (\Exception $e) {
        error_log("Create indexes error: " . $e->getMessage());
    }
}

/**
 * Clear/Override evaluation for a student-teacher pair (ADMIN ONLY)
 * Allows student to re-evaluate a teacher in new academic year/period
 */
function clearStudentTeacherEvaluation($submissionLogId) {
    global $db;
    
    try {
        $submissionLogs = $db->selectCollection('submission_logs');
        
        // Delete the submission log record
        $result = $submissionLogs->deleteOne([
            '_id' => new \MongoDB\BSON\ObjectId($submissionLogId)
        ]);
        
        return [
            'success' => true,
            'message' => 'Evaluation record cleared successfully',
            'deleted_count' => $result->getDeletedCount()
        ];
        
    } catch (\Exception $e) {
        error_log("Clear evaluation error: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Error clearing evaluation: ' . $e->getMessage()
        ];
    }
}

/**
 * Get evaluation records for admin management
 * Returns submission logs with teacher info
 */
function getEvaluationRecordsForManagement($filters = []) {
    global $db;
    
    try {
        $submissionLogs = $db->selectCollection('submission_logs');
        $teachers_collection = $db->selectCollection('teachers');
        
        // Build query
        $query = [];
        
        if (!empty($filters['teacher_id'])) {
            $query['teacher_id'] = new \MongoDB\BSON\ObjectId($filters['teacher_id']);
        }
        
        if (!empty($filters['device_fingerprint'])) {
            $query['device_fingerprint'] = $filters['device_fingerprint'];
        }
        
        if (!empty($filters['status'])) {
            $query['status'] = $filters['status'];
        }
        
        if (!empty($filters['days'])) {
            $daysAgo = new \MongoDB\BSON\UTCDateTime((time() - $filters['days'] * 86400) * 1000);
            $query['submitted_at'] = ['$gte' => $daysAgo];
        }
        
        // Get records
        $records = $submissionLogs->find($query, [
            'sort' => ['submitted_at' => -1],
            'limit' => 200
        ])->toArray();
        
        // Enrich with teacher info
        foreach ($records as &$record) {
            $teacher = $teachers_collection->findOne(['_id' => $record['teacher_id']]);
            $record['teacher_name'] = $teacher['full_name'] ?? 'Unknown';
            $record['teacher_code'] = $teacher['teacher_code'] ?? 'N/A';
        }
        
        return $records;
        
    } catch (\Exception $e) {
        error_log("Get evaluation records error: " . $e->getMessage());
        return [];
    }
}

?>
