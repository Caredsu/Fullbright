<?php
/**
 * Test Notification Badge System
 * Tests real-time notification badge on all admin pages
 */

session_start();

// Check if user is logged in
if (!isset($_SESSION['admin_id'])) {
    header('Location: /teacher-eval/admin/login.php');
    exit;
}

// Define constants
if (!defined('ASSETS_URL')) {
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $isProduction = strpos($host, 'localhost') === false && strpos($host, '127.0.0.1') === false;
    define('ASSETS_URL', $isProduction ? '/assets' : '/teacher-eval/assets');
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Notification Badge</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <style>
        body {
            background: #f5f7fa;
            padding-top: 20px;
        }
        .test-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 30px;
            max-width: 600px;
            margin: 30px auto;
        }
        .test-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .test-button {
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 500;
            border-radius: 8px;
            transition: all 0.3s;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-ok { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .code-block {
            background: #2d2d2d;
            color: #f8f8f2;
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            overflow-x: auto;
            margin: 10px 0;
        }
        .instructions {
            background: #e7f3ff;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .test-result {
            margin-top: 15px;
            padding: 15px;
            border-radius: 6px;
            display: none;
        }
        .test-result.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
            display: block;
        }
        .test-result.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            display: block;
        }
    </style>
</head>
<body>
    <?php include '../includes/navbar.php'; ?>

    <div class="test-container">
        <h1><i class="bi bi-bell"></i> Test Notification Badge System</h1>
        <p class="text-muted">Verify that the notification badge appears in the navbar on this page</p>

        <div class="instructions">
            <strong><i class="bi bi-info-circle"></i> Instructions:</strong>
            <ol style="margin-bottom: 0; padding-left: 20px;">
                <li>Click the <strong>"Trigger Test Notification"</strong> button below</li>
                <li>Look at the navbar above - you should see a <strong style="color: #dc3545;">green badge</strong> with a number appear next to the bell icon</li>
                <li>Open the browser console (F12) to see detailed logs</li>
                <li>Click the test button multiple times to see the badge count increase</li>
            </ol>
        </div>

        <div class="test-section">
            <h3><i class="bi bi-gear"></i> System Status</h3>
            <div class="row mt-3">
                <div class="col-md-6">
                    <p><strong>Admin ID:</strong></p>
                    <code id="admin-id" class="text-muted"><?= htmlspecialchars($_SESSION['admin_id'] ?? 'Not set') ?></code>
                </div>
                <div class="col-md-6">
                    <p><strong>Admin Username:</strong></p>
                    <code id="admin-username" class="text-muted"><?= htmlspecialchars($_SESSION['admin_username'] ?? 'Not set') ?></code>
                </div>
            </div>
            <div class="mt-3">
                <button class="btn btn-info" onclick="checkSystemStatus()">
                    <i class="bi bi-search"></i> Check System Status
                </button>
            </div>
            <div id="system-status" class="test-result mt-3"></div>
        </div>

        <div class="test-section">
            <h3><i class="bi bi-bug"></i> Test Notification</h3>
            <p>This will simulate a real notification event:</p>
            <button class="btn btn-success test-button" onclick="triggerTestNotification()">
                <i class="bi bi-play-circle"></i> Trigger Test Notification
            </button>
            <div id="test-result" class="test-result mt-3"></div>
        </div>

        <div class="test-section">
            <h3><i class="bi bi-console"></i> Console Logs</h3>
            <p>Check your browser console (F12) for detailed logs. Look for messages starting with:</p>
            <div class="code-block">
🔔 handleNewEvaluation called
🔔 Calling updateBadge...
📋 Calling addToNotificationPanel...
            </div>
            <button class="btn btn-secondary" onclick="openConsole()">
                <i class="bi bi-terminal"></i> Open Browser Console (F12)
            </button>
        </div>

        <div class="test-section">
            <h3><i class="bi bi-list-check"></i> Verification Checklist</h3>
            <ul style="margin-bottom: 0;">
                <li><input type="checkbox" id="check1" onchange="updateChecklist()"> Badge appears in navbar after clicking test button</li>
                <li><input type="checkbox" id="check2" onchange="updateChecklist()"> Badge shows a count number (1, 2, 3, etc.)</li>
                <li><input type="checkbox" id="check3" onchange="updateChecklist()"> Badge color is correct (danger/red)</li>
                <li><input type="checkbox" id="check4" onchange="updateChecklist()"> Console shows handleNewEvaluation logs</li>
                <li><input type="checkbox" id="check5" onchange="updateChecklist()"> Toast notification appears (top-right)</li>
            </ul>
        </div>

        <div class="test-section">
            <h3><i class="bi bi-arrow-left"></i> Navigation</h3>
            <p>The notification badge should persist when you navigate to other admin pages:</p>
            <div class="btn-group" role="group">
                <a href="/teacher-eval/admin/dashboard.php" class="btn btn-outline-primary">
                    <i class="bi bi-graph-up"></i> Dashboard
                </a>
                <a href="/teacher-eval/admin/analytics.php" class="btn btn-outline-primary">
                    <i class="bi bi-bar-chart"></i> Analytics
                </a>
                <a href="/teacher-eval/admin/teachers.php" class="btn btn-outline-primary">
                    <i class="bi bi-people"></i> Teachers
                </a>
                <a href="/teacher-eval/admin/results.php" class="btn btn-outline-primary">
                    <i class="bi bi-file-earmark"></i> Results
                </a>
            </div>
        </div>
    </div>

    <?php include '../includes/footer.php'; ?>

    <script>
        // Test notification function
        function triggerTestNotification() {
            console.log('🧪 Triggering test notification...');
            
            try {
                // Check if RealTimeNotifications is available
                if (typeof window.realTimeNotifications === 'undefined' || !window.realTimeNotifications) {
                    showResult('error', '❌ RealTimeNotifications not initialized. Please wait a moment and try again.');
                    console.warn('RealTimeNotifications not available');
                    return;
                }

                // Create a mock evaluation object
                const testEvaluation = {
                    id: 'test-' + Date.now(),
                    teacher_id: 'test-teacher-' + Math.floor(Math.random() * 1000),
                    teacher_name: 'Test Teacher #' + Math.floor(Math.random() * 100),
                    rating: Math.round(Math.random() * 5 * 10) / 10, // Random rating 0-5
                    created_at: new Date().toISOString()
                };

                console.log('📊 Test evaluation:', testEvaluation);

                // Call the handleNewEvaluation method directly
                window.realTimeNotifications.handleNewEvaluation(testEvaluation);
                
                showResult('success', '✅ Test notification triggered! Check the navbar for the badge and the top-right for a toast notification.');
                console.log('✅ Test notification completed');

            } catch (error) {
                console.error('❌ Error triggering notification:', error);
                showResult('error', '❌ Error: ' + error.message);
            }
        }

        // Check system status
        function checkSystemStatus() {
            console.log('=== SYSTEM STATUS CHECK ===');
            const status = {
                adminId: window.ADMIN_ID,
                adminRole: window.ADMIN_ROLE,
                RealTimeNotificationsClass: typeof RealTimeNotifications,
                RealTimeNotificationsInstance: window.realTimeNotifications,
                BadgeElement: document.getElementById('notif-badge'),
                NotificationList: document.getElementById('notif-list'),
                NavbarPresent: document.querySelector('nav') ? 'Yes' : 'No'
            };

            console.log(status);

            let html = '<strong>System Status:</strong><br>';
            html += `<small class="text-muted">`;
            html += `Admin ID: <code>${window.ADMIN_ID || '❌ Not set'}</code><br>`;
            html += `Admin Role: <code>${window.ADMIN_ROLE || '❌ Not set'}</code><br>`;
            html += `RealTimeNotifications class: <code>${typeof RealTimeNotifications}</code><br>`;
            html += `RealTimeNotifications instance: <code>${window.realTimeNotifications ? '✅ Initialized' : '❌ Not initialized'}</code><br>`;
            html += `Badge element: <code>${document.getElementById('notif-badge') ? '✅ Found' : '❌ Not found'}</code><br>`;
            html += `Notification list: <code>${document.getElementById('notif-list') ? '✅ Found' : '❌ Not found'}</code><br>`;
            html += `Navbar: <code>${document.querySelector('nav') ? '✅ Found' : '❌ Not found'}</code><br>`;
            html += `</small>`;

            document.getElementById('system-status').innerHTML = html;
            document.getElementById('system-status').className = 'test-result success mt-3';
        }

        // Show result
        function showResult(type, message) {
            const resultDiv = document.getElementById('test-result');
            resultDiv.innerHTML = message;
            resultDiv.className = 'test-result ' + type + ' mt-3';
        }

        // Open console
        function openConsole() {
            console.log('💡 Browser console is now open. Check the logs above for notification events.');
        }

        // Update checklist
        function updateChecklist() {
            const checkedCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
            console.log(`✅ Checklist: ${checkedCount}/5 items verified`);
        }

        // Auto check on load
        window.addEventListener('load', function() {
            console.log('🧪 Notification badge test page loaded');
            checkSystemStatus();
            
            // Auto-show instructions after 500ms
            setTimeout(function() {
                console.log('💡 Click "Trigger Test Notification" button to test the badge system');
            }, 500);
        });
    </script>
</body>
</html>
