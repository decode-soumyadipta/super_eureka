import api from './api';

// Service for e-waste disposal requests
export const disposalService = {
  
  // Create a new e-waste disposal request
  createRequest: async (requestData) => {
    try {
      // Get current user data
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Transform form data to match EXACT backend expectations
      const backendData = {
        department: userData.department || 'Unknown Department',
        contact_name: userData.name || 'Unknown Contact',
        contact_phone: requestData.contactPhone || requestData.contact_phone,
        contact_email: userData.email || 'user@example.com',
        pickup_address: requestData.pickupAddress || requestData.pickup_address,
        latitude: parseFloat(requestData.latitude),
        longitude: parseFloat(requestData.longitude),
        e_waste_description: requestData.e_waste_description || 'E-waste disposal request',
        weight_kg: requestData.weight_kg || null,
        item_count: requestData.selectedDevices?.length || 1,
        preferred_date: requestData.preferredDate || requestData.preferred_date,
        preferred_time_slot: requestData.preferredTimeSlot || requestData.preferred_time_slot,
        additional_notes: requestData.specialInstructions || requestData.additional_notes
      };

      console.log('Sending disposal request to backend:', backendData);

      const response = await api.post('/disposal/request', backendData);
      console.log('Backend response:', response.data);
      
      return {
        success: true,
        message: 'Disposal request created successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Disposal request error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to create disposal request';
      
      if (error.response?.data?.errors) {
        // Validation errors from backend
        errorMessage = error.response.data.errors.map(err => err.msg).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },
  
  // Get all disposal requests
  getRequests: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      
      const url = `/disposal/requests${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      console.log('Fetching disposal requests from:', url);
      
      const response = await api.get(url);
      console.log('Disposal requests response:', response.data);
      
      return {
        success: true,
        data: response.data.data || response.data || [],
        message: 'Requests fetched successfully'
      };
    } catch (error) {
      console.error('Fetch disposal requests error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch disposal requests';
      
      return {
        success: false,
        message: errorMessage,
        data: []
      };
    }
  },
  
  // Get a single disposal request by ID
  getRequestById: async (requestId) => {
    try {
      const response = await api.get(`/disposal/requests/${requestId}`);
      return {
        success: true,
        data: response.data.data || response.data,
        message: 'Request fetched successfully'
      };
    } catch (error) {
      console.error('Fetch disposal request error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch disposal request';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },
  
  // Update request status (for vendors/admins)
  updateRequestStatus: async (requestId, statusData) => {
    try {
      const response = await api.put(`/disposal/requests/${requestId}/status`, statusData);
      return {
        success: true,
        data: response.data,
        message: 'Request status updated successfully'
      };
    } catch (error) {
      console.error('Update disposal status error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to update request status';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }
};