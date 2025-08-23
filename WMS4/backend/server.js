import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection, initializeDatabase } from './config/database.js';
import { createTables } from './migrations/migrate.js';

// Get current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import controllers
import { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile,
    registerValidation,
    loginValidation,
    updateProfileValidation
} from './controllers/userController.js';

import { 
    registerDevice, 
    getDeviceByQR, 
    getDepartmentDevices, 
    getDepartmentStats,
    moveDevice,
    deviceRegistrationValidation,
    deviceMoveValidation
} from './controllers/deviceController.js';

// Import disposal controller
import {
    createDisposalRequest,
    getDisposalRequests,
    getDisposalRequestById,
    updateDisposalRequestStatus,
    disposalRequestValidation
} from './controllers/disposalController.js';

// Import IPFS controller
import { 
    uploadFileToIPFS, 
    getUserIPFSUploads, 
    getAllIPFSUploads, 
    deleteIPFSUpload, 
    upload 
} from './controllers/ipfsController.js';

// Import community controller
import {
    createPost,
    getPosts,
    getPostComments,
    addComment,
    toggleLike,
    postValidation,
    upload as communityUpload
} from './controllers/communityController.js';

// Import resource exchange controller
import {
    createResourceRequest,
    getResourceRequests,
    getResourceRequestById,
    createResourceResponse,
    updateResponseStatus,
    getUserResourceRequests,
    resourceRequestValidation
} from './controllers/resourceExchangeController.js';

// Import analytics controller
import {
    getDashboardAnalytics,
    getDeviceUtilization,
    getSustainabilityMetrics
} from './controllers/analyticsController.js';

// Import middleware
import { authenticateToken, requireAdmin, requireSameDepartment } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files (for uploaded community media) - Fix the static file serving
const uploadsPath = path.join(__dirname, 'uploads');
console.log('📁 STATIC: Serving uploads from absolute path:', uploadsPath);

// Add proper static file serving with correct headers
app.use('/uploads', express.static(uploadsPath, {
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/' + path.split('.').pop().toLowerCase());
        } else if (path.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
        } else if (path.endsWith('.mov')) {
            res.setHeader('Content-Type', 'video/quicktime');
        } else if (path.endsWith('.avi')) {
            res.setHeader('Content-Type', 'video/x-msvideo');
        }
    }
}));

// Add a debug endpoint to test file serving
app.get('/api/debug/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadsPath, 'community', filename);
    const fs = require('fs');
    
    if (fs.existsSync(filePath)) {
        res.json({
            success: true,
            message: 'File exists',
            filePath: filePath,
            url: `http://localhost:${PORT}/uploads/community/${filename}`
        });
    } else {
        res.json({
            success: false,
            message: 'File not found',
            filePath: filePath
        });
    }
});

// Add a test endpoint to verify file serving
app.get('/test-uploads', (req, res) => {
    res.json({
        message: 'Testing uploads directory',
        uploadsPath: uploadsPath,
        exists: require('fs').existsSync(uploadsPath)
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'E-Waste Management API is running',
        timestamp: new Date().toISOString()
    });
});

// =====================
// Authentication Routes
// =====================

// User registration
app.post('/api/auth/register', authLimiter, registerValidation, registerUser);

// User login
app.post('/api/auth/login', authLimiter, loginValidation, loginUser);

// Get user profile (protected)
app.get('/api/auth/profile', authenticateToken, getUserProfile);

// Update user profile (protected)
app.put('/api/auth/profile', authenticateToken, updateProfileValidation, updateUserProfile);

// =====================
// Device Management Routes
// =====================

// Register new device (protected)
app.post('/api/devices/register', authenticateToken, deviceRegistrationValidation, registerDevice);

// Get device by QR code (protected)
app.get('/api/devices/qr/:qr_code', authenticateToken, getDeviceByQR);

// Get all devices for department (protected)
app.get('/api/devices', authenticateToken, getDepartmentDevices);

// Get device statistics for department (protected)
app.get('/api/devices/stats', authenticateToken, getDepartmentStats);

// Move device to different location (protected)
app.put('/api/devices/:device_id/move', authenticateToken, deviceMoveValidation, moveDevice);

// =====================
// E-Waste Disposal Routes
// =====================

// Create new disposal request (protected)
app.post('/api/disposal/request', authenticateToken, disposalRequestValidation, createDisposalRequest);

// Get all disposal requests for current user/department (protected)
app.get('/api/disposal/requests', authenticateToken, getDisposalRequests);

// Get single disposal request by ID (protected)
app.get('/api/disposal/requests/:requestId', authenticateToken, getDisposalRequestById);

// Update disposal request status (protected - vendor/admin only)
app.put('/api/disposal/requests/:requestId/status', authenticateToken, updateDisposalRequestStatus);

// =====================
// Community Routes
// =====================

// Create new community post (protected)
app.post('/api/community/posts', authenticateToken, communityUpload.array('media', 5), postValidation, createPost);

// Get all community posts (protected)
app.get('/api/community/posts', authenticateToken, getPosts);

// Get comments for a specific post (protected)
app.get('/api/community/posts/:postId/comments', authenticateToken, getPostComments);

// Add comment to a post (protected)
app.post('/api/community/posts/:postId/comments', authenticateToken, addComment);

// Like/unlike a post (protected)
app.post('/api/community/posts/:postId/like', authenticateToken, toggleLike);

