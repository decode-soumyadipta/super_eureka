import api from './api';

// Service for analytics and dashboard insights
export const analyticsService = {
  
  // Get comprehensive dashboard analytics
  getDashboardAnalytics: async () => {
    try {
      console.log('📊 Analytics Service: Fetching dashboard analytics...');

      const response = await api.get('/analytics/dashboard');

      console.log('✅ Analytics Service: Dashboard analytics received:', response);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch dashboard analytics');
      }

      return {
        success: true,
        data: response.data,
        message: 'Dashboard analytics fetched successfully'
      };

    } catch (error) {
      console.error('❌ Analytics Service: Dashboard analytics error:', error);
      
      const errorMessage = error.message || 'Failed to fetch dashboard analytics';
      
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
  },

  // Get device utilization insights
  getDeviceUtilization: async () => {
    try {
      console.log('📊 Analytics Service: Fetching device utilization...');

      const response = await api.get('/analytics/utilization');

      console.log('✅ Analytics Service: Device utilization received:', response);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch device utilization');
      }

      return {
        success: true,
        data: response.data,
        message: 'Device utilization fetched successfully'
      };

    } catch (error) {
      console.error('❌ Analytics Service: Device utilization error:', error);
      
      const errorMessage = error.message || 'Failed to fetch device utilization';
      
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
  },

  // Get sustainability metrics
  getSustainabilityMetrics: async () => {
    try {
      console.log('📊 Analytics Service: Fetching sustainability metrics...');

      const response = await api.get('/analytics/sustainability');

      console.log('✅ Analytics Service: Sustainability metrics received:', response);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch sustainability metrics');
      }

      return {
        success: true,
        data: response.data,
        message: 'Sustainability metrics fetched successfully'
      };

    } catch (error) {
      console.error('❌ Analytics Service: Sustainability metrics error:', error);
      
      const errorMessage = error.message || 'Failed to fetch sustainability metrics';
      
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
  },

  // Utility function to format numbers with proper locale
  formatNumber: (number) => {
    if (typeof number !== 'number') return '0';
    return number.toLocaleString();
  },

  // Utility function to format percentages
  formatPercentage: (value, decimals = 1) => {
    if (typeof value !== 'number') return '0%';
    return `${value.toFixed(decimals)}%`;
  },

  // Utility function to format dates for charts
  formatChartDate: (dateString) => {
    const date = new Date(dateString + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  },

  // Utility function to calculate growth rate
  calculateGrowthRate: (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }
};