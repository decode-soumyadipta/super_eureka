import api from './api.js';

class DeviceService {
    // Register a new device
    async registerDevice(deviceData) {
        try {
            const response = await api.post('/devices/register', deviceData);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get devices for current user's department
    async getDepartmentDevices() {
        try {
            const response = await api.get('/devices');
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get dashboard statistics for department
    async getDepartmentStats() {
        try {
            const response = await api.get('/departments/stats');
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get device by ID
    async getDeviceById(deviceId) {
        try {
            const response = await api.get(`/devices/${deviceId}`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Update device information
    async updateDevice(deviceId, updateData) {
        try {
            const response = await api.put(`/devices/${deviceId}`, updateData);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Delete device
    async deleteDevice(deviceId) {
        try {
            const response = await api.delete(`/devices/${deviceId}`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Scan QR code to get device info
    async scanQRCode(qrCode) {
        try {
            const response = await api.post('/devices/scan', { qr_code: qrCode });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Record device action (maintenance, repair, etc.)
    async recordAction(deviceId, actionData) {
        try {
            const response = await api.post(`/devices/${deviceId}/actions`, actionData);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get device action history
    async getActionHistory(deviceId) {
        try {
            const response = await api.get(`/devices/${deviceId}/actions`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Update device location
    async updateLocation(deviceId, location) {
        try {
            const response = await api.put(`/devices/${deviceId}/location`, { 
                current_location: location 
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Update device condition
    async updateCondition(deviceId, condition, notes = '') {
        try {
            const response = await api.put(`/devices/${deviceId}/condition`, { 
                condition_status: condition,
                notes: notes
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get devices needing maintenance
    async getMaintenanceDevices() {
        try {
            const response = await api.get('/devices/maintenance');
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Search devices
    async searchDevices(searchParams) {
        try {
            const queryString = new URLSearchParams(searchParams).toString();
            const response = await api.get(`/devices/search?${queryString}`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get device types
    async getDeviceTypes() {
        try {
            const response = await api.get('/devices/types');
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Generate device report
    async generateReport(reportType, filters = {}) {
        try {
            const response = await api.post('/devices/report', {
                type: reportType,
                filters: filters
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Export devices data
    async exportDevices(format = 'csv', filters = {}) {
        try {
            const response = await api.post('/devices/export', {
                format: format,
                filters: filters
            }, {
                responseType: 'blob' // For file download
            });
            return response;
        } catch (error) {
            throw error;
        }
    }
}

export const deviceService = new DeviceService();

// Admin service for admin-only operations
export const adminService = {
    // Get all users (admin only)
    getAllUsers: async () => {
        try {
            const response = await api.get('/admin/users');
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get all devices across departments (admin only)
    getAllDevices: async () => {
        try {
            const response = await api.get('/admin/devices');
            return response;
        } catch (error) {
            throw error;
        }
    }
};

export default deviceService;