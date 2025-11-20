// Enhanced API service with retry logic and error handling
import { config } from './config';
import { ProjectRecord } from './types/dashboard';

const API_BASE_URL = config.api.baseUrl;

// TypeScript interfaces
export interface ScenarioData {
  id: number;
  name: string;
  industry: string;
  description: string;
  prompt: string;
  category: string;
  aiGenerated?: boolean;
  createdAt?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeFields?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface FilterOptions {
  industry?: string;
  category?: string;
  searchQuery?: string;
  aiGenerated?: boolean;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface ProjectSyncPayload {
  customerId: number;
  account: string;
  prompts: string[];
  notes?: string;
  website?: string;
  prospectName: string;
  industry: string;
  focusAreas?: string[];
}

/**
 * Fetch with retry logic and error handling
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries: number = config.api.retryAttempts): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as any)
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('This should never be reached');
}

/**
 * Enhanced API Service Class
 */
class APIService {
  /**
   * Generate AI-powered demo scenario
   */
  static async generateScenario(params: any): Promise<any> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/scenarios`, {
        method: 'POST',
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to generate scenario:', error);
      throw error;
    }
  }

  /**
   * Get available scenario templates
   */
  static async getTemplates(): Promise<any> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/scenarios`);
      return await response.json();
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      throw error;
    }
  }

  /**
   * Persist a scenario template to the managed API (optional)
   */
  static async saveTemplate(template: any): Promise<ApiResponse> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/scenarios/templates`, {
        method: 'POST',
        body: JSON.stringify(template)
      });
      return await response.json();
    } catch (error: any) {
      console.error('Failed to save template:', error);
      throw error;
    }
  }

  /**
   * Check API health status
   */
  static async checkHealth(): Promise<any> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error: any) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Real-time data synchronization
   */
  static async syncRealTimeData(): Promise<ApiResponse> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/sync/realtime`);
      return await response.json();
    } catch (error: any) {
      console.error('Real-time sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export data in various formats
   */
  static async exportData(options: ExportOptions): Promise<Blob> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/export`, {
        method: 'POST',
        body: JSON.stringify(options)
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      return await response.blob();
    } catch (error: any) {
      console.error('Data export failed:', error);
      throw error;
    }
  }

  /**
   * Get filtered scenarios
   */
  static async getFilteredScenarios(filters: FilterOptions): Promise<ApiResponse<ScenarioData[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.industry) queryParams.append('industry', filters.industry);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.searchQuery) queryParams.append('search', filters.searchQuery);
      if (filters.aiGenerated !== undefined) queryParams.append('aiGenerated', String(filters.aiGenerated));
      
      const response = await fetchWithRetry(`${API_BASE_URL}/scenarios/filter?${queryParams}`);
      return await response.json();
    } catch (error: any) {
      console.error('Filtered scenarios fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get analytics data
   */
  static async getAnalytics(): Promise<ApiResponse> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/analytics`);
      return await response.json();
    } catch (error: any) {
      console.error('Analytics fetch failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync NetSuite project records and tasks via backend
   */
  static async syncProject(payload: ProjectSyncPayload): Promise<ApiResponse<ProjectRecord>> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/projects/sync`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return await response.json();
    } catch (error: any) {
      console.error('Project sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate API configuration
   */
  static async validateConfiguration(): Promise<any> {
    try {
      const health = await this.checkHealth();
      return {
        isValid: true,
        apiStatus: health.status,
        timestamp: health.timestamp,
        features: health.features || []
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default APIService;
