<?php
/**
 * Teacher Image Upload Endpoint
 * POST /api/upload-teacher-image.php
 * Handles file-based image uploads to avoid database bloat
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

initializeSession();
setJsonHeader();

// CORS Headers
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('Method not allowed', 405);
}

try {
    // Check if file was uploaded
    if (empty($_FILES['image'])) {
        sendError('No image file provided', 400);
    }

    $file = $_FILES['image'];
    
    // Validate file
    $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!in_array($file['type'], $allowedMimes)) {
        sendError('Invalid file type. Allowed: JPG, PNG, WebP, GIF', 400);
    }

    // Check file size (5MB max)
    $maxSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        sendError('File too large. Max 5MB allowed', 400);
    }

    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        sendError('Upload error: ' . $file['error'], 400);
    }

    // Create upload directory if not exists
    $uploadDir = __DIR__ . '/../public/uploads/teachers';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            sendError('Failed to create upload directory', 500);
        }
    }

    // Generate unique filename with timestamp
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $filename = 'teacher_' . time() . '_' . rand(1000, 9999) . '.' . $fileExtension;
    $filepath = $uploadDir . '/' . $filename;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        sendError('Failed to save image file', 500);
    }

    // Optimize image size (optional but recommended)
    try {
        compressImage($filepath);
    } catch (Exception $e) {
        error_log('Image compression warning: ' . $e->getMessage());
        // Continue anyway - compression is optional
    }

    // Return relative path for storage in database
    $relativePath = '/teacher-eval/public/uploads/teachers/' . $filename;

    sendJson([
        'success' => true,
        'message' => 'Image uploaded successfully',
        'data' => [
            'path' => $relativePath,
            'filename' => $filename,
            'size' => filesize($filepath)
        ]
    ]);

} catch (Exception $e) {
    error_log('Image upload error: ' . $e->getMessage());
    sendError('Upload failed: ' . $e->getMessage(), 500);
}

/**
 * Compress image to reduce file size
 * Uses built-in PHP GD library
 */
function compressImage($filepath, $quality = 85) {
    if (!extension_loaded('gd')) {
        throw new Exception('GD library not available');
    }

    $mime = mime_content_type($filepath);
    
    switch ($mime) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($filepath);
            break;
        case 'image/png':
            $image = imagecreatefrompng($filepath);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($filepath);
            break;
        case 'image/gif':
            $image = imagecreatefromgif($filepath);
            break;
        default:
            return;
    }

    if (!$image) {
        throw new Exception('Failed to load image');
    }

    // Save compressed version back
    switch ($mime) {
        case 'image/jpeg':
            imagejpeg($image, $filepath, $quality);
            break;
        case 'image/png':
            imagepng($image, $filepath, 6);
            break;
        case 'image/webp':
            imagewebp($image, $filepath, $quality);
            break;
        case 'image/gif':
            imagegif($image, $filepath);
            break;
    }

    imagedestroy($image);
}
