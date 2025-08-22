import api from './api';

// Service for e-waste disposal requests
export const disposalService = {
  
  // Create a new e-waste disposal request
  createRequest: async (requestData) => {
    try {
      console.log('🚀 FRONTEND: Starting disposal request creation...');
      console.log('📋 FRONTEND: Input request data:', JSON.stringify(requestData, null, 2));
      
      // Get current user data
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('👤 FRONTEND: User data from localStorage:', JSON.stringify(userData, null, 2));
      
      // Transform form data to match EXACT backend expectations
      const backendData = {
        department: userData.department || 'Unknown Department',
        contact_name: userData.name || userData.username || 'Unknown Contact',
        contact_phone: requestData.contactPhone || requestData.contact_phone,
        contact_email: userData.email || 'user@example.com',
        pickup_address: requestData.fullAddress || requestData.pickupAddress || requestData.pickup_address,
        latitude: parseFloat(requestData.latitude),
        longitude: parseFloat(requestData.longitude),
        e_waste_description: requestData.e_waste_description || 
                           (requestData.selectedDevices && requestData.selectedDevices.length > 0 
                             ? requestData.selectedDevices.map(device => 
                                 `${device.device_type} - ${device.device_name} (${device.brand || 'Unknown Brand'})`
                               ).join('; ')
                             : 'E-waste disposal request'),
        weight_kg: requestData.weight_kg || null,
        item_count: requestData.selectedDevices?.length || requestData.item_count || 1,
        preferred_date: requestData.preferredDate || requestData.preferred_date || null,
        preferred_time_slot: requestData.preferredTimeSlot || requestData.preferred_time_slot || null,
        additional_notes: requestData.specialInstructions || requestData.additional_notes || null,
        estimated_value: requestData.estimated_value || null
      };

      console.log('🔄 FRONTEND: Transformed backend data:', JSON.stringify(backendData, null, 2));

      // Ensure required fields are not null/undefined
      const requiredFields = {
        contact_phone: backendData.contact_phone,
        pickup_address: backendData.pickup_address,
        latitude: backendData.latitude,
        longitude: backendData.longitude,
        e_waste_description: backendData.e_waste_description
      };

      console.log('✅ FRONTEND: Checking required fields:', JSON.stringify(requiredFields, null, 2));

      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value && value !== 0) {
          const error = `Required field '${field}' is missing or empty: ${value}`;
          console.error('❌ FRONTEND: Validation error:', error);
          throw new Error(error);
        }
      }

      // Check if coordinates are valid numbers
      if (isNaN(backendData.latitude) || isNaN(backendData.longitude)) {
        const error = `Invalid coordinates - lat: ${backendData.latitude}, lng: ${backendData.longitude}`;
        console.error('❌ FRONTEND: Coordinate error:', error);
        throw new Error(error);
      }

      console.log('📤 FRONTEND: Sending POST request to /disposal/request');
      console.log('📡 FRONTEND: Request URL:', '/disposal/request');
      console.log('📋 FRONTEND: Final payload:', JSON.stringify(backendData, null, 2));

      const response = await api.post('/disposal/request', backendData);
      
      console.log('✅ FRONTEND: Backend response received:', JSON.stringify(response.data, null, 2));
      console.log('📊 FRONTEND: Response status:', response.status);
      console.log('📊 FRONTEND: Response headers:', JSON.stringify(response.headers, null, 2));
      
      return {
        success: true,
        message: 'Disposal request created successfully',
        data: response.data
      };
    } catch (error) {
      console.error('❌ FRONTEND: Disposal request error occurred');
      console.error('❌ FRONTEND: Error type:', typeof error);
      console.error('❌ FRONTEND: Error message:', error.message);
      console.error('❌ FRONTEND: Full error object:', error);
      
      if (error.response) {
        console.error('❌ FRONTEND: HTTP Error Response:');
        console.error('📊 FRONTEND: Status:', error.response.status);
        console.error('📊 FRONTEND: Status Text:', error.response.statusText);
        console.error('📋 FRONTEND: Response data:', JSON.stringify(error.response.data, null, 2));
        console.error('📊 FRONTEND: Response headers:', JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('❌ FRONTEND: Network Error - No response received');
        console.error('📡 FRONTEND: Request:', error.request);
      } else {
        console.error('❌ FRONTEND: Request setup error:', error.message);
      }
      
      let errorMessage = 'Failed to create disposal request';
      
      if (error.response?.data?.errors) {
        // Validation errors from backend
        const validationErrors = error.response.data.errors.map(err => err.msg).join(', ');
        errorMessage = `Validation errors: ${validationErrors}`;
        console.error('❌ FRONTEND: Validation errors:', validationErrors);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        console.error('❌ FRONTEND: Backend error message:', errorMessage);
      } else if (error.message) {
        errorMessage = error.message;
        console.error('❌ FRONTEND: JavaScript error:', errorMessage);
      }
      
      console.error('❌ FRONTEND: Final error message to user:', errorMessage);
      
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