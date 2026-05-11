<?php
/**
 * Admin Footer
 */
?>

<style>
    .footer-minimal {
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        padding: 1.5rem 0;
        margin-top: auto;
        text-align: center;
        width: 100%;
    }

    .footer-minimal p {
        margin: 0;
        color: #000000;
        font-size: 13px;
        font-weight: 500;
    }

    body {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    /* Main wrapper for pages - expands to push footer down */
    main, .main-content {
        flex: 1;
    }

    /* Real-time notification animation */
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
</style>

<footer class="footer-minimal">
    <div class="container-fluid">
        <p>&copy; 2026 Fullbright College Inc. Teacher Evaluation System</p>
    </div>
</footer>

<!-- Real-Time Notifications System - Available on all admin pages -->
<script>
    // Set admin credentials for real-time notifications
    window.ADMIN_ID = <?php echo json_encode($_SESSION['admin_id'] ?? null, JSON_UNESCAPED_SLASHES); ?>;
    window.ADMIN_ROLE = <?php echo json_encode($_SESSION['admin_role'] ?? 'user', JSON_UNESCAPED_SLASHES); ?>;
    console.log('🔐 Admin credentials set:', { adminId: window.ADMIN_ID, adminRole: window.ADMIN_ROLE });
</script>

<!-- Load notification systems -->
<script>
    // Load notification toast script for UI feedback
    var toastScript = document.createElement('script');
    toastScript.src = '<?= ASSETS_URL ?>/js/notification-toast.js';
    document.head.appendChild(toastScript);
    
    // Load notification polling script (checks for new evaluations every 5 seconds)
    var pollingScript = document.createElement('script');
    pollingScript.src = '<?= ASSETS_URL ?>/js/notification-polling.js';
    document.head.appendChild(pollingScript);
    
    // Debug functions available in console
    window.debugNotifications = function() {
        console.log('=== NOTIFICATION DEBUG ===');
        console.log('Poller status:', window.notificationPoller ? 'Active' : 'Not initialized');
        console.log('Poller instance:', window.notificationPoller);
        console.log('Last evaluation ID:', localStorage.getItem('lastEvaluationId'));
        console.log('Badge element:', document.getElementById('notif-badge'));
        if (window.notificationPoller) {
            console.log('Is polling:', window.notificationPoller.isPolling);
            console.log('Polling interval:', window.notificationPoller.pollingInterval + 'ms');
        }
    };
    console.log('💡 Notification polling active - Run debugNotifications() to check status');
</script>
