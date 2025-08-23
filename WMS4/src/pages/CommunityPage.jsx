import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Heart, 
    MessageCircle, 
    Send, 
    Image, 
    Video, 
    X, 
    Upload,
    Users,
    Globe,
    AlertCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/common/Header';
import { communityService } from '../services/communityService';
import { authService } from '../services/authService';

const CommunityPage = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);
    const [newPost, setNewPost] = useState({
        content: '',
        media: []
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [user, setUser] = useState(null);
    const [expandedComments, setExpandedComments] = useState({});
    const [commentInputs, setCommentInputs] = useState({});
    const [postComments, setPostComments] = useState({});
    const [loadingComments, setLoadingComments] = useState({});

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await communityService.getPosts();
            setPosts(response.data || []);
        } catch (error) {
            console.error('Error fetching posts:', error);
            toast.error('Failed to load community posts');
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async (postId) => {
        try {
            setLoadingComments(prev => ({ ...prev, [postId]: true }));
            const response = await communityService.getPostComments(postId);
            setPostComments(prev => ({ ...prev, [postId]: response.data || [] }));
        } catch (error) {
            console.error('Error fetching comments:', error);
            toast.error('Failed to load comments');
        } finally {
            setLoadingComments(prev => ({ ...prev, [postId]: false }));
        }
    };

    const toggleComments = async (postId) => {
        const isCurrentlyExpanded = expandedComments[postId];
        
        if (!isCurrentlyExpanded) {
            // Expanding comments - fetch them if not already loaded
            if (!postComments[postId]) {
                await fetchComments(postId);
            }
        }
        
        setExpandedComments(prev => ({
            ...prev,
            [postId]: !isCurrentlyExpanded
        }));
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files);
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi'];
            return validTypes.includes(file.type) && file.size <= 50 * 1024 * 1024; // 50MB limit
        });

        if (validFiles.length !== files.length) {
            toast.error('Some files were skipped. Only images (jpg, png, gif) and videos (mp4, mov, avi) under 50MB are allowed.');
        }

        setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        
        if (!newPost.content.trim()) {
            toast.error('Please enter some content for your post');
            return;
        }

        try {
            setPosting(true);
            
            const postData = {
                content: newPost.content,
                media: selectedFiles
            };

            await communityService.createPost(postData);
            
            // Reset form
            setNewPost({ content: '', media: [] });
            setSelectedFiles([]);
            
            // Refresh posts
            await fetchPosts();
            
            toast.success('Post created successfully!');
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error(error.message || 'Failed to create post');
        } finally {
            setPosting(false);
        }
    };

    const handleLike = async (postId) => {
        try {
            const response = await communityService.toggleLike(postId);
            
            // Update the post in local state
            setPosts(prevPosts => 
                prevPosts.map(post => 
                    post.id === postId 
                        ? { 
                            ...post, 
                            like_count: response.likes_count,
                            liked_by_user: response.result === 'liked'
                        }
                        : post
                )
            );
        } catch (error) {
            console.error('Error toggling like:', error);
            toast.error('Failed to update like');
        }
    };

    const handleComment = async (postId) => {
        const content = commentInputs[postId];
        if (!content || !content.trim()) {
            toast.error('Please enter a comment');
            return;
        }

        try {
            const response = await communityService.addComment(postId, content.trim());
            
            // Clear the comment input
            setCommentInputs(prev => ({ ...prev, [postId]: '' }));
            
            // Add the new comment to the local state
            if (response.data) {
                setPostComments(prev => ({
                    ...prev,
                    [postId]: [...(prev[postId] || []), response.data]
                }));
            }
            
            // Update comment count in posts
            setPosts(prevPosts => 
                prevPosts.map(post => 
                    post.id === postId 
                        ? { ...post, comment_count: (post.comment_count || 0) + 1 }
                        : post
                )
            );
            
            toast.success('Comment added successfully!');
        } catch (error) {
            console.error('Error adding comment:', error);
            toast.error('Failed to add comment');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    const renderMediaPreview = (file, index) => {
        const objectUrl = URL.createObjectURL(file);
        
        return (
            <div key={index} className="relative inline-block mr-2 mb-2">
                {file.type.startsWith('image/') ? (
                    <img 
                        src={objectUrl} 
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                    />
                ) : (
                    <video 
                        src={objectUrl}
                        className="w-20 h-20 object-cover rounded-lg border"
                        muted
                    />
                )}
                <button
                    onClick={() => removeFile(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                >
                    <X size={12} />
                </button>
            </div>
        );
    };

    const renderPostMedia = (media) => {
        if (!media || media.length === 0) return null;

        return (
            <div className="mt-3 grid grid-cols-2 gap-2">
                {media.map((item, index) => {
                    // Fix the media URL construction with better debugging
                    const mediaUrl = communityService.getMediaUrl(item.file_path);
                    
                    console.log('🖼️ FRONTEND: Rendering media item:', {
                        index,
                        item,
                        mediaUrl,
                        fileType: item.file_type
                    });
                    
                    return (
                        <div key={index} className="relative">
                            {item.file_type === 'image' ? (
                                <img 
                                    src={mediaUrl}
                                    alt="Post media"
                                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                                    onLoad={(e) => {
                                        console.log('✅ FRONTEND: Image loaded successfully:', mediaUrl);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ FRONTEND: Image failed to load:', {
                                            mediaUrl,
                                            originalSrc: e.target.src,
                                            error: e
                                        });
                                        // Set a visible placeholder instead of broken image
                                        e.target.style.backgroundColor = '#f3f4f6';
                                        e.target.style.display = 'flex';
                                        e.target.style.alignItems = 'center';
                                        e.target.style.justifyContent = 'center';
                                        e.target.innerHTML = `
                                            <div style="text-align: center; color: #6b7280; padding: 20px;">
                                                <div style="font-size: 24px; margin-bottom: 8px;">📷</div>
                                                <div style="font-size: 12px;">Image not found</div>
                                                <div style="font-size: 10px; margin-top: 4px; word-break: break-all;">${mediaUrl}</div>
                                            </div>
                                        `;
                                    }}
                                />
                            ) : (
                                <video 
                                    src={mediaUrl}
                                    controls
                                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                                    onLoadedData={() => {
                                        console.log('✅ FRONTEND: Video loaded successfully:', mediaUrl);
                                    }}
                                    onError={(e) => {
                                        console.error('❌ FRONTEND: Video failed to load:', {
                                            mediaUrl,
                                            error: e
                                        });
                                    }}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className='flex-1 overflow-auto relative z-10'>
                <Header title='E-Shunya Awareness Community' />
                <main className='max-w-4xl mx-auto py-6 px-4 lg:px-8'>
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                            <p className="mt-4 text-secondary-600">Loading community posts...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <Header title='E-Shunya Awareness Community' />

            <main className='max-w-4xl mx-auto py-6 px-4 lg:px-8'>
                {/* Page Header */}
                <motion.div
                    className="mb-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Globe className="w-8 h-8 text-primary-600" />
                        <h1 className="text-3xl font-bold text-primary-800">E-Shunya Awareness Community</h1>
                    </div>
                    <p className="text-secondary-600 mb-2">
                        Share your e-waste journey and build a sustainable future together. <span className="text-primary-600 font-semibold">e-Shunya Community</span>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <p className="text-red-700 text-sm italic">
                                Note: Never share sensitive content and help foster the community realm.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Create Post Section */}
                <motion.div
                    className="mb-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="w-6 h-6 text-primary-600" />
                        <h3 className="text-xl font-semibold text-primary-800">
                            What's on your mind? <span className="text-orange-600">Create a new post.</span>
                        </h3>
                    </div>

                    <form onSubmit={handleCreatePost}>
                        <div className="mb-4">
                            <textarea
                                value={newPost.content}
                                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="Share your thoughts about e-waste awareness, sustainability tips, or environmental insights..."
                                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                rows={4}
                                disabled={posting}
                            />
                        </div>

                        {/* File Previews */}
                        {selectedFiles.length > 0 && (
                            <div className="mb-4">
                                <div className="flex flex-wrap">
                                    {selectedFiles.map((file, index) => renderMediaPreview(file, index))}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                                    <Image size={18} />
                                    <span className="text-sm">Photos/Videos</span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        disabled={posting}
                                    />
                                </label>
                                <span className="text-xs text-gray-500">
                                    Max 5 files, 50MB each (.jpg, .png, .gif, .mp4, .mov, .avi)
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={posting || !newPost.content.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {posting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>Posting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        <span>Post</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Posts Section */}
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-primary-800">Community Posts:</h3>
                    
                    {posts.length === 0 ? (
                        <motion.div
                            className="text-center py-12 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No posts yet</h3>
                            <p className="text-gray-500">Be the first to share something with the community!</p>
                        </motion.div>
                    ) : (
                        posts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                className="bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                            >
                                {/* Post Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-primary-800">{post.author_name}</h4>
                                        <p className="text-sm text-gray-600">{post.author_department}</p>
                                        <p className="text-xs text-gray-500">{formatDate(post.created_at)}</p>
                                    </div>
                                </div>

                                {/* Post Content */}
                                <div className="mb-4">
                                    <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
                                    {renderPostMedia(post.media)}
                                </div>

                                {/* Post Actions */}
                                <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleLike(post.id)}
                                        className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                                            post.liked_by_user 
                                                ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                        <Heart 
                                            className={`w-5 h-5 ${post.liked_by_user ? 'fill-current' : ''}`} 
                                        />
                                        <span className="text-sm font-medium">
                                            {post.like_count || 0}
                                        </span>
                                    </button>

                                    <button 
                                        onClick={() => toggleComments(post.id)}
                                        className="flex items-center gap-2 px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        <span className="text-sm font-medium">
                                            {post.comment_count || 0}
                                        </span>
                                        {expandedComments[post.id] ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>

                                {/* Comments Section */}
                                {expandedComments[post.id] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-4 pt-4 border-t border-gray-200"
                                    >
                                        {/* Comments List */}
                                        <div className="space-y-3 mb-4">
                                            {loadingComments[post.id] ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                                                    <span className="ml-2 text-sm text-gray-500">Loading comments...</span>
                                                </div>
                                            ) : postComments[post.id] && postComments[post.id].length > 0 ? (
                                                postComments[post.id].map((comment) => (
                                                    <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <Users className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-medium text-sm text-primary-800">
                                                                    {comment.author_name}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {comment.author_department}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {formatDate(comment.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-800">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-center text-gray-500 text-sm py-4">
                                                    No comments yet. Be the first to comment!
                                                </p>
                                            )}
                                        </div>

                                        {/* Add Comment Form */}
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                                                <Users className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={commentInputs[post.id] || ''}
                                                    onChange={(e) => setCommentInputs(prev => ({ 
                                                        ...prev, 
                                                        [post.id]: e.target.value 
                                                    }))}
                                                    placeholder="Add a comment..."
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleComment(post.id);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleComment(post.id)}
                                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                                >
                                                    <Send size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
};

export default CommunityPage;