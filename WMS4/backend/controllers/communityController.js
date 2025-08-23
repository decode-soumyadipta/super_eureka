import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/community');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (jpg, jpeg, png, gif) and videos (mp4, mov, avi) are allowed.'));
    }
};

export const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 5 // Max 5 files per post
    },
    fileFilter: fileFilter
});

// Create a new community post
const createPost = async (req, res) => {
    try {
        console.log('🔥 BACKEND: Creating community post');
        console.log('📥 BACKEND: Request body:', JSON.stringify(req.body, null, 2));
        console.log('📎 BACKEND: Files:', req.files ? req.files.length : 0);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ BACKEND: Validation errors:', JSON.stringify(errors.array(), null, 2));
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { content } = req.body;
        const userId = req.user.id;

        // Insert post into database
        const postResult = await executeQuery(
            'INSERT INTO community_posts (user_id, content) VALUES (?, ?)',
            [userId, content]
        );

        if (!postResult.success) {
            throw new Error('Failed to create post');
        }

        const postId = postResult.insertId;

        // Handle file uploads if any
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
                const relativePath = `uploads/community/${file.filename}`;
                
                await executeQuery(
                    'INSERT INTO community_media (post_id, file_name, file_type, file_path) VALUES (?, ?, ?, ?)',
                    [postId, file.filename, fileType, relativePath]
                );
            }
        }

        console.log('✅ BACKEND: Post created successfully with ID:', postId);

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: { postId }
        });

    } catch (error) {
        console.error('❌ BACKEND: Create post error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get all community posts with likes and comments
const getPosts = async (req, res) => {
    try {
        console.log('📥 BACKEND: Fetching community posts');
        
        // Get posts with user information and like counts
        const postsResult = await executeQuery(`
            SELECT 
                p.id,
                p.content,
                p.created_at,
                u.name as author_name,
                u.department as author_department,
                COUNT(DISTINCT l.id) as like_count,
                COUNT(DISTINCT c.id) as comment_count
            FROM community_posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN community_likes l ON p.id = l.post_id
            LEFT JOIN community_comments c ON p.id = c.post_id
            WHERE p.is_active = TRUE
            GROUP BY p.id, p.content, p.created_at, u.name, u.department
            ORDER BY p.created_at DESC
            LIMIT 50
        `);

        if (!postsResult.success) {
            throw new Error('Failed to fetch posts');
        }

        // Get media for each post
        const posts = await Promise.all(postsResult.data.map(async (post) => {
            const mediaResult = await executeQuery(
                'SELECT file_name, file_type, file_path FROM community_media WHERE post_id = ?',
                [post.id]
            );

            // Check if current user liked this post
            const likedResult = await executeQuery(
                'SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?',
                [post.id, req.user.id]
            );

            return {
                ...post,
                media: mediaResult.success ? mediaResult.data : [],
                liked_by_user: likedResult.success && likedResult.data.length > 0
            };
        }));

        res.json({
            success: true,
            data: posts
        });

    } catch (error) {
        console.error('❌ BACKEND: Get posts error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get comments for a specific post
const getPostComments = async (req, res) => {
    try {
        const { postId } = req.params;

        const commentsResult = await executeQuery(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                u.name as author_name,
                u.department as author_department
            FROM community_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        if (!commentsResult.success) {
            throw new Error('Failed to fetch comments');
        }

        res.json({
            success: true,
            data: commentsResult.data
        });

    } catch (error) {
        console.error('❌ BACKEND: Get comments error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Add a comment to a post
const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        const result = await executeQuery(
            'INSERT INTO community_comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, userId, content.trim()]
        );

        if (!result.success) {
            throw new Error('Failed to add comment');
        }

        // Get the created comment with user info
        const commentResult = await executeQuery(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                u.name as author_name,
                u.department as author_department
            FROM community_comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);

        res.json({
            success: true,
            message: 'Comment added successfully',
            data: commentResult.success ? commentResult.data[0] : null
        });

    } catch (error) {
        console.error('❌ BACKEND: Add comment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Like/unlike a post
const toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        // Check if user already liked this post
        const existingLike = await executeQuery(
            'SELECT id FROM community_likes WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );

        if (existingLike.success && existingLike.data.length > 0) {
            // Unlike the post
            await executeQuery(
                'DELETE FROM community_likes WHERE post_id = ? AND user_id = ?',
                [postId, userId]
            );
            
            // Get updated like count
            const likeCountResult = await executeQuery(
                'SELECT COUNT(*) as count FROM community_likes WHERE post_id = ?',
                [postId]
            );

            res.json({
                success: true,
                result: 'unliked',
                likes_count: likeCountResult.success ? likeCountResult.data[0].count : 0
            });
        } else {
            // Like the post
            await executeQuery(
                'INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)',
                [postId, userId]
            );

            // Get updated like count
            const likeCountResult = await executeQuery(
                'SELECT COUNT(*) as count FROM community_likes WHERE post_id = ?',
                [postId]
            );

            res.json({
                success: true,
                result: 'liked',
                likes_count: likeCountResult.success ? likeCountResult.data[0].count : 0
            });
        }

    } catch (error) {
        console.error('❌ BACKEND: Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Validation rules for creating a post
const postValidation = [
    body('content')
        .trim()
        .notEmpty()
        .withMessage('Post content is required')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Post content must be between 1 and 5000 characters')
];

export {
    createPost,
    getPosts,
    getPostComments,
    addComment,
    toggleLike,
    postValidation
};