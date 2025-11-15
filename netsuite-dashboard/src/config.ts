// Centralized configuration for the NetSuite Dashboard
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://demodashboard-68zxune6c-pat-simmons-projects.vercel.app/api'
      : 'http://localhost:3004/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // App Configuration
  app: {
    name: 'NetSuite Resource Planner',
    version: '1.0.0',
    refreshInterval: 30000, // 30 seconds
    autoSaveInterval: 5000, // 5 seconds
    maxRecentItems: 10
  },
  
  // Feature Flags
  features: {
    realTimeSync: true,
    dataExport: true,
    advancedFiltering: true,
    dataVisualization: true,
    userPreferences: true,
    notifications: true
  },
  
  // Storage Keys
  storage: {
    preferences: 'netsuite_dashboard_preferences',
    favorites: 'netsuite_dashboard_favorites',
    recentItems: 'netsuite_dashboard_recent',
    demoNotes: 'netsuite_dashboard_notes',
    prospects: 'netsuite_dashboard_prospects'
  },
  
  // Chart Configuration
  charts: {
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      danger: '#EF4444',
      warning: '#F97316',
      info: '#06B6D4'
    },
    animations: {
      duration: 750,
      easing: 'easeInOutCubic'
    }
  }
} as const;

export type Config = typeof config;
