import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Backend server URL
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        console.error('API Error:', error);
        
        // Handle common error scenarios
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            
            if (status === 401) {
                // Unauthorized - clear auth and redirect to login
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/Login';
            }
            
            // Return formatted error
            return Promise.reject({
                message: data.message || data.error || 'Server error',
                status: status,
                errors: data.errors || []
            });
        } else if (error.request) {
            // Network error
            return Promise.reject({
                message: 'Unable to connect to server. Please check your connection.',
                status: 0
            });
        } else {
            // Other error
            return Promise.reject({
                message: error.message || 'An unexpected error occurred',
                status: 0
            });
        }
    }
);

export default api;