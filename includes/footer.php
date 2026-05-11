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

<!-- Load real-time notifications scripts -->
<script>
    // Load notification toast script
    var toastScript = document.createElement('script');
    toastScript.src = '<?= ASSETS_URL ?>/js/notification-toast.js';
    document.head.appendChild(toastScript);
    
    // DISABLED: Load real-time notifications script (will auto-initialize)
    // Causing ERR_ABORTED errors - need to fix SSE endpoint first
    // var notifyScript = document.createElement('script');
    // notifyScript.src = '<?= ASSETS_URL ?>/js/real-time-notifications.js';
    // document.head.appendChild(notifyScript);
    
    // Debug function available in console
    window.debugNotifications = function() {
        console.log('=== NOTIFICATION DEBUG ===');
        console.log('ADMIN_ID:', window.ADMIN_ID);
        console.log('ADMIN_ROLE:', window.ADMIN_ROLE);
        console.log('RealTimeNotifications class:', typeof RealTimeNotifications);
        console.log('realTimeNotifications instance:', window.realTimeNotifications);
        console.log('Badge element:', document.getElementById('notif-badge'));
        console.log('Notification total element:', document.getElementById('notif-total'));
        console.log('Notification list element:', document.getElementById('notif-list'));
        console.log('Navbar element:', document.querySelector('nav'));
        if (window.realTimeNotifications) {
            console.log('Connection status:', window.realTimeNotifications.isConnected);
            console.log('EventSource:', window.realTimeNotifications.eventSource);
        }
    };
    console.log('💡 Run debugNotifications() in console to check notification system status');
</script>
