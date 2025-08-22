import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CloudUpload, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Eye, 
  AlertCircle,
  CheckCircle,
  Upload,
  Clock,
  Download
} from 'lucide-react';
import { toast } from 'react-toastify';
import { ipfsService } from '../services/ipfsService';
import Header from '../components/common/Header';

const IPFSUploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load uploads on component mount and when user navigates to page
  useEffect(() => {
    loadUploads();
    
    // DISABLE auto-refresh that was causing issues
    // const interval = setInterval(() => {
    //   loadUploads();
    // }, 30000);
    
    // Add page visibility listener to refresh when user comes back to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadUploads();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup listener on component unmount
    return () => {
      // clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadUploads = async () => {
    try {
      console.log('🔄 Frontend: Starting to load uploads...');
      setLoading(true);
      const result = await ipfsService.getUserUploads();
      console.log('📥 Frontend: Upload service result:', result);
      
      if (result.success) {
        console.log('✅ Frontend: Uploads loaded successfully:', result.data);
        console.log('📊 Frontend: Number of uploads:', result.data.length);
        setUploads(result.data);
      } else {
        console.error('❌ Frontend: Failed to load uploads:', result.message);
        toast.error(result.message || 'Failed to load uploads');
      }
    } catch (error) {
      console.error('❌ Frontend: Error loading uploads:', error);
      toast.error('Failed to load uploads');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed');
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      console.log('File selected:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await ipfsService.uploadFile(selectedFile, description);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        toast.success('File uploaded to IPFS successfully!');
        console.log('✅ Frontend: Upload result:', result);
        
        // Safely extract data with fallbacks
        const uploadData = result.data || {};
        console.log('🔍 Frontend: Raw upload data received:', uploadData);
        
        // Ensure we get the actual IPFS hash from the response
        const actualHash = uploadData.ipfsHash || uploadData.ipfs_hash || 'unknown';
        const actualUrl = uploadData.ipfsUrl || uploadData.ipfs_url || `https://ipfs.io/ipfs/${actualHash}`;
        
        const newUpload = {
          id: uploadData.id || Date.now(), 
          original_filename: uploadData.originalFilename || selectedFile.name,
          file_type: uploadData.fileType || selectedFile.type,
          file_size: uploadData.fileSize || selectedFile.size,
          ipfs_hash: actualHash, // Use the actual hash
          ipfs_url: actualUrl,   // Use the actual URL
          description: uploadData.description || description || null,
          upload_date: uploadData.uploadDate || new Date().toISOString(),
          status: 'uploaded'
        };
        
        console.log('✅ Frontend: New upload object:', newUpload);
        console.log('🔍 Frontend: IPFS Hash received:', actualHash);
        console.log('🔍 Frontend: IPFS URL constructed:', actualUrl);
        
        // Validate that we received a valid hash
        if (!actualHash || actualHash === 'unknown' || actualHash === 'undefined') {
          console.error('❌ Frontend: Invalid IPFS hash received:', actualHash);
          toast.error('Upload successful but IPFS hash is invalid');
        } else {
          console.log('✅ Frontend: Valid IPFS hash received:', actualHash);
        }
        
        // Update uploads state immediately
        setUploads(prevUploads => [newUpload, ...prevUploads]);
        
        // Reset form
        setSelectedFile(null);
        setDescription('');
        setUploadProgress(0);
        
        // Reset file input
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Remove the delayed reload that's causing the issue
        // The immediate state update above is sufficient
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Frontend: Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleDelete = async (uploadId) => {
    if (!window.confirm('Are you sure you want to delete this upload record?')) {
      return;
    }

    try {
      const result = await ipfsService.deleteUpload(uploadId);
      if (result.success) {
        toast.success('Upload record deleted successfully');
        loadUploads(); // Refresh the list
      } else {
        toast.error(result.message || 'Failed to delete upload');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete upload');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString()}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString()}`;
    } else {
      return `${date.toLocaleDateString()} (${diffInDays} days ago)`;
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return FileText;
    if (fileType.includes('image')) return Eye;
    return FileText;
  };

  return (
    <div className='flex-1 overflow-auto relative z-10'>
      <Header title="📤 Upload Reports to IPFS" />

      <main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Upload Section */}
          <motion.div
            className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center mb-6">
              <CloudUpload className="mr-3 text-primary-600" size={24} />
              <h2 className='text-xl font-semibold text-primary-800'>Upload New Report</h2>
            </div>

            {/* File Upload Area */}
            <div className="mb-6">
              <input
                type="file"
                id="file-input"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className={`
                  flex flex-col items-center justify-center w-full p-8 
                  border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300
                  ${selectedFile 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-primary-300 bg-primary-25 hover:border-primary-400 hover:bg-primary-50'
                  }
                `}
              >
                <div className="text-center">
                  <Upload className="mx-auto mb-4 text-primary-500" size={48} />
                  <p className="text-lg font-medium text-primary-700 mb-2">
                    Click to select file
                  </p>
                  <p className="text-sm text-primary-600">
                    PDF, JPEG, PNG (Max 10MB)
                  </p>
                </div>
              </label>

              {selectedFile && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="text-green-500 mr-3" size={20} />
                    <div>
                      <p className="font-medium text-green-800">{selectedFile.name}</p>
                      <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-primary-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the content of this report..."
                className="w-full p-3 border border-primary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-primary-800"
                rows={3}
              />
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-primary-600 mb-2">
                  <span>Uploading to IPFS...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-primary-200 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`
                w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center
                ${!selectedFile || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-500 text-white hover:bg-primary-600 transform hover:scale-105'
                }
              `}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading to IPFS...
                </>
              ) : (
                <>
                  <CloudUpload className="mr-2" size={20} />
                  Upload to IPFS
                </>
              )}
            </button>
          </motion.div>

          {/* Upload Statistics */}
          <motion.div
            className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className='text-xl font-semibold text-primary-800 mb-6'>📊 Upload Statistics</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="text-primary-500 mr-3" size={20} />
                  <span className="text-primary-700 font-medium">Total Files</span>
                </div>
                <span className="text-primary-800 font-bold text-xl">{uploads.length}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="text-green-500 mr-3" size={20} />
                  <span className="text-green-700 font-medium">Successfully Uploaded</span>
                </div>
                <span className="text-green-800 font-bold text-xl">{uploads.length}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="text-blue-500 mr-3" size={20} />
                  <span className="text-blue-700 font-medium">Last Upload</span>
                </div>
                <span className="text-blue-800 font-medium">
                  {uploads.length > 0 ? formatDate(uploads[0].upload_date) : 'None'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Upload History */}
        <motion.div
          className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className='text-xl font-semibold text-primary-800 mb-6'>
            📋 Upload History
            <button
              onClick={loadUploads}
              className="ml-4 px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              <span className="ml-3 text-primary-600">Loading uploads...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto mb-4 text-primary-400" size={48} />
              <p className="text-primary-600 text-lg">No files uploaded yet</p>
              <p className="text-primary-500">Upload your first report above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-primary-200">
                    <th className="text-left py-3 px-4 font-semibold text-primary-800">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary-800">File</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary-800">IPFS Hash</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary-800">Upload Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary-800">Size</th>
                    <th className="text-left py-3 px-4 font-semibold text-primary-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((upload, index) => {
                    const FileIcon = getFileIcon(upload.file_type);
                    return (
                      <tr key={upload.id} className="border-b border-primary-100 hover:bg-primary-25 transition-colors">
                        <td className="py-4 px-4 text-primary-700">{index + 1}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <FileIcon className="text-primary-500 mr-3" size={20} />
                            <div>
                              <p className="font-medium text-primary-800 max-w-xs truncate">
                                {upload.original_filename}
                              </p>
                              {upload.description && (
                                <p className="text-sm text-primary-600 max-w-xs truncate">
                                  {upload.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <code className="text-sm font-mono text-primary-700 bg-primary-50 px-2 py-1 rounded max-w-xs truncate">
                              {upload.ipfs_hash}
                            </code>
                            <button
                              onClick={() => copyToClipboard(upload.ipfs_hash)}
                              className="ml-2 p-1 text-primary-500 hover:text-primary-700 transition-colors"
                              title="Copy hash"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-primary-700">
                          {formatDate(upload.upload_date)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-block bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm">
                            {formatFileSize(upload.file_size)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                console.log('🔗 Button clicked for upload:', upload);
                                
                                // Construct IPFS URL safely
                                let ipfsUrl;
                                if (upload.ipfs_url && upload.ipfs_url !== 'undefined') {
                                  ipfsUrl = upload.ipfs_url;
                                } else if (upload.ipfs_hash && upload.ipfs_hash !== 'unknown' && upload.ipfs_hash !== 'undefined') {
                                  ipfsUrl = `https://ipfs.io/ipfs/${upload.ipfs_hash}`;
                                } else {
                                  toast.error('Invalid IPFS hash - cannot open file');
                                  return;
                                }
                                
                                console.log('🔗 Opening IPFS URL:', ipfsUrl);
                                window.open(ipfsUrl, '_blank');
                              }}
                              className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                              title="View file"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(upload.id)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default IPFSUploadPage;