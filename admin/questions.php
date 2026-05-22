<?php
/**
 * Questions Management - Admin Console
 * Uses new API endpoints instead of direct database queries
 */

require_once '../includes/helpers.php';
require_once '../config/database.php';

initializeSession();
requireLogin();
requirePermission('manage_questions');
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Questions - Teacher Evaluation System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/dark-theme.css?v=2.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/global.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/components.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/pages/questions.css">
    <link rel="stylesheet" href="<?= ASSETS_URL ?>/css/skeleton-loader.css">
</head>
<body>
    <!-- Navbar -->
    <?php include '../includes/navbar.php'; ?>
    
    <!-- Skeleton Loader -->
    <div class="skeleton-loader loading" data-show-skeleton="true">
        <div class="container-fluid py-5">
            <div class="row mb-4">
                <div class="col-md-6">
                    <div style="height: 30px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px; margin-bottom: 10px;"></div>
                    <div style="height: 16px; width: 60%; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px;"></div>
                </div>
            </div>
            <div class="card border-0 shadow-sm">
                <div class="card-body">
                    <div style="height: 40px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px; margin-bottom: 15px;"></div>
                    <div style="height: 300px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: skeleton-loading 1.5s infinite; border-radius: 4px;"></div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Main Content Wrapper -->
    <div class="content-loader">
        <div class="container-fluid py-5">
            <div class="row mb-4">
                <div class="col-md-6">
                    <h1 class="h2"><i class="bi bi-question-circle"></i> Questions Management</h1>
                    <p class="text-muted">Manage evaluation questions and categories</p>
                </div>
                <div class="col-md-6 text-end">
                    <button class="btn btn-outline-secondary me-2" onclick="printQuestionsTable()">
                        <i class="bi bi-printer"></i> Print
                    </button>
                    <button class="btn btn-primary btn-lg" onclick="openQuestionModal()">
                        <i class="bi bi-plus-circle"></i> Add New Question
                    </button>
                </div>
            </div>

            <!-- Questions Table -->
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-light">
                    <h5 class="mb-0">All Questions</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="questionsTable" class="table table-hover mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>Question</th>
                                    <th>Order</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Question Modal -->
    <div class="modal fade" id="questionModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalTitle">Add New Question</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="questionForm">
                    <div class="modal-body">
                        <!-- Question Text -->
                        <div class="mb-3">
                            <label for="question_text" class="form-label">Question Text *</label>
                            <textarea 
                                class="form-control" 
                                id="question_text" 
                                name="question_text"
                                placeholder="Enter the question text"
                                rows="3"
                                required
                            ></textarea>
                        </div>

                        <!-- Display Order -->
                        <div class="mb-3">
                            <label for="display_order" class="form-label">Display Order (Auto)</label>
                            <input 
                                type="number" 
                                class="form-control" 
                                id="display_order" 
                                name="display_order"
                                min="1"
                                readonly
                            >
                            <small class="text-muted d-block mt-1">Automatically assigned based on question count</small>
                        </div>

                        <!-- Required Checkbox -->
                        <div class="mb-3 form-check">
                            <input 
                                type="checkbox" 
                                class="form-check-input" 
                                id="required" 
                                name="required"
                            >
                            <label class="form-check-label" for="required">
                                Required Question
                            </label>
                        </div>

                        <!-- Status -->
                        <div class="mb-3">
                            <label for="status" class="form-label">Status</label>
                            <select class="form-select" id="status" name="status">
                                <option value="active">Active (show in evaluation)</option>
                                <option value="inactive">Inactive (hide in evaluation)</option>
                            </select>
                        </div>

                        <!-- Rating Scale Descriptions -->
                        <div class="mb-4">
                            <label class="form-label fw-bold">Rating Scale Descriptions (Optional)</label>
                            <small class="text-muted d-block mb-3">Add descriptions for each rating level (1-5)</small>
                            
                            <div class="rating-scale-inputs">
                                <!-- Rating 1 -->
                                <div class="mb-2">
                                    <label for="rating_1" class="form-label form-label-sm">
                                        <span class="badge bg-danger">1</span> Lowest Rating
                                    </label>
                                    <input 
                                        type="text" 
                                        class="form-control form-control-sm" 
                                        id="rating_1" 
                                        name="rating_1"
                                        placeholder="e.g., Does not meet expectations"
                                        maxlength="80"
                                    >
                                </div>

                                <!-- Rating 2 -->
                                <div class="mb-2">
                                    <label for="rating_2" class="form-label form-label-sm">
                                        <span class="badge bg-warning">2</span> Below Average
                                    </label>
                                    <input 
                                        type="text" 
                                        class="form-control form-control-sm" 
                                        id="rating_2" 
                                        name="rating_2"
                                        placeholder="e.g., Below average / Needs improvement"
                                        maxlength="80"
                                    >
                                </div>

                                <!-- Rating 3 -->
                                <div class="mb-2">
                                    <label for="rating_3" class="form-label form-label-sm">
                                        <span class="badge bg-info">3</span> Average
                                    </label>
                                    <input 
                                        type="text" 
                                        class="form-control form-control-sm" 
                                        id="rating_3" 
                                        name="rating_3"
                                        placeholder="e.g., Meets expectations / Average"
                                        maxlength="80"
                                    >
                                </div>

                                <!-- Rating 4 -->
                                <div class="mb-2">
                                    <label for="rating_4" class="form-label form-label-sm">
                                        <span class="badge bg-success">4</span> Exceeds Expectations
                                    </label>
                                    <input 
                                        type="text" 
                                        class="form-control form-control-sm" 
                                        id="rating_4" 
                                        name="rating_4"
                                        placeholder="e.g., Exceeds expectations / Good"
                                        maxlength="80"
                                    >
                                </div>

                                <!-- Rating 5 -->
                                <div class="mb-2">
                                    <label for="rating_5" class="form-label form-label-sm">
                                        <span class="badge bg-success">5</span> Highest Rating
                                    </label>
                                    <input 
                                        type="text" 
                                        class="form-control form-control-sm" 
                                        id="rating_5" 
                                        name="rating_5"
                                        placeholder="e.g., Outstanding / Excellent"
                                        maxlength="80"
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="bi bi-save"></i> Save Question
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    </div>  <!-- Close main-content -->

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.7.0.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script src="<?= ASSETS_URL ?>/js/api-service.js?v=2"></script>
    <script src="<?= ASSETS_URL ?>/js/main.js"></script>
    <script src="<?= ASSETS_URL ?>/js/export-pdf.js"></script>
    <script src="<?= ASSETS_URL ?>/js/pages/questions.js"></script>
    
    <!-- Initialization Script -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Wait a tiny bit to ensure all scripts are loaded
            setTimeout(function() {
                const skeletonLoader = document.querySelector('.skeleton-loader');
                const contentLoader = document.querySelector('.content-loader');
                
                if (skeletonLoader) {
                    skeletonLoader.classList.remove('loading');
                    if (contentLoader) {
                        contentLoader.classList.add('active');
                    }
                }
                
                // Initialize the table
                if (typeof initializeQuestionsPage === 'function') {
                    initializeQuestionsPage();
                } else {
                    console.error('initializeQuestionsPage is not defined');
                }
            }, 100);
        });
    </script>
    
    <!-- Footer -->
    <?php include '../includes/footer.php'; ?>
</body>
</html>
