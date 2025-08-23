import api from './api.js';

class ResourceExchangeService {
    // Create a new resource exchange request
    async createRequest(requestData) {
        try {
            const response = await api.post('/resource-exchange/requests', requestData);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get all resource exchange requests
    async getRequests(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.department) queryParams.append('department', filters.department);
            
            const url = `/resource-exchange/requests${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
            const response = await api.get(url);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get user's own resource requests
    async getMyRequests() {
        try {
            const response = await api.get('/resource-exchange/my-requests');
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get resource exchange request by ID
    async getRequestById(requestId) {
        try {
            const response = await api.get(`/resource-exchange/requests/${requestId}`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Create a response to a resource exchange request
    async createResponse(requestId, responseData) {
        try {
            const response = await api.post(`/resource-exchange/requests/${requestId}/responses`, responseData);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Update response status (accept/reject)
    async updateResponseStatus(responseId, status) {
        try {
            const response = await api.put(`/resource-exchange/responses/${responseId}/status`, { status });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Helper function to format urgency
    formatUrgency(urgency) {
        const urgencyMap = {
            low: { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100' },
            medium: { label: 'Medium', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
            high: { label: 'High', color: 'text-red-600', bgColor: 'bg-red-100' }
        };
        return urgencyMap[urgency] || urgencyMap.medium;
    }

    // Helper function to format status
    formatStatus(status) {
        const statusMap = {
            open: { label: 'Open', color: 'text-blue-600', bgColor: 'bg-blue-100' },
            matched: { label: 'Matched', color: 'text-green-600', bgColor: 'bg-green-100' },
            completed: { label: 'Completed', color: 'text-gray-600', bgColor: 'bg-gray-100' },
            cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' }
        };
        return statusMap[status] || statusMap.open;
    }
}

export const resourceExchangeService = new ResourceExchangeService();
export default resourceExchangeService;