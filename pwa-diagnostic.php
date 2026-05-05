<?php
/**
 * PWA Diagnostic Script
 * Check if PWA files are properly deployed and accessible
 */

// Check if pwa directory exists
$pwaDir = __DIR__ . '/pwa';
$isDir = is_dir($pwaDir);
$isDirReadable = is_readable($pwaDir);

// Check key PWA files
$files = [
    'pwa/index.html',
    'pwa/flutter.js',
    'pwa/main.dart.js',
    'pwa/service-worker.js',
    'pwa/manifest.json',
    'pwa/fix_assets.js'
];

$fileStatus = [];
foreach ($files as $file) {
    $fullPath = __DIR__ . '/' . $file;
    $exists = file_exists($fullPath);
    $readable = is_readable($fullPath);
    $size = $exists ? filesize($fullPath) : 0;
    
    $fileStatus[$file] = [
        'exists' => $exists,
        'readable' => $readable,
        'size' => $size,
        'path' => $fullPath
    ];
}

// Check assets folder
$assetsDir = $pwaDir . '/assets';
$assetsExists = is_dir($assetsDir);
$assetsReadable = is_readable($assetsDir);

// Prepare response
$diagnostics = [
    'timestamp' => date('Y-m-d H:i:s'),
    'server' => $_SERVER['HTTP_HOST'] ?? 'unknown',
    'request_path' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'pwa_directory' => [
        'path' => $pwaDir,
        'exists' => $isDir,
        'readable' => $isDirReadable,
        'permissions' => is_dir($pwaDir) ? substr(sprintf('%o', fileperms($pwaDir)), -4) : 'N/A'
    ],
    'assets_directory' => [
        'exists' => $assetsExists,
        'readable' => $assetsReadable,
        'path' => $assetsDir
    ],
    'files' => $fileStatus,
    'php_info' => [
        'version' => phpversion(),
        'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
        'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown'
    ]
];

header('Content-Type: application/json');
echo json_encode($diagnostics, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
