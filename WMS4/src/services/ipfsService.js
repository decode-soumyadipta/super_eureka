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

      console.log('✅ IPFS Service: Upload response received:', JSON.stringify(response, null, 2));

      // Since API interceptor returns response.data directly, we work with that
      if (!response) {
        console.error('❌ IPFS Service: No response received');
        throw new Error('No response from server');
      }

      if (!response.success) {
        console.error('❌ IPFS Service: Backend returned error:', response.message);
        throw new Error(response.message || 'Upload failed');
      }

      // Validate that we received valid IPFS data
      const uploadData = response.data;
      console.log('📋 IPFS Service: Upload data received:', uploadData);

      if (!uploadData || !uploadData.ipfsHash || uploadData.ipfsHash === 'undefined' || uploadData.ipfsHash === 'unknown') {
        console.error('❌ IPFS Service: Invalid IPFS hash received:', uploadData);
        throw new Error('Invalid IPFS hash received from server');
      }

      console.log('✅ IPFS Service: Valid upload data received:', uploadData);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: uploadData
      };

    } catch (error) {
      console.error('❌ IPFS Service: Upload error:', error);
      console.error('❌ IPFS Service: Error stack:', error.stack);
      
      let errorMessage = 'Failed to upload file to IPFS';
      
      if (error.message) {
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
      console.log('📋 IPFS Service: Full response object:', JSON.stringify(response, null, 2));

      // Since API interceptor returns response.data directly, we work with that
      if (!response) {
        console.error('❌ IPFS Service: No response received');
        throw new Error('No data in response');
      }

      if (!response.success) {
        console.error('❌ IPFS Service: Backend returned error:', response.message);
        throw new Error(response.message || 'Backend request failed');
      }

      // Extract the uploads array (response is already response.data due to interceptor)
      const uploadsArray = response.data;
      console.log('📋 IPFS Service: Uploads array:', uploadsArray);
      console.log('📊 IPFS Service: Uploads array type:', typeof uploadsArray);
      console.log('📊 IPFS Service: Is array?', Array.isArray(uploadsArray));

      if (!Array.isArray(uploadsArray)) {
        console.error('❌ IPFS Service: uploads data is not an array:', uploadsArray);
        throw new Error('Invalid data format - expected array');
      }

      console.log('✅ IPFS Service: Found', uploadsArray.length, 'uploads');

      // Debug each upload record
      uploadsArray.forEach((upload, index) => {
        console.log(`📋 IPFS Service: Upload ${index + 1}:`, {
          id: upload.id,
          filename: upload.original_filename,
          hash: upload.ipfs_hash,
          url: upload.ipfs_url,
          status: upload.status
        });
      });

      // Validate and clean the upload records
      const validUploads = uploadsArray.filter(upload => {
        const hasId = upload.id;
        const hasFilename = upload.original_filename;
        const hasValidHash = upload.ipfs_hash && upload.ipfs_hash !== 'unknown' && upload.ipfs_hash !== 'undefined';
        
        const isValid = hasId && hasFilename && hasValidHash;
        
        if (!isValid) {
          console.warn('⚠️ IPFS Service: Invalid upload filtered out:', {
            id: upload.id,
            filename: upload.original_filename,
            hash: upload.ipfs_hash,
            hasId,
            hasFilename,
            hasValidHash
          });
        } else {
          console.log('✅ IPFS Service: Valid upload:', upload.original_filename, 'Hash:', upload.ipfs_hash);
        }
        
        return isValid;
      });

      console.log('📊 IPFS Service: Valid uploads count:', validUploads.length);
      console.log('📋 IPFS Service: Returning valid uploads:', validUploads);

      return {
        success: true,
        data: validUploads,
        message: 'Uploads fetched successfully'
      };

    } catch (error) {
      console.error('❌ IPFS Service: Get uploads error:', error);
      console.error('❌ IPFS Service: Error stack:', error.stack);
      
      const errorMessage = error.message || 'Failed to fetch uploads';
      
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