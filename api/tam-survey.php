<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

// TAM Survey Question Mapping
const TAM_QUESTIONS = [
    // Perceived Usefulness (PU)
    'PU1' => 'The teacher evaluation system will improve how I participate in teacher evaluations.',
    'PU2' => 'Using the teacher evaluation system will help me provide more effective feedback.',
    'PU3' => 'The teacher evaluation system will enhance the effectiveness of the evaluation process.',
    'PU4' => 'I find the teacher evaluation system useful.',
    
    // Perceived Ease of Use (PEU)
    'PEU1' => 'I find the teacher evaluation system easy to use.',
    'PEU2' => 'Learning how to use the teacher evaluation system is easy for me.',
    'PEU3' => 'It is easy for me to become skilled in using the teacher evaluation system.',
    'PEU4' => 'My interaction with the teacher evaluation system is clear.',
    'PEU5' => 'My interaction with the teacher evaluation system is understandable.',
    'PEU6' => 'It will be easy for me to find information or complete tasks through the system.',
    
    // Attitude (AT)
    'AT1' => 'Using the teacher evaluation system is a good idea.',
    'AT2' => 'I feel positive towards using the teacher evaluation system.',
    'AT3' => 'I believe the teacher evaluation system helps me stay more engaged in the evaluation process.',
    'AT4' => 'I generally favor using a digital system to evaluate my teachers.',
    'AT5' => 'I believe it is a good idea for me to use this teacher evaluation system for my course/school evaluations in the future.',
    
    // Behavioral Intention (BI)
    'BI1' => 'I intend to frequently use the teacher evaluation system to submit my evaluations.',
    'BI2' => 'I intend to use the teacher evaluation system regularly during the evaluation period.',
    'BI3' => 'I intend to use the teacher evaluation system throughout this semester and the next.',
    'BI4' => 'I intend to repetitively use the teacher evaluation system as often as possible.',
];

function getDatabase() {
    global $db;
    return $db;
}

function calculateCategoryScore($responses, $category, $questions) {
    $categoryResponses = [];
    foreach ($questions as $code => $question) {
        if (strpos($code, $category) === 0 && isset($responses[$code])) {
            $categoryResponses[] = $responses[$code];
        }
    }
    
    if (empty($categoryResponses)) {
        return 0;
    }
    
    return round(array_sum($categoryResponses) / count($categoryResponses), 2);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? null;
    
    // Handle survey submission
    if ($action === 'submit_survey') {
        $user_id = $data['user_id'] ?? null;
        $teacher_id = $data['teacher_id'] ?? null;
        $department = $data['department'] ?? null;
        $age = $data['age'] ?? null;
        $sex = $data['sex'] ?? null;
        $year = $data['year'] ?? null;
        $course = $data['course'] ?? null;
        $responses = $data['responses'] ?? [];
        
        // Validate inputs
        if (!$user_id || !$teacher_id || !$department || empty($responses)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing required fields']);
            exit;
        }
        
        // Validate demographic fields
        if (!$age || !$sex || !$year || !$course) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Missing demographic information']);
            exit;
        }
        
        // Validate department
        $validDepartments = ['ECT', 'CRIM', 'EDUC', 'BHT'];
        if (!in_array($department, $validDepartments)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid department']);
            exit;
        }
        
        // Validate responses (must have all questions)
        // Total: 4 (PU) + 6 (PEU) + 5 (AT) + 4 (BI) = 19 questions
        if (count($responses) !== count(TAM_QUESTIONS)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'All questions must be answered']);
            exit;
        }
        
        // Validate each response is 1-5
        foreach ($responses as $code => $rating) {
            if (!isset(TAM_QUESTIONS[$code]) || $rating < 1 || $rating > 5) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => "Invalid response for $code"]);
                exit;
            }
        }
        
        try {
            $db = getDatabase();
            $surveyCollection = $db->selectCollection('tam_survey');
            
            // Calculate category scores
            $categoryScores = [
                'PU' => calculateCategoryScore($responses, 'PU', TAM_QUESTIONS),
                'PEU' => calculateCategoryScore($responses, 'PEU', TAM_QUESTIONS),
                'AT' => calculateCategoryScore($responses, 'AT', TAM_QUESTIONS),
                'BI' => calculateCategoryScore($responses, 'BI', TAM_QUESTIONS),
            ];
            
            // Calculate overall average
            $overallScore = round(array_sum($categoryScores) / count($categoryScores), 2);
            
            $result = $surveyCollection->insertOne([
                'user_id' => $user_id,
                'teacher_id' => $teacher_id,
                'department' => $department,
                'age' => (int)$age,
                'sex' => trim($sex),
                'year' => trim($year),
                'course' => trim($course),
                'responses' => $responses,
                'category_scores' => $categoryScores,
                'overall_score' => $overallScore,
                'submitted_at' => new UTCDateTime(time() * 1000),
            ]);
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Survey submitted successfully',
                'scores' => $categoryScores,
                'overall_score' => $overallScore
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
} 
elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get survey questions (public endpoint)
    $action = $_GET['action'] ?? null;
    
    if ($action === 'get_questions') {
        echo json_encode([
            'success' => true,
            'questions' => TAM_QUESTIONS,
            'categories' => [
                'PU' => ['name' => 'Perceived Usefulness', 'items' => 4],
                'PEU' => ['name' => 'Perceived Ease of Use', 'items' => 6],
                'AT' => ['name' => 'Attitude', 'items' => 5],
                'BI' => ['name' => 'Behavioral Intention to Use', 'items' => 4],
            ]
        ]);
        exit;
    }
    
    // Get survey results (admin only)
    if ($action === 'get_results') {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        // Restore session if needed
        if (empty($_SESSION['admin_id'])) {
            $phpSessionId = $_COOKIE['PHPSESSID'] ?? null;
            if ($phpSessionId) {
                $sessionSavePath = dirname(dirname(__FILE__)) . '/storage/sessions';
                $sessionFile = $sessionSavePath . '/sess_' . $phpSessionId;
                if (file_exists($sessionFile)) {
                    $sessionData = @file_get_contents($sessionFile);
                    if ($sessionData !== false && !empty($sessionData)) {
                        $offset = 0;
                        while ($offset < strlen($sessionData)) {
                            if (!stristr(substr($sessionData, $offset), "|")) break;
                            $pos = strpos($sessionData, "|", $offset);
                            $num = $pos - $offset;
                            $varname = substr($sessionData, $offset, $num);
                            $offset += $num + 1;
                            $data_item = unserialize(substr($sessionData, $offset));
                            $_SESSION[$varname] = $data_item;
                            $offset += strlen(serialize($data_item));
                        }
                    }
                }
            }
        }
        
        if (!isset($_SESSION['admin_id'])) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized']);
            exit;
        }
        
        try {
            $db = getDatabase();
            $surveyCollection = $db->selectCollection('tam_survey');
            
            // Get all surveys
            $cursor = $surveyCollection->find([], ['sort' => ['submitted_at' => -1]]);
            $surveys = iterator_to_array($cursor);
            
            // Calculate statistics
            $stats = [
                'total_responses' => count($surveys),
                'overall_average' => 0,
                'category_averages' => [
                    'PU' => 0,
                    'PEU' => 0,
                    'AT' => 0,
                    'BI' => 0,
                ],
                'question_averages' => []
            ];
            
            if (count($surveys) > 0) {
                // Calculate category averages
                $categoryTotals = ['PU' => 0, 'PEU' => 0, 'AT' => 0, 'BI' => 0];
                $questionTotals = array_fill_keys(array_keys(TAM_QUESTIONS), 0);
                $questionCounts = array_fill_keys(array_keys(TAM_QUESTIONS), 0);
                
                foreach ($surveys as $survey) {
                    $catScores = $survey['category_scores'] ?? [];
                    foreach ($catScores as $category => $score) {
                        $categoryTotals[$category] += $score;
                    }
                    
                    $responses = $survey['responses'] ?? [];
                    foreach ($responses as $code => $rating) {
                        $questionTotals[$code] += $rating;
                        $questionCounts[$code]++;
                    }
                }
                
                // Calculate averages
                foreach ($categoryTotals as $category => $total) {
                    $stats['category_averages'][$category] = round($total / count($surveys), 2);
                }
                
                foreach ($questionTotals as $code => $total) {
                    $stats['question_averages'][$code] = $questionCounts[$code] > 0 
                        ? round($total / $questionCounts[$code], 2)
                        : 0;
                }
                
                $allCategoryAvgs = array_values($stats['category_averages']);
                $stats['overall_average'] = round(array_sum($allCategoryAvgs) / count($allCategoryAvgs), 2);
            }
            
            echo json_encode([
                'success' => true,
                'surveys' => array_map(function($survey) {
                    $survey['_id'] = (string)$survey['_id'];
                    return $survey;
                }, $surveys),
                'stats' => $stats
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }
}
else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
