#!/usr/bin/env php
<?php
/**
 * Initialize Duplicate Prevention System
 * Creates submission_logs collection and indexes
 * Run once: php scripts/init-duplicate-prevention.php
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/duplicate-prevention.php';

echo "🛡️  Initializing Duplicate Prevention System...\n\n";

try {
    // Create submission_logs collection
    $db = $GLOBALS['db'];
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    echo "1. Creating submission_logs collection...\n";
    try {
        $db->createCollection('submission_logs');
        echo "   ✓ Collection created\n";
    } catch (\MongoDB\Exception\RuntimeException $e) {
        if (strpos($e->getMessage(), 'already exists') !== false) {
            echo "   ✓ Collection already exists\n";
        } else {
            throw $e;
        }
    }
    
    echo "\n2. Creating indexes...\n";
    createSubmissionLogIndexes();
    echo "   ✓ Indexes created\n";
    
    echo "\n✅ Duplicate Prevention System initialized successfully!\n\n";
    
    echo "Summary:\n";
    echo "  • Device fingerprinting enabled\n";
    echo "  • Rate limiting: 10 evaluations per hour per device\n";
    echo "  • IP rate limiting: 30 evaluations per hour per IP\n";
    echo "  • One evaluation per teacher per device (permanent)\n";
    echo "  • Auto-cleanup: pending submissions after 24 hours\n";
    
} catch (\Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
