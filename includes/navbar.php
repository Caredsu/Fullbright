<?php
/**
 * Admin Navigation Bar
 */

if (!defined('HELPERS_LOADED')) {
    require_once __DIR__ . '/helpers.php';
    define('HELPERS_LOADED', true);
}

if (session_status() === PHP_SESSION_NONE) {
    initializeSession();
}
?>

<style>
    .navbar-dark-theme {
        background: #1e2a3a !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        padding: 0.75rem 1rem !important;
        height: 70px !important;
        min-height: 70px !important;
        max-height: 70px !important;
        display: flex !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 1000 !important;
    }
    
    .navbar-dark-theme .navbar-brand {
        color: #fff !important;
        font-size: 18px;
        font-weight: 600;
        margin: 0 !important;
        padding: 0 !important;
        white-space: normal !important;
        flex-shrink: 0 !important;
        display: flex !important;
        align-items: center !important;
        gap: 10px;
    }
    
    .navbar-dark-theme .container-fluid {
        display: flex !important;
        align-items: center !important;
        padding: 0 !important;
        height: 100% !important;
        margin: 0 !important;
    }
    
    .navbar-dark-theme .nav-link {
        color: #ecf0f1 !important;
        transition: color 0.2s, text-shadow 0.2s;
        font-weight: 500;
        padding: 0.5rem 1rem !important;
        white-space: nowrap;
        font-size: 15px;
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem;
        height: 100% !important;
        line-height: 1 !important;
        margin: 0 !important;
    }
    
    .navbar-dark-theme .nav-link i {
        display: inline-block !important;
        font-size: 1.1em !important;
        color: #ecf0f1 !important;
    }
    
    .navbar-dark-theme .nav-link:hover {
        color: #3498db !important;
        text-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
    }
    
    .navbar-dark-theme .nav-link:hover i {
        color: #3498db !important;
    }
    
    .navbar-dark-theme .dropdown-menu {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .navbar-dark-theme .dropdown-item {
        color: #000000 !important;
    }
    
    .navbar-dark-theme .dropdown-item:hover {
        background: #f1f5f9 !important;
        color: #8b5cf6 !important;
    }
    
    .navbar-toggler {
        padding: 0.25rem 0.5rem !important;
        border: none !important;
    }
    
    .navbar-toggler {
        padding: 0.25rem 0.5rem;
    }
    
    #notif-badge {
        animation: badgePulse 2s infinite;
    }
    
    @keyframes badgePulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
</style>

<nav class="navbar navbar-expand-lg navbar-dark navbar-dark-theme">
    <div class="container-fluid">
        <!-- Brand -->
        <?php 
            // Get base path dynamically from the current request
            // This handles ANY deployment location correctly
            
            // Strategy 1: Try to get from REQUEST_URI
            $currentPath = $_SERVER['REQUEST_URI'] ?? '';
            $adminBase = null;
            
            if (strpos($currentPath, '/admin/') !== false) {
                $adminIndex = strpos($currentPath, '/admin/');
                $adminBase = substr($currentPath, 0, $adminIndex) . '/admin';
                error_log("adminBase (from REQUEST_URI): " . $adminBase);
            } 
            
            // Strategy 2: Try to get from SCRIPT_FILENAME
            if (!$adminBase) {
                $scriptPath = $_SERVER['SCRIPT_FILENAME'] ?? '';
                if (strpos($scriptPath, '/admin/') !== false) {
                    $adminIndex = strrpos($scriptPath, '/admin');
                    $adminPathRelative = substr($scriptPath, 0, $adminIndex) . '/admin';
                    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
                    $adminBase = str_replace($documentRoot, '', $adminPathRelative);
                    error_log("adminBase (from SCRIPT_FILENAME): " . $adminBase);
                }
            }
            
            // Strategy 3: Last resort
            if (!$adminBase) {
                $adminBase = '/teacher-eval/admin';
                error_log("adminBase (fallback): " . $adminBase);
            }
            
            // Make sure adminBase doesn't end with /
            $adminBase = rtrim($adminBase, '/');
        ?>
        <a class="navbar-brand fw-bold" href="<?= $adminBase ?>/dashboard.php">
            <img src="<?= ASSETS_URL ?>/img/2.png" alt="Logo" style="height: 40px; margin-right: 8px; vertical-align: middle;">
            <div style="display: flex; flex-direction: column; line-height: 1.2;">
                <span style="font-size: 16px;">Teacher Evaluation</span>
                <span style="font-size: 16px;">System</span>
            </div>
        </a>
        
        <!-- Toggler for mobile -->
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        
        <!-- Navigation Items -->
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav ms-auto">
                <?php 
                    // Reuse the same adminBase calculation from above
                    // (no need to recalculate)
                ?>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/dashboard.php">
                        <i class="bi bi-graph-up"></i> Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/teachers.php">
                        <i class="bi bi-people"></i> Teachers
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/questions.php">
                        <i class="bi bi-question-circle"></i> Questions
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/results.php">
                        <i class="bi bi-bar-chart"></i> Results
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/analytics.php">
                        <i class="bi bi-bar-chart"></i> Analytics
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/tam-survey-results.php">
                        <i class="bi bi-graph-up"></i> TAM Survey Results
                    </a>
                </li>
                <?php if (isAdmin()): ?>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/users.php">
                        <i class="bi bi-shield-lock"></i> Users
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="<?= $adminBase ?>/manage-evaluations.php">
                        <i class="bi bi-pencil-square"></i> Manage Evaluations
                    </a>
                </li>
                <?php endif; ?>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown">
                        <i class="bi bi-person-circle"></i> <?= escapeOutput($_SESSION['admin_username'] ?? 'Admin') ?>
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                        <li><a class="dropdown-item" href="<?= $adminBase ?>/settings.php"><i class="bi bi-gear"></i> Settings</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <form method="POST" action="<?= $adminBase ?>/logout.php" class="d-inline">
                                <button type="submit" class="dropdown-item"><i class="bi bi-box-arrow-right"></i> Logout</button>
                            </form>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
    </div>
</nav>