// =====================
// IPFS Upload Routes
// =====================

// Upload file to IPFS (protected)
app.post('/api/ipfs/upload', authenticateToken, upload.single('file'), uploadFileToIPFS);

// Get user's IPFS uploads (protected)
app.get('/api/ipfs/uploads', authenticateToken, getUserIPFSUploads);

// Get all IPFS uploads (admin only)
app.get('/api/admin/ipfs/uploads', authenticateToken, requireAdmin, getAllIPFSUploads);

// Delete IPFS upload record (protected)
app.delete('/api/ipfs/uploads/:id', authenticateToken, deleteIPFSUpload);

// =====================
// Department Routes
// =====================

// Get all departments (public - for registration form)
app.get('/api/departments', async (req, res) => {
    try {
        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(
            'SELECT id, name, code, location FROM departments ORDER BY name ASC'
        );
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch departments'
            });
        }
        
        res.json({
            success: true,
            data: { departments: result.data }
        });
        
    } catch (error) {
        console.error('Departments fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get department statistics (protected)
app.get('/api/departments/stats', authenticateToken, async (req, res) => {
    try {
        const department = req.user.role === 'admin' ? req.query.department || req.user.department : req.user.department;
        
        const { executeQuery } = await import('./config/database.js');
        
        // Get device counts
        const deviceCount = await executeQuery(
            'SELECT COUNT(*) as total FROM devices WHERE current_department = ? AND is_active = TRUE',
            [department]
        );
        
        // Get recent registrations (last 7 days)
        const recentDevices = await executeQuery(
            'SELECT COUNT(*) as recent FROM devices WHERE current_department = ? AND registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND is_active = TRUE',
            [department]
        );
        
        // Get devices by condition
        const devicesByCondition = await executeQuery(
            'SELECT condition_status, COUNT(*) as count FROM devices WHERE current_department = ? AND is_active = TRUE GROUP BY condition_status',
            [department]
        );
        
        // Get recent activity logs
        const recentLogs = await executeQuery(`
            SELECT dl.*, d.device_name, u.name as performed_by_name
            FROM device_logs dl
            JOIN devices d ON dl.device_id = d.id
            JOIN users u ON dl.performed_by = u.id
            WHERE d.current_department = ?
            ORDER BY dl.action_date DESC
            LIMIT 10
        `, [department]);
        
        res.json({
            success: true,
            data: {
                total_devices: deviceCount.success ? deviceCount.data[0].total : 0,
                recent_registrations: recentDevices.success ? recentDevices.data[0].recent : 0,
                devices_by_condition: devicesByCondition.success ? devicesByCondition.data : [],
                recent_activity: recentLogs.success ? recentLogs.data : []
            }
        });
        
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// =====================
// Resource Exchange Routes
// =====================

// Create new resource exchange request (protected)
app.post('/api/resource-exchange/requests', authenticateToken, resourceRequestValidation, createResourceRequest);

// Get all resource exchange requests (protected)
app.get('/api/resource-exchange/requests', authenticateToken, getResourceRequests);

// Get user's own resource requests (protected)
app.get('/api/resource-exchange/my-requests', authenticateToken, getUserResourceRequests);

// Get resource exchange request by ID (protected)
app.get('/api/resource-exchange/requests/:requestId', authenticateToken, getResourceRequestById);

// Create response to a resource exchange request (protected)
app.post('/api/resource-exchange/requests/:requestId/responses', authenticateToken, createResourceResponse);

// Update response status (accept/reject) (protected)
app.put('/api/resource-exchange/responses/:responseId/status', authenticateToken, updateResponseStatus);

// =====================
// Analytics Routes (New)
// =====================

// Get comprehensive dashboard analytics (protected)
app.get('/api/analytics/dashboard', authenticateToken, getDashboardAnalytics);

// Get device utilization insights (protected)
app.get('/api/analytics/utilization', authenticateToken, getDeviceUtilization);

// Get sustainability metrics (protected)
app.get('/api/analytics/sustainability', authenticateToken, getSustainabilityMetrics);

// =====================
// Admin Routes
// =====================

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(
            'SELECT id, name, email, department, role, phone, created_at, is_active FROM users ORDER BY created_at DESC'
        );
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users'
            });
        }
        
        res.json({
            success: true,
            data: { users: result.data }
        });
        
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all devices across departments (admin only)
app.get('/api/admin/devices', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(`
            SELECT d.*, u.name as registered_by_name
            FROM devices d
            LEFT JOIN users u ON d.registered_by = u.id
            WHERE d.is_active = TRUE
            ORDER BY d.registration_date DESC
        `);
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch devices'
            });
        }
        
        const devices = result.data.map(device => ({
            ...device,
            specifications: device.specifications ? JSON.parse(device.specifications) : null
        }));
        
        res.json({
            success: true,
            data: { devices }
        });
        
    } catch (error) {
        console.error('Admin devices fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('🚀 Starting E-Waste Management Server...');
        
        // Initialize database
        await initializeDatabase();
        
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Cannot start server: Database connection failed');
            process.exit(1);
        }
        
        // Run database migrations
        console.log('🔄 Running database migrations...');
        await createTables();
        
        // Start server
        app.listen(PORT, '127.0.0.1', () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
            console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
            console.log('📱 E-Waste Management System Backend Ready!');
        });
        
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();