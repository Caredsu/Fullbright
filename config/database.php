<?php
/**
 * MongoDB Database Configuration & Initialization
 * Singleton pattern - only ONE connection created globally
 */

// Load .env variables using vlucas/phpdotenv (MUST be first, only ONCE)
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
    if (class_exists('Dotenv\\Dotenv')) {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
        // Use safeLoad() instead of load() - doesn't fail if .env doesn't exist (on Render)
        $dotenv->safeLoad();
    }
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../app/Constants.php';
/**
 * MongoDB Database Configuration & Initialization
 * Singleton pattern - only ONE connection created globally
 */

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../app/Constants.php';

use MongoDB\Client as MongoClient;

// DEBUG: Show actual DB_HOST being used
if (isset($_GET['debug_db']) && $_GET['debug_db'] === '1') {
    header('Content-Type: text/plain');
    echo "DB_HOST: " . (defined('DB_HOST') ? DB_HOST : getenv('DB_HOST')) . "\n";
    echo "DB_NAME: " . (defined('DB_NAME') ? DB_NAME : getenv('DB_NAME')) . "\n";
    exit;
}
// SINGLETON: Static instance stored here
static $__mongo_instance = null;

if ($__mongo_instance === null) {
    try {
        // Always use DB_HOST from .env (Atlas or local)
        $uri = DB_HOST;
        
        $options = [
            // Connection timeouts - optimized for Atlas
            'connectTimeoutMS' => 15000,        // Initial connection timeout
            'serverSelectionTimeoutMS' => 30000, // MongoDB Atlas needs 30s for server discovery
            'socketTimeoutMS' => 30000,          // Normal socket timeout
            'maxPoolSize' => 50,                 // INCREASED: More connections available
            'minPoolSize' => 10,                 // INCREASED: Keep warm connections
            'maxIdleTimeMS' => 60000,            // Close idle connections after 1min
            'waitQueueTimeoutMS' => 1000,        // Fail fast if no connection available
            'heartbeatFrequencyMS' => 10000,     // Monitor server every 10s
            'retryWrites' => true,
            'journal' => true,
        ];
        
        $__mongo_instance = new MongoClient($uri, $options);
        $db = $__mongo_instance->selectDatabase(DB_NAME);

        // Ensure collections exist
        $collections_to_create = [
            COLLECTION_ADMINS,
            COLLECTION_TEACHERS,
            COLLECTION_QUESTIONS,
            COLLECTION_EVALUATIONS,
            COLLECTION_ACTIVITY_LOG,
            'system_settings'
        ];

        foreach ($collections_to_create as $col) {
            try {
                $db->createCollection($col);
            } catch (\Exception $e) {
                // Collection already exists
            }
        }
        
        // Set global db and collections
        global $db, $collections, $teachers_collection, $questions_collection, 
               $evaluations_collection, $admins_collection, $activity_log_collection, $settings_collection;
        
        $collections = [
            'admins' => $db->selectCollection(COLLECTION_ADMINS),
            'teachers' => $db->selectCollection(COLLECTION_TEACHERS),
            'questions' => $db->selectCollection(COLLECTION_QUESTIONS),
            'evaluations' => $db->selectCollection(COLLECTION_EVALUATIONS),
            'activity_log' => $db->selectCollection(COLLECTION_ACTIVITY_LOG),
            'system_settings' => $db->selectCollection('system_settings'),
        ];
        
        $teachers_collection = $collections['teachers'];
        $questions_collection = $collections['questions'];
        $evaluations_collection = $collections['evaluations'];
        $admins_collection = $collections['admins'];
        $activity_log_collection = $collections['activity_log'];
        $settings_collection = $collections['system_settings'];
        
        // Create indexes for performance
        try {
            // Evaluations indexes - optimized for common queries
            $evaluations_collection->createIndex(['teacher_id' => 1]);
            $evaluations_collection->createIndex(['submitted_at' => -1]);
            
            // Compound indexes for common query patterns
            $evaluations_collection->createIndex([
                'teacher_id' => 1,
                'academic_year' => 1,
                'semester' => 1
            ]);
            $evaluations_collection->createIndex([
                'submitted_at' => -1,
                'teacher_id' => 1
            ]);
            $evaluations_collection->createIndex([
                'academic_year' => 1,
                'semester' => 1,
                'period' => 1
            ]);
            
            // Duplicate prevention
            $evaluations_collection->createIndex(['session_identifier' => 1], ['sparse' => true]);
            $evaluations_collection->createIndex([
                'teacher_id' => 1,
                'ip_address' => 1,
                'user_agent' => 1
            ]);
            
            // Teachers indexes
            $teachers_collection->createIndex(['name' => 1]);
            $teachers_collection->createIndex(['email' => 1]);
            $teachers_collection->createIndex(['department' => 1]);
            $teachers_collection->createIndex(['status' => 1]);
            
            // Admins indexes
            $admins_collection->createIndex(['username' => 1], ['unique' => true]);
            $admins_collection->createIndex(['email' => 1], ['unique' => true]);
            
            // Questions indexes
            $questions_collection->createIndex(['status' => 1]);
            $questions_collection->createIndex(['category' => 1]);
        } catch (\Exception $e) {
            // Indexes might already exist, that's ok
        }
        
    } catch (\Exception $e) {
        // Output JSON error instead of HTML
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database connection error',
            'error' => $e->getMessage(),
            'details' => [
                'connection_uri' => DB_HOST,
                'db_name' => DB_NAME
            ]
        ]);
        exit;
    }
}

// Backward compatibility function
function init_database()
{
    global $db, $collections;
    return [
        'db' => $db,
        'collections' => $collections
    ];
}

/**
 * Archive old evaluations (older than 90 days) to reduce main collection size
 * This makes queries on the main collection much faster
 * Only run this during off-peak hours
 */
function archiveOldEvaluations()
{
    global $db, $evaluations_collection;
    
    try {
        // Get or create archive collection
        $archive_collection = $db->selectCollection('evaluations_archive');
        
        // Move evaluations older than 90 days to archive
        $cutoff_date = new MongoDB\BSON\UTCDateTime((time() - 7776000) * 1000); // 90 days ago
        
        // Find old evaluations
        $old_evals = $evaluations_collection->find(['submitted_at' => ['$lt' => $cutoff_date]]);
        
        $count = 0;
        foreach ($old_evals as $eval) {
            try {
                $archive_collection->insertOne($eval);
                $evaluations_collection->deleteOne(['_id' => $eval['_id']]);
                $count++;
            } catch (\Exception $e) {
                // Already archived, skip
            }
        }
        
        return $count;
    } catch (\Exception $e) {
        error_log('Archive error: ' . $e->getMessage());
        return 0;
    }
}