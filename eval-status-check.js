/**
 * Evaluation Status Check - PWE Version
 * Stores evaluation status for Flutter to use
 * Flutter UI will display "Evaluations Closed" message if needed
 */

(function() {
  'use strict';

  async function checkEvaluationStatus() {
    try {
      const baseUrl = window.location.origin;
      const pathname = window.location.pathname;
      // Handle both /teacher-eval/ and root deployments
      const basePath = pathname.includes('/teacher-eval/') ? '/teacher-eval' : '';
      const url = `${baseUrl}${basePath}/index.php?request=api/evaluations/status`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          return { is_open: data.data.is_open ?? false, status: data.data.status ?? 'off' };
        }
      }
    } catch (error) {
      console.error('[EvalCheck] Error checking status:', error.message);
    }
    
    // Default to OFF (safer)
    return { is_open: false, status: 'off' };
  }

  async function init() {
    const status = await checkEvaluationStatus();
    window.__evaluationsOpen = status.is_open;
    window.__evaluationStatus = status.status;
    console.log('[EvalCheck] Evaluation status:', status);
  }

  init();
})();
