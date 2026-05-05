<?php
/**
 * PWA Debug Endpoint
 * Check request routing and PWA file status
 */

header('Content-Type: application/json');

// Get the actual root directory (parent of api folder)
$rootDir = dirname(__DIR__);
$pwaDir = $rootDir . '/pwa';

$debug = [
    'timestamp' => date('Y-m-d H:i:s'),
    'server' => [
        'host' => $_SERVER['HTTP_HOST'] ?? 'unknown',
        'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'script' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
        'doc_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    ],
    'directories' => [
        'current' => getcwd(),
        'script_dir' => __DIR__,
        'root_dir' => $rootDir,
        'pwa_dir' => $pwaDir,
    ],
    'pwa_status' => [
        'pwa_dir_exists' => is_dir($pwaDir),
        'pwa_readable' => is_readable($pwaDir),
        'pwa_writable' => is_writable($pwaDir),
    ],
    'pwa_files' => [],
];

// Check pwa files
if (is_dir($pwaDir)) {
    $files = scandir($pwaDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $fullPath = $pwaDir . '/' . $file;
            $debug['pwa_files'][$file] = [
                'is_file' => is_file($fullPath),
                'is_dir' => is_dir($fullPath),
                'size' => is_file($fullPath) ? filesize($fullPath) : null,
                'readable' => is_readable($fullPath),
            ];
        }
    }
}

// Check if servePwaFile function exists
$debug['function_check'] = [
    'servePwaFile_exists' => function_exists('servePwaFile'),
];

// Test path detection
$request = $_GET['test_request'] ?? 'pwa/index.html';
$debug['request_test'] = [
    'test_input' => $request,
    'starts_with_pwa' => strpos($request, 'pwa') === 0,
    'starts_with_pwa_slash' => strpos($request, 'pwa/') === 0,
];

// List root directory contents
$debug['root_dir_contents'] = [];
if (is_dir($rootDir)) {
    $files = scandir($rootDir);
    foreach ($files as $file) {
        if ($file !== '.' && $file !== '..') {
            $fullPath = $rootDir . '/' . $file;
            $debug['root_dir_contents'][$file] = [
                'is_dir' => is_dir($fullPath),
                'is_file' => is_file($fullPath),
                'size' => is_file($fullPath) ? filesize($fullPath) : null,
            ];
        }
    }
}

echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
