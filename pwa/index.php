<?php
/**
 * PWA Router - Serves index.html for all routes
 * Fallback for when .htaccess mod_rewrite is not available
 */

// Get the requested path
$request_uri = $_SERVER['REQUEST_URI'];
$script_name = dirname($_SERVER['SCRIPT_NAME']);

// Parse the requested path
$request_path = parse_url($request_uri, PHP_URL_PATH);

// Remove the script directory from the path
if (strpos($request_path, $script_name) === 0) {
    $request_path = substr($request_path, strlen($script_name));
}

$request_path = trim($request_path, '/');

// Debug info
error_log('[PWA Router] Request URI: ' . $request_uri);
error_log('[PWA Router] Request Path: ' . $request_path);
error_log('[PWA Router] Script Name: ' . $script_name);

// List of actual files/directories that should be served as-is
$static_files = [
    'assets',
    'canvaskit', 
    'icons',
    'favicon.png',
    'manifest.json',
    'flutter.js',
    'flutter_bootstrap.js',
    'flutter_loader_config.js',
    'flutter_service_worker.js',
    'main.dart.js',
    'fix_assets.js',
    'load-app.js',
    'eval-status-check.js',
    'service-worker.js',
    'version.json'
];

// Check if it's a request for an actual static file
$is_static = false;
foreach ($static_files as $file) {
    if (strpos($request_path, $file) === 0) {
        $is_static = true;
        break;
    }
}

// If it's a static file or has an extension, try to serve it directly
if ($is_static || (strpos($request_path, '.') !== false && strpos($request_path, '/') === false)) {
    $file_path = __DIR__ . '/' . $request_path;
    
    // Security: prevent directory traversal
    $real_path = realpath($file_path);
    if ($real_path && strpos($real_path, realpath(__DIR__)) === 0 && file_exists($file_path)) {
        // Serve the file
        $mime_types = [
            'html' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'wasm' => 'application/wasm',
            'bin' => 'application/octet-stream'
        ];
        
        $ext = strtolower(pathinfo($file_path, PATHINFO_EXTENSION));
        $mime_type = $mime_types[$ext] ?? 'application/octet-stream';
        
        header('Content-Type: ' . $mime_type);
        header('Content-Length: ' . filesize($file_path));
        header('Cache-Control: public, max-age=3600');
        readfile($file_path);
        exit;
    }
}

// For all other requests (Flutter routes), serve index.html
$index_file = __DIR__ . '/index.html';

if (file_exists($index_file)) {
    header('Content-Type: text/html');
    header('Cache-Control: no-cache, must-revalidate');
    readfile($index_file);
} else {
    http_response_code(404);
    echo 'index.html not found in PWA directory';
}
