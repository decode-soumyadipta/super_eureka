import api from './api.js';

class CommunityService {
    // Create a new post
    async createPost(postData) {
        try {
            const formData = new FormData();
            formData.append('content', postData.content);
            
            // Add media files if any
            if (postData.media && postData.media.length > 0) {
                postData.media.forEach((file) => {
                    formData.append('media', file);
                });
            }

            const response = await api.post('/community/posts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get all community posts
    async getPosts() {
        try {
            const response = await api.get('/community/posts');
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Get comments for a specific post
    async getPostComments(postId) {
        try {
            const response = await api.get(`/community/posts/${postId}/comments`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Add a comment to a post
    async addComment(postId, content) {
        try {
            const response = await api.post(`/community/posts/${postId}/comments`, {
                content: content
            });
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Like/unlike a post
    async toggleLike(postId) {
        try {
            const response = await api.post(`/community/posts/${postId}/like`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    // Helper function to get media URL - Fix the URL construction
    getMediaUrl(filePath) {
        if (!filePath) return null;
        
        // Ensure the file path doesn't start with a slash to avoid double slashes
        const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
        const fullUrl = `http://localhost:5000/${cleanPath}`;
        
        console.log('🖼️ FRONTEND: Constructing media URL:', {
            originalPath: filePath,
            cleanPath: cleanPath,
            fullUrl: fullUrl
        });
        
        return fullUrl;
    }
}

export const communityService = new CommunityService();
export default communityService;