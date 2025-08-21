import api from './api.js';

class AuthService {
    // Login user
    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials);
            
            if (response.success && response.data.token) {
                // Store token and user data
                localStorage.setItem('authToken', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                
                return response;
            }
            
            throw new Error(response.message || 'Login failed');
        } catch (error) {
            throw error;
        }
    }

    // Register new user
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Logout user
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        return !!(token && user);
    }

    // Get current user data
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }

    // Get user profile (to verify token is still valid)
    async getProfile() {
        try {
            const response = await api.get('/auth/profile');
            
            if (response.success) {
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(response.data.user));
                return response;
            }
            
            throw new Error(response.message || 'Failed to fetch profile');
        } catch (error) {
            throw error;
        }
    }

    // Update user profile
    async updateProfile(profileData) {
        try {
            const response = await api.put('/auth/profile', profileData);
            
            if (response.success) {
                // Update stored user data
                localStorage.setItem('user', JSON.stringify(response.data.user));
                return response;
            }
            
            throw new Error(response.message || 'Failed to update profile');
        } catch (error) {
            throw error;
        }
    }

    // Change password
    async changePassword(passwordData) {
        try {
            const response = await api.put('/auth/change-password', passwordData);
            return response;
        } catch (error) {
            throw error;
        }
    }
}

export const authService = new AuthService();