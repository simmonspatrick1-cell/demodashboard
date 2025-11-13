// API Service for NetSuite Demo Dashboard - Serverless Vercel Functions
const API_BASE_URL = 'https://demodashboard-2uuy2211s-pat-simmons-projects.vercel.app/api';

/**
 * Fetch with retry logic and error handling
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

/**
 * API Service Class
 */
class APIService {
  /**
   * Check API health status
   */
  static async checkHealth() {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  /**
   * Get available scenario templates
   */
  static async getScenarioTemplates() {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/scenarios`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered demo scenario
   * @param {Object} params - Scenario parameters
   * @param {string} params.template - Template ID
   * @param {string} params.companyName - Company name
   * @param {string} params.industry - Industry type
   * @param {string} params.customization - Custom requirements
   */
  static async generateScenario(params) {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/scenarios`, {
        method: 'POST',
        body: JSON.stringify(params)
      });
      return await response.json();
    } catch (error) {
      console.error('Scenario generation failed:', error);
      throw error;
    }
  }

  /**
   * Transform scenario data for UI compatibility
   */
  static transformScenarioData(scenarioData) {
    if (!scenarioData || !scenarioData.scenario) {
      return null;
    }

    const { scenario } = scenarioData;
    
    // Handle both AI-generated and fallback data structures
    const companyInfo = scenario.companyOverview || scenario.company_info;
    const companyName = companyInfo?.name || scenarioData.template?.name || 'Generated Company';
    const industry = companyInfo?.industry || scenarioData.template?.industry || 'Professional Services';
    
    return {
      id: Date.now(),
      name: companyName,
      entityid: `${companyName.replace(/[^a-zA-Z0-9]/g, '')}-Demo`,
      industry: industry,
      size: `${companyInfo?.employeeCount || scenario.resources?.length || 25}+`,
      status: 'AI Generated',
      demoDate: new Date().toLocaleDateString(),
      focus: scenario.keyFeatures?.slice(0, 3) || ['Resource Planning', 'Project Management', 'Reporting'],
      budget: companyInfo?.annualRevenue || `$${Math.floor(scenario.projects?.length * 150000 || 500000)}K`,
      nsId: Math.floor(Math.random() * 9000) + 1000, // Random ID for demo
      aiGenerated: true,
      fullScenario: scenario,
      method: scenarioData.method || 'unknown'
    };
  }

  /**
   * Get random demo enhancement
   */
  static getRandomEnhancement() {
    const enhancements = [
      'Multi-entity consolidation scenarios',
      'Advanced project accounting workflows',
      'Resource utilization optimization',
      'Custom field automation examples',
      'Revenue recognition scenarios',
      'Billing and invoicing automation',
      'Time tracking and expense management',
      'Financial reporting and dashboards'
    ];
    
    return enhancements[Math.floor(Math.random() * enhancements.length)];
  }

  /**
   * Validate API configuration
   */
  static async validateConfiguration() {
    try {
      const health = await this.checkHealth();
      return {
        isValid: true,
        apiStatus: health.status,
        timestamp: health.timestamp,
        features: health.features || []
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default APIService;