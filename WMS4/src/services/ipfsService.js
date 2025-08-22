import api from './api';

// Service for IPFS file uploads and management
export const ipfsService = {
  
  // Upload file to IPFS
  uploadFile: async (file, description = '') => {
    try {
      console.log('🚀 IPFS Service: Starting file upload...');
      console.log('📎 IPFS Service: File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      if (description) {
        formData.append('description', description);
      }

      console.log('📤 IPFS Service: Sending upload request...');

      const response = await api.post('/ipfs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 150000, // Increased to 2.5 minutes to match backend
      });

      console.log('✅ IPFS Service: Upload successful:', response.data);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: response.data.data
      };

    } catch (error) {
      console.error('❌ IPFS Service: Upload error:', error);
      
      let errorMessage = 'Failed to upload file to IPFS';
      
      if (error.response?.data?.message) {
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

  // Get user's IPFS uploads
  getUserUploads: async () => {
    try {
      console.log('📥 IPFS Service: Fetching user uploads...');

      const response = await api.get('/ipfs/uploads');

      console.log('✅ IPFS Service: API Response received');
      console.log('📊 IPFS Service: Response status:', response.status);
      console.log('📋 IPFS Service: Response data:', response.data);

      // Use the same pattern as deviceService - expect response.data to contain the array directly
      return {
        success: true,
        data: response.data.data || [], // Backend returns { success: true, data: [...] }
        message: 'Uploads fetched successfully'
      };

    } catch (error) {
      console.error('❌ IPFS Service: Get uploads error:', error);
      console.error('❌ IPFS Service: Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch uploads';
      
      return {
        success: false,
        message: errorMessage,
        data: []
      };
    }
  },

  // Get all IPFS uploads (admin only)
  getAllUploads: async () => {
    try {
      console.log('📥 IPFS Service: Fetching all uploads (admin)...');

      const response = await api.get('/admin/ipfs/uploads');

      console.log('✅ IPFS Service: All uploads fetched successfully:', response.data);

      return {
        success: true,
        data: response.data.data || [],
        message: 'All uploads fetched successfully'
      };

    } catch (error) {
      console.error('❌ IPFS Service: Get all uploads error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to fetch all uploads';
      
      return {
        success: false,
        message: errorMessage,
        data: []
      };
    }
  },

  // Delete IPFS upload record
  deleteUpload: async (uploadId) => {
    try {
      console.log('🗑️ IPFS Service: Deleting upload:', uploadId);

      const response = await api.delete(`/ipfs/uploads/${uploadId}`);

      console.log('✅ IPFS Service: Upload deleted successfully:', response.data);

      return {
        success: true,
        message: response.data.message || 'Upload deleted successfully'
      };

    } catch (error) {
      console.error('❌ IPFS Service: Delete upload error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to delete upload';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Utility function to get IPFS URL from hash
  getIPFSUrl: (ipfsHash) => {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  },

  // Utility function to format file size
  formatFileSize: (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Utility function to validate file before upload
  validateFile: (file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only PDF, JPEG, and PNG files are allowed'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 10MB'
      };
    }

    return {
      valid: true,
      error: null
    };
  }
};