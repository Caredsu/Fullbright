/**
 * Loading Screen Manager
 * Handles the loading screen display/hide during app initialization
 */

(function() {
  'use strict';

  const loadingScreen = {
    element: null,
    progressBar: null,
    progressInterval: null,
    flutterCheckInterval: null,
    hasCompleted: false,
    startTime: null,
    minDisplayTime: 2500, // Minimum 2.5 seconds display time (in milliseconds)

    init() {
      this.startTime = Date.now(); // Record start time
      this.element = document.getElementById('loading-screen');
      this.progressBar = document.querySelector('.progress-bar');
      
      if (!this.element) {
        console.warn('[LoadingScreen] Loading screen element not found');
        return;
      }

      console.log('[LoadingScreen] Initialized - Professional Version');
      
      // Simulate realistic progress
      this.simulateProgress();

      // Monitor for Flutter readiness
      this.watchForFlutterReady();
    },

    simulateProgress() {
      let progress = 0;
      let speed = 150; // milliseconds between updates
      
      this.progressInterval = setInterval(() => {
        // Slower at start, faster in middle, slower at end
        let increment;
        if (progress < 30) {
          increment = Math.random() * 12;
        } else if (progress < 70) {
          increment = Math.random() * 15;
        } else {
          increment = Math.random() * 5;
        }
        
        progress += increment;
        if (progress > 80) progress = 80; // Slower to reach 100%
        
        if (this.progressBar) {
          this.progressBar.style.width = Math.floor(progress) + '%';
        }

        if (progress >= 80) {
          clearInterval(this.progressInterval);
        }
      }, speed);
    },

    watchForFlutterReady() {
      let checks = 0;
      const maxChecks = 100; // Maximum ~20 seconds with 200ms interval
      
      this.flutterCheckInterval = setInterval(() => {
        checks++;
        
        // Check if minimum display time has passed
        const elapsedTime = Date.now() - this.startTime;
        const minTimeReached = elapsedTime >= this.minDisplayTime;
        
        if (minTimeReached) {
          // Check if Flutter has rendered content
          const canvas = document.querySelector('canvas');
          const flutterAppContainer = document.querySelector('[data-dart-app]') || 
                                     document.querySelector('flt-glass-pane');
          const hasFlutterContent = canvas || flutterAppContainer || document.body.children.length > 1;
          
          if (hasFlutterContent || checks >= maxChecks) {
            clearInterval(this.flutterCheckInterval);
            this.complete();
          }
        }
      }, 200);
    },

    complete() {
      if (this.hasCompleted) return;
      this.hasCompleted = true;

      // Clear intervals
      if (this.progressInterval) clearInterval(this.progressInterval);
      if (this.flutterCheckInterval) clearInterval(this.flutterCheckInterval);

      if (!this.element) return;

      // Complete the progress bar to 100%
      if (this.progressBar) {
        this.progressBar.classList.add('complete');
        this.progressBar.style.width = '100%';
      }

      // Fade out after a brief pause
      setTimeout(() => {
        this.element.classList.add('hidden');
        console.log('[LoadingScreen] Hidden - App loaded');
        
        // Remove from DOM after transition completes
        setTimeout(() => {
          if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
          }
        }, 600);
      }, 200);
    },

    // Public method for Flutter to call when ready
    hide() {
      this.complete();
    }
  };

  // Initialize loading screen when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadingScreen.init();
    });
  } else {
    loadingScreen.init();
  }

  // Expose to window for Flutter to access
  window._loadingScreen = loadingScreen;
})();
