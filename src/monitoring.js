/**
 * Production Monitoring & Analytics Utility
 * Lightweight monitoring without external dependencies
 */

class Monitor {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.apiUrl = import.meta.env.VITE_API_URL || '';
    this.errors = [];
    this.metrics = {
      pageViews: 0,
      apiCalls: 0,
      errors: 0,
      performance: []
    };

    if (this.isProduction) {
      this.init();
    }
  }

  init() {
    // Track unhandled errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'runtime_error',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack
      });
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandled_rejection',
        message: event.reason?.message || event.reason,
        stack: event.reason?.stack
      });
    });

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.metrics.pageViews++;
      }
    });

    // Initial page view
    this.metrics.pageViews++;
    this.logEvent('page_view', { url: window.location.pathname });
  }

  /**
   * Log an error to monitoring system
   */
  logError(error) {
    this.metrics.errors++;
    this.errors.push({
      ...error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Keep only last 50 errors in memory
    if (this.errors.length > 50) {
      this.errors.shift();
    }

    // In production, send to backend
    if (this.isProduction) {
      this.sendToBackend('/api/monitoring/error', error);
    }

    // Always log to console in non-production
    if (!this.isProduction) {
      console.error('[Monitor] Error:', error);
    }
  }

  /**
   * Log a custom event
   */
  logEvent(eventName, data = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      data
    };

    if (!this.isProduction) {
      console.log('[Monitor] Event:', event);
    }
  }

  /**
   * Track API call performance
   */
  trackApiCall(endpoint, duration, status) {
    this.metrics.apiCalls++;
    this.metrics.performance.push({
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 performance metrics
    if (this.metrics.performance.length > 100) {
      this.metrics.performance.shift();
    }

    // Log slow API calls (>2s)
    if (duration > 2000) {
      this.logEvent('slow_api_call', { endpoint, duration, status });
    }
  }

  /**
   * Track user interaction
   */
  trackInteraction(action, details = {}) {
    this.logEvent('user_interaction', {
      action,
      ...details
    });
  }

  /**
   * Get current metrics summary
   */
  getMetrics() {
    const avgResponseTime = this.metrics.performance.length > 0
      ? this.metrics.performance.reduce((sum, m) => sum + m.duration, 0) / this.metrics.performance.length
      : 0;

    return {
      pageViews: this.metrics.pageViews,
      apiCalls: this.metrics.apiCalls,
      errors: this.metrics.errors,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: this.metrics.apiCalls > 0
        ? ((this.metrics.errors / this.metrics.apiCalls) * 100).toFixed(2)
        : 0
    };
  }

  /**
   * Send data to backend (non-blocking)
   */
  async sendToBackend(endpoint, data) {
    try {
      // Use sendBeacon for non-blocking send
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(this.apiUrl + endpoint, blob);
      } else {
        // Fallback to fetch
        fetch(this.apiUrl + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive: true
        }).catch(() => {
          // Silently fail - monitoring shouldn't break the app
        });
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Helper to wrap async functions with monitoring
   */
  async wrapAsync(fn, name) {
    const startTime = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      this.trackApiCall(name, duration, 'success');
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.trackApiCall(name, duration, 'error');
      this.logError({
        type: 'async_error',
        message: error.message,
        stack: error.stack,
        function: name
      });
      throw error;
    }
  }
}

// Create singleton instance
const monitor = new Monitor();

// Export for use in app
export default monitor;

// Helper functions
export const logError = (error) => monitor.logError(error);
export const logEvent = (event, data) => monitor.logEvent(event, data);
export const trackApiCall = (endpoint, duration, status) => monitor.trackApiCall(endpoint, duration, status);
export const trackInteraction = (action, details) => monitor.trackInteraction(action, details);
export const getMetrics = () => monitor.getMetrics();
export const wrapAsync = (fn, name) => monitor.wrapAsync(fn, name);
