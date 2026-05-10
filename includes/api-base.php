<?php
/**
 * Base API Handler Class
 * Provides common functionality for all API endpoints
 */

class ApiHandler {
    protected $db;
    protected $method;
    protected $body;
    protected $collection;
    
    public function __construct($collectionName) {
        $this->db = Database::getInstance();
        $this->collection = $this->db->getCollection($collectionName);
        $this->method = $_SERVER['REQUEST_METHOD'];
        
        // Set JSON header
        setJsonHeader();
        
        // Handle CORS
        $this->handleCors();
        
        // Parse request body
        $this->parseBody();
    }
    
    /**
     * Handle CORS preflight requests
     */
    protected function handleCors() {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 86400');
        
        if ($this->method === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
    
    /**
     * Parse request body (JSON or form data)
     */
    protected function parseBody() {
        if (in_array($this->method, ['POST', 'PUT', 'PATCH'])) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'application/json') !== false) {
                $this->body = json_decode(file_get_contents('php://input'), true);
            } else {
                $this->body = $_POST;
            }
        }
    }
    
    /**
     * Verify CSRF token for write operations
     */
    protected function verifyCsrfToken() {
        $token = $this->body['csrf_token'] ?? $_POST['csrf_token'] ?? '';
        
        if (!verifyCSRFToken($token)) {
            $this->sendError(ERROR_CSRF_TOKEN, HTTP_FORBIDDEN);
        }
    }
    
    /**
     * Validate required fields
     */
    protected function validateRequired($fields) {
        foreach ($fields as $field) {
            if (empty($this->body[$field])) {
                $this->sendError("Field '$field' is required", HTTP_BAD_REQUEST);
            }
        }
    }
    
    /**
     * Validate field value is in allowed list
     */
    protected function validateAllowed($field, $allowed) {
        if (isset($this->body[$field]) && !in_array($this->body[$field], $allowed)) {
            $this->sendError("Invalid value for field '$field'", HTTP_BAD_REQUEST);
        }
    }
    
    /**
     * Validate field length
     */
    protected function validateLength($field, $min = null, $max = null) {
        if (!isset($this->body[$field])) {
            return;
        }
        
        $length = strlen((string)$this->body[$field]);
        
        if ($min && $length < $min) {
            $this->sendError("Field '$field' must be at least $min characters", HTTP_BAD_REQUEST);
        }
        
        if ($max && $length > $max) {
            $this->sendError("Field '$field' must not exceed $max characters", HTTP_BAD_REQUEST);
        }
    }
    
    /**
     * Validate email format
     */
    protected function validateEmail($field) {
        if (isset($this->body[$field]) && !isValidEmail($this->body[$field])) {
            $this->sendError("Invalid email format for field '$field'", HTTP_BAD_REQUEST);
        }
    }
    
    /**
     * Check if record exists
     */
    protected function recordExists($query) {
        return $this->collection->findOne($query) !== null;
    }
    
    /**
     * Get single record
     */
    protected function getRecord($id) {
        try {
            $objectId = new \MongoDB\BSON\ObjectId($id);
        } catch (\Exception $e) {
            $this->sendError(ERROR_NOT_FOUND, HTTP_NOT_FOUND);
        }
        
        $record = $this->collection->findOne(['_id' => $objectId]);
        
        if (!$record) {
            $this->sendError(ERROR_NOT_FOUND, HTTP_NOT_FOUND);
        }
        
        return $record;
    }
    
    /**
     * Format ObjectId to string in arrays
     */
    protected function formatRecords($records) {
        return array_map(function($record) {
            if (isset($record['_id'])) {
                $record['_id'] = objectIdToString($record['_id']);
            }
            return $record;
        }, $records);
    }
    
    /**
     * Send success response
     */
    protected function sendSuccess($data = [], $message = SUCCESS_CREATED, $statusCode = HTTP_OK) {
        jsonResponse(true, $message, $data);
        http_response_code($statusCode);
        exit;
    }
    
    /**
     * Send error response
     */
    protected function sendError($message = ERROR_DATABASE, $statusCode = HTTP_INTERNAL_ERROR) {
        jsonResponse(false, $message, []);
        http_response_code($statusCode);
        exit;
    }
    
    /**
     * Log activity
     */
    protected function logActivity($action, $description) {
        try {
            logActivity($action, $description);
        } catch (\Exception $e) {
            // Don't fail the request if logging fails
            error_log("Activity logging failed: " . $e->getMessage());
        }
    }
    
    /**
     * Get main handler method
     */
    public function handle() {
        try {
            switch ($this->method) {
                case 'GET':
                    return $this->handleGet();
                case 'POST':
                    return $this->handlePost();
                case 'PUT':
                    return $this->handlePut();
                case 'DELETE':
                    return $this->handleDelete();
                default:
                    $this->sendError('Method not allowed', 405);
            }
        } catch (\Exception $e) {
            logActivity(ACTION_ERROR, "API Exception: " . $e->getMessage());
            $this->sendError(ERROR_DATABASE, HTTP_INTERNAL_ERROR);
        }
    }
    
    /**
     * Override these methods in child classes
     */
    protected function handleGet() {
        $this->sendError('Method not implemented', 405);
    }
    
    protected function handlePost() {
        $this->sendError('Method not implemented', 405);
    }
    
    protected function handlePut() {
        $this->sendError('Method not implemented', 405);
    }
    
    protected function handleDelete() {
        $this->sendError('Method not implemented', 405);
    }
}
