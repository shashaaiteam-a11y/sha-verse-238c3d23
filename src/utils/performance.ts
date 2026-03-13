// Performance monitoring utilities for Bookshelf module
import { toast } from "sonner";

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private startTime: number = Date.now();

  // Track component render times
  trackRender(componentName: string, renderTime: number) {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)?.push(renderTime);
    
    // Log slow renders (>16ms - one frame)
    if (renderTime > 16) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime}ms`);
    }
  }

  // Track API response times
  trackApiCall(apiName: string, responseTime: number) {
    const key = `api_${apiName}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)?.push(responseTime);
    
    // Log slow API calls (>1000ms)
    if (responseTime > 1000) {
      console.warn(`Slow API call detected: ${apiName} took ${responseTime}ms`);
    }
  }

  // Track user interactions
  trackInteraction(interactionName: string) {
    const key = `interaction_${interactionName}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    // Store timestamp of interaction
    this.metrics.get(key)?.push(Date.now() - this.startTime);
  }

  // Get performance statistics
  getStats() {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((times, key) => {
      if (times.length > 0) {
        const sum = times.reduce((a, b) => a + b, 0);
        stats[key] = {
          avg: sum / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          count: times.length
        };
      }
    });
    
    return stats;
  }

  // Log performance summary
  logSummary() {
    const stats = this.getStats();
    console.log('=== Bookshelf Performance Summary ===');
    console.table(stats);
    
    // Check for performance issues
    Object.entries(stats).forEach(([key, stat]) => {
      if (key.startsWith('api_') && stat.avg > 500) {
        toast.warning(`Slow API detected: ${key.replace('api_', '')} average ${stat.avg.toFixed(1)}ms`);
      }
      if (key.startsWith('render_') && stat.avg > 30) {
        toast.warning(`Slow component detected: ${key.replace('render_', '')} average ${stat.avg.toFixed(1)}ms`);
      }
    });
  }

  // Reset metrics
  reset() {
    this.metrics.clear();
    this.startTime = Date.now();
  }
}

// Global performance monitor instance
export const perfMonitor = new PerformanceMonitor();

// Hook for measuring component render times
export const useRenderTimer = (componentName: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const renderTime = end - start;
    perfMonitor.trackRender(componentName, renderTime);
  };
};

// Utility for measuring API calls
export const measureApiCall = async <T>(
  apiName: string,
  apiFunction: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await apiFunction();
    const end = performance.now();
    perfMonitor.trackApiCall(apiName, end - start);
    return result;
  } catch (error) {
    const end = performance.now();
    perfMonitor.trackApiCall(apiName, end - start);
    throw error;
  }
};

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).perfMonitor = perfMonitor;
}