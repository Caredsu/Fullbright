<?php
/**
 * Admin Login Page - Enhanced Version with UX Improvements
 * Improvements:
 * - Show/hide password toggle
 * - Better mobile role selector
 * - Optimized input spacing
 * - Form validation
 * - Better accessibility
 */

require_once '../includes/helpers.php';

initializeSession();
if (isLoggedIn()) {
    // Determine the correct protocol to match session cookie
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $redirect_url = $protocol . '://' . $host . '/teacher-eval/admin/dashboard.php';
    echo '<script>window.location.href="' . escapeOutput($redirect_url) . '";</script>';
    exit;
}

require_once '../config/database.php';

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_POST['csrf_token']) || !verifyCSRFToken($_POST['csrf_token'])) {
        $error = 'Security token invalid. Please try again.';
    } else {
        $username = getPOST('username');
        $password = getPOST('password');
        $selected_role = getPOST('login_role') ?? 'admin';
        
        if (empty($username) || empty($password)) {
            $error = 'Username and password are required.';
        } else {
            try {
                global $admins_collection;
                $admin = $admins_collection->findOne(['username' => $username]);
                
                $password_field = isset($admin['password_hashed']) ? 'password_hashed' : 'password';
                $stored_hash = $admin[$password_field] ?? null;
                
                if ($admin && $stored_hash && verifyPassword($password, $stored_hash)) {
                    $user_status = $admin['status'] ?? 'active';
                    if ($user_status !== 'active') {
                        $error = 'Your account has been deactivated. Please contact an administrator.';
                        logActivity('LOGIN_FAILED', 'Inactive user attempted login: ' . $username);
                    } else {
                        $user_role = $admin['role'] ?? 'admin';
                        
                        if ($user_role !== $selected_role) {
                            $error = "This account is registered as " . ucfirst($user_role) . ". Please select the correct role.";
                            logActivity('LOGIN_FAILED', 'Role mismatch for user: ' . $username);
                        } else {
                            $_SESSION['admin_id'] = (string) $admin['_id'];
                            $_SESSION['admin_username'] = $admin['username'];
                            $_SESSION['admin_role'] = $user_role;
                            $_SESSION['just_logged_in'] = true;
                            
                            error_log("[LOGIN_SUCCESS] Setting session data - admin_id=" . $_SESSION['admin_id']);
                            error_log("[LOGIN_SUCCESS] Session ID before regenerate: " . session_id());
                            
                            // Regenerate session ID for security - WITHOUT deleting old session
                            // (deleting old session on Windows/XAMPP causes issues with new session not being created)
                            session_regenerate_id(false);  // false = keep old session file
                            
                            error_log("[LOGIN_SUCCESS] Session ID after regenerate: " . session_id());
                            error_log("[LOGIN_SUCCESS] Session status: " . session_status());
                            error_log("[LOGIN_SUCCESS] Session data saved: admin_id=" . $_SESSION['admin_id'] . ", admin_role=" . $_SESSION['admin_role']);
                            
                            // Make absolutely sure session is written before redirect
                            session_write_close();
                            
                            global $admins_collection;
                            try {
                                $admins_collection->updateOne(
                                    ['_id' => $admin['_id']],
                                    ['$set' => ['last_login' => new MongoDB\BSON\UTCDateTime()]]
                                );
                            } catch (Exception $e) {
                                error_log('Failed to update last_login: ' . $e->getMessage());
                            }
                            
                            logActivity('LOGIN', 'Admin logged in');
                            redirect(BASE_URL . '/admin/dashboard.php');
                        }
                    }
                } else {
                    $error = 'Invalid username or password.';
                    logActivity('LOGIN_FAILED', 'Failed login attempt with username: ' . $username);
                }
            } catch (\MongoDB\Driver\Exception\ConnectionTimeoutException $e) {
                $error = 'Database connection timeout. MongoDB server is not responding. Please try again in a moment.';
            } catch (\MongoDB\Driver\Exception\ServerSelectionTimeoutException $e) {
                $error = 'Database server is unavailable. Please try again later.';
            } catch (\Exception $e) {
                $error = 'Database error. Please try again.';
                error_log('Login DB Error: ' . $e->getMessage());
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Fullbright College Inc. - Teacher Evaluation System">
    <meta name="theme-color" content="#3B82F6">
    <title>Admin Login - Fullbright College Inc.</title>
    
    <link rel="preload" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" as="style">
    <link rel="preload" href="<?= ASSETS_URL ?>/css/dark-theme.css" as="style">
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/admin-login.css">
    
    <!-- SweetAlert2 for toast notifications -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
</head>
<body>
    <div class="login-wrapper">
        <div class="login-content">
            <!-- Left: Features -->
            <div class="login-info">
                <div style="margin-bottom: 35px; text-align: center;">
                    <img src="../assets/img/2.png" alt="Fullbright College Inc Logo" style="max-height: 80px; width: auto; margin-bottom: 15px; filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));">
                    <p style="color: rgba(255, 255, 255, 0.95); font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin: 0;">
                        Fullbright College Inc.
                    </p>
                    <p style="color: rgba(255, 255, 255, 0.75); font-size: 12px; font-weight: 500; margin: 6px 0 0 0;">Excellence in Education</p>
                </div>
                <h1>Teacher Evaluation System</h1>
                <p class="subtitle">Streamline feedback collection and improve teaching quality</p>
                
                <ul class="features-list">
                    <li>
                        <i class="bi bi-shield-check"></i>
                        <div>
                            <strong>Secure & Private</strong><br>
                            <span style="font-size: 13px; opacity: 0.9;">Anonymous evaluations with end-to-end protection</span>
                        </div>
                    </li>
                    <li>
                        <i class="bi bi-lightning-fill"></i>
                        <div>
                            <strong>Real-time Analytics</strong><br>
                            <span style="font-size: 13px; opacity: 0.9;">Instant insights and detailed performance metrics</span>
                        </div>
                    </li>
                    <li>
                        <i class="bi bi-graph-up"></i>
                        <div>
                            <strong>Data-Driven Insights</strong><br>
                            <span style="font-size: 13px; opacity: 0.9;">Visualize trends and identify improvement areas</span>
                        </div>
                    </li>
                    <li>
                        <i class="bi bi-phone"></i>
                        <div>
                            <strong>Mobile Friendly</strong><br>
                            <span style="font-size: 13px; opacity: 0.9;">Works seamlessly on all devices</span>
                        </div>
                    </li>
                </ul>

                <div style="background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2);">
                    <p style="color: rgba(255, 255, 255, 0.95); font-size: 14px; margin: 0;">
                        <i class="bi bi-info-circle" style="margin-right: 8px;"></i>
                        Trusted by educational institutions for reliable feedback collection
                    </p>
                </div>
            </div>

            <!-- Right: Form -->
            <div class="login-form-container">
                <!-- Role Selector (Mobile-Friendly) -->
                <div class="role-selector" id="roleSelector" role="radiogroup" aria-label="Login role selection">
                    <button type="button" class="role-btn active" data-role="admin" aria-label="Login as Admin" aria-pressed="true">
                        <i class="bi bi-shield-lock"></i> Admin
                    </button>
                    <button type="button" class="role-btn" data-role="staff" aria-label="Login as Staff" aria-pressed="false">
                        <i class="bi bi-person-badge"></i> Staff
                    </button>
                </div>

                <div class="form-header">
                    <div class="icon">
                        <i class="bi bi-person-lock"></i>
                    </div>
                    <h2 id="roleTitle">Admin Access</h2>
                    <p id="roleDescription">Sign in to manage evaluations</p>
                </div>

                <?php if (!empty($error)): ?>
                    <div class="alert alert-danger" role="alert">
                        <i class="bi bi-exclamation-circle" style="margin-right: 8px;"></i>
                        <strong>Login Error!</strong><br>
                        <?= escapeOutput($error) ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="" novalidate id="loginForm">
                    <?php outputCSRFToken(); ?>
                    <input type="hidden" name="login_role" id="login_role" value="admin">

                    <!-- Username -->
                    <div class="form-group">
                        <label for="username" class="form-label">Username</label>
                        <div class="input-wrapper">
                            <i class="bi bi-person-fill input-icon"></i>
                            <input 
                                type="text" 
                                class="form-control" 
                                id="username" 
                                name="username" 
                                placeholder="Enter your username"
                                required
                                autofocus
                                aria-label="Username"
                                aria-required="true"
                            >
                        </div>
                    </div>

                    <!-- Password with Show/Hide -->
                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <div class="input-wrapper">
                            <i class="bi bi-lock-fill input-icon"></i>
                            <input 
                                type="password" 
                                class="form-control" 
                                id="password" 
                                name="password" 
                                placeholder="Enter your password"
                                required
                                aria-label="Password"
                                aria-required="true"
                            >
                            <button 
                                type="button" 
                                class="input-addon-btn" 
                                id="togglePassword" 
                                aria-label="Show password"
                                aria-controls="password"
                                title="Toggle password visibility"
                            >
                                <i class="bi bi-eye"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Remember Me -->
                    <div class="form-check">
                        <input 
                            type="checkbox" 
                            class="form-check-input" 
                            id="remember" 
                            name="remember"
                        >
                        <label class="form-check-label" for="remember">
                            Remember me for 30 days
                        </label>
                    </div>

                    <!-- Forgot Password -->
                    <div class="forgot-password">
                        <a href="#" tabindex="0">Forgot your password?</a>
                    </div>

                    <!-- Submit Button -->
                    <button type="submit" class="btn-login" id="loginBtn">
                        <i class="bi bi-box-arrow-in-right" style="margin-right: 8px;"></i>
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- Loading Overlay -->
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-container">
            <div class="spinner"></div>
            <div class="loading-text">Signing In...</div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Show/Hide Password Toggle
            const togglePasswordBtn = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('password');
            
            if (togglePasswordBtn && passwordInput) {
                // Hide toggle initially
                togglePasswordBtn.style.display = 'none';
                
                // Show/hide toggle based on input content
                passwordInput.addEventListener('input', function() {
                    togglePasswordBtn.style.display = this.value.length > 0 ? 'block' : 'none';
                });
                
                // Toggle password visibility
                togglePasswordBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const isPassword = passwordInput.type === 'password';
                    passwordInput.type = isPassword ? 'text' : 'password';
                    
                    // Update icon
                    this.innerHTML = isPassword 
                        ? '<i class="bi bi-eye-slash"></i>' 
                        : '<i class="bi bi-eye"></i>';
                    
                    // Update aria-label
                    this.setAttribute('aria-label', isPassword 
                        ? 'Hide password' 
                        : 'Show password');
                    
                    // Focus back on input
                    passwordInput.focus();
                });
            }

            // Remember Me Functionality
            const rememberCheckbox = document.getElementById('remember');
            const usernameInput = document.getElementById('username');
            
            // Load remembered username
            const savedUsername = localStorage.getItem('teacher_eval_username');
            if (savedUsername) {
                usernameInput.value = savedUsername;
                rememberCheckbox.checked = true;
            }

            // Save on form submit
            const loginForm = document.getElementById('loginForm');
            loginForm.addEventListener('submit', function() {
                if (rememberCheckbox.checked) {
                    localStorage.setItem('teacher_eval_username', usernameInput.value);
                } else {
                    localStorage.removeItem('teacher_eval_username');
                }
            });

            // Role Selector
            const roleButtons = document.querySelectorAll('.role-btn');
            const roleTitle = document.getElementById('roleTitle');
            const roleDescription = document.getElementById('roleDescription');
            const loginRoleInput = document.getElementById('login_role');

            roleButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    e.preventDefault();
                    const role = this.getAttribute('data-role');

                    roleButtons.forEach(btn => {
                        btn.classList.remove('active');
                        btn.setAttribute('aria-pressed', 'false');
                    });

                    this.classList.add('active');
                    this.setAttribute('aria-pressed', 'true');
                    loginRoleInput.value = role;

                    if (role === 'admin') {
                        roleTitle.textContent = 'Admin Access';
                        roleDescription.textContent = 'Sign in to manage evaluations';
                    } else if (role === 'staff') {
                        roleTitle.textContent = 'Staff Access';
                        roleDescription.textContent = 'Sign in to view results';
                    }
                });
            });

            // Form Submission with Loading Overlay
            loginForm.addEventListener('submit', function(e) {
                const currentError = document.querySelector('.alert-danger');
                
                if (!currentError) {
                    document.getElementById('loadingOverlay').classList.add('active');
                    document.getElementById('loginBtn').disabled = true;
                }
                
                setTimeout(() => {
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay.classList.contains('active')) {
                        loadingOverlay.classList.remove('active');
                        document.getElementById('loginBtn').disabled = false;
                    }
                }, 3000);
            });

            // Check for logout notification
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('logged_out') && urlParams.get('logged_out') === '1') {
                // Show logout success toast at top right
                setTimeout(function() {
                    Swal.fire({
                        position: 'top-end',
                        icon: 'success',
                        title: 'Logged Out Successfully',
                        text: 'You have been logged out of the system',
                        toast: true,
                        showConfirmButton: false,
                        timer: 3000,
                        timerProgressBar: true,
                        didOpen: (toast) => {
                            toast.addEventListener('mouseenter', Swal.stopTimer)
                            toast.addEventListener('mouseleave', Swal.resumeTimer)
                        }
                    });
                    
                    // Remove the logged_out parameter from URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }, 300);
            }

            // Service Worker Registration
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('assets/js/admin-service-worker.js')
                    .then(registration => console.log('Service Worker registered'))
                    .catch(err => console.log('Service Worker registration failed:', err));
            }
        });
    </script>
</body>
</html>
