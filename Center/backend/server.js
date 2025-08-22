import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { testConnection, initializeDatabase } from './config/database.js';
import { createTables } from './migrations/migrate.js';

// Import controllers
import { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile,
    changePassword,
    registerValidation,
    loginValidation,
    updateProfileValidation
} from './controllers/userController.js';

import { 
    createOrder,
    getOrders,
    getOrderById,
    updateOrder,
    getOrderStats,
    createOrderValidation,
    updateOrderValidation
} from './controllers/orderController.js';

import { 
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductCategories,
    getProductStats,
    createProductValidation,
    updateProductValidation
} from './controllers/productController.js';

import {
    getOverviewAnalytics,
    getRevenueAnalytics,
    getChannelPerformance,
    getCustomerSegmentation,
    getUserRetention,
    getAIPoweredInsights,
    saveAnalyticsData
} from './controllers/analyticsController.js';

// Import middleware
import { 
    authenticateToken, 
    requireAdmin, 
    requireManager, 
    requireTechnician 
} from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Repair Center Management API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
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

// Change password (protected)
app.put('/api/auth/change-password', authenticateToken, changePassword);

// =====================
// Order Management Routes
// =====================

// Create new order (protected)
app.post('/api/orders', authenticateToken, createOrderValidation, createOrder);

// Get all orders (protected)
app.get('/api/orders', authenticateToken, getOrders);

// Get single order by ID (protected)
app.get('/api/orders/:orderId', authenticateToken, getOrderById);

// Update order (protected - technician or higher)
app.put('/api/orders/:orderId', authenticateToken, requireTechnician, updateOrderValidation, updateOrder);

// Get order statistics (protected - manager or higher)
app.get('/api/orders/stats', authenticateToken, requireManager, getOrderStats);

// =====================
// Vendor Management Routes for Orders
// =====================

// Get orders pending vendor approval/response (protected - vendor role)
app.get('/api/vendor/orders', authenticateToken, async (req, res) => {
    try {
        // Check if user has vendor role
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Vendor role required.'
            });
        }

        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(`
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                c.customer_code,
                c.address as customer_address,
                c.city as customer_city,
                c.state as customer_state,
                tech.name as technician_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users tech ON o.assigned_technician_id = tech.id
            WHERE o.status IN ('pending', 'confirmed', 'in_progress')
            ORDER BY o.created_at DESC
        `);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch vendor orders'
            });
        }

        res.json({
            success: true,
            data: { orders: result.data }
        });

    } catch (error) {
        console.error('Vendor orders fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor orders'
        });
    }
});

// Vendor order response/approval (protected - vendor role)
app.put('/api/vendor/orders/:orderId/respond', authenticateToken, async (req, res) => {
    try {
        // Check if user has vendor role
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Vendor role required.'
            });
        }

        const { orderId } = req.params;
        const { 
            action, // 'approve', 'reject', 'request_info'
            estimated_cost,
            estimated_completion,
            assigned_technician_id,
            priority
        } = req.body;

        if (!action || !['approve', 'reject', 'request_info'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Valid action is required (approve, reject, request_info)'
            });
        }

        const { executeQuery } = await import('./config/database.js');

        // Get current order
        const orderResult = await executeQuery(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        if (!orderResult.success || orderResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const currentOrder = orderResult.data[0];
        let newStatus = currentOrder.status;
        let updateFields = ['updated_at = CURRENT_TIMESTAMP'];
        let updateValues = [];

        // Determine new status based on action
        switch (action) {
            case 'approve':
                newStatus = 'confirmed';
                if (estimated_cost) {
                    updateFields.push('estimated_cost = ?');
                    updateValues.push(estimated_cost);
                }
                if (estimated_completion) {
                    updateFields.push('estimated_completion = ?');
                    updateValues.push(estimated_completion);
                }
                if (assigned_technician_id) {
                    updateFields.push('assigned_technician_id = ?');
                    updateValues.push(assigned_technician_id);
                }
                if (priority) {
                    updateFields.push('priority = ?');
                    updateValues.push(priority);
                }
                break;
            case 'reject':
                newStatus = 'cancelled';
                break;
            case 'request_info':
                newStatus = 'pending';
                break;
        }

        updateFields.push('status = ?');
        updateValues.push(newStatus);
        updateValues.push(orderId);

        // Update order
        const updateResult = await executeQuery(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update order'
            });
        }

        // Add to order status history
        await executeQuery(`
            INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
            VALUES (?, ?, ?, ?, ?)
        `, [orderId, currentOrder.status, newStatus, req.user.id, `Vendor ${action} - ${req.user.name}`]);

        res.json({
            success: true,
            message: `Order ${action}d successfully`,
            data: {
                order_id: orderId,
                new_status: newStatus,
                action: action
            }
        });

    } catch (error) {
        console.error('Vendor order response error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process vendor response'
        });
    }
});

// Get vendor dashboard statistics (protected - vendor role)
app.get('/api/vendor/dashboard', authenticateToken, async (req, res) => {
    try {
        // Check if user has vendor role
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Vendor role required.'
            });
        }

        const { executeQuery } = await import('./config/database.js');

        // Get order counts by status
        const statusStatsResult = await executeQuery(`
            SELECT 
                status,
                COUNT(*) as count
            FROM orders 
            GROUP BY status
        `);

        // Get pending orders count (requires vendor attention)
        const pendingOrdersResult = await executeQuery(`
            SELECT COUNT(*) as pending_count
            FROM orders 
            WHERE status = 'pending'
        `);

        // Get today's orders
        const todayOrdersResult = await executeQuery(`
            SELECT COUNT(*) as today_count
            FROM orders 
            WHERE DATE(created_at) = CURDATE()
        `);

        // Get revenue this month
        const monthlyRevenueResult = await executeQuery(`
            SELECT 
                COALESCE(SUM(actual_cost), 0) as monthly_revenue,
                COUNT(*) as completed_orders
            FROM orders 
            WHERE status = 'completed' 
            AND MONTH(completed_at) = MONTH(CURDATE()) 
            AND YEAR(completed_at) = YEAR(CURDATE())
        `);

        // Get recent orders requiring attention
        const recentOrdersResult = await executeQuery(`
            SELECT 
                o.id,
                o.order_number,
                o.device_type,
                o.priority,
                o.created_at,
                u.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE o.status IN ('pending', 'confirmed')
            ORDER BY o.priority DESC, o.created_at ASC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                status_stats: statusStatsResult.success ? statusStatsResult.data : [],
                pending_orders: pendingOrdersResult.success ? pendingOrdersResult.data[0].pending_count : 0,
                today_orders: todayOrdersResult.success ? todayOrdersResult.data[0].today_count : 0,
                monthly_revenue: monthlyRevenueResult.success ? monthlyRevenueResult.data[0].monthly_revenue : 0,
                completed_orders: monthlyRevenueResult.success ? monthlyRevenueResult.data[0].completed_orders : 0,
                recent_orders: recentOrdersResult.success ? recentOrdersResult.data : []
            }
        });

    } catch (error) {
        console.error('Vendor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor dashboard data'
        });
    }
});

// =====================
// Vendor Disposal Request Routes
// =====================

// Get disposal requests for vendor management (protected - vendor role)
app.get('/api/vendor/disposal-requests', authenticateToken, async (req, res) => {
    try {
        // Check if user has vendor role
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Vendor role required.'
            });
        }

        console.log('🔄 Fetching all disposal requests...');

        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(`
            SELECT * FROM disposal_requests 
            ORDER BY created_at DESC
        `);

        if (!result.success) {
            console.error('❌ Failed to fetch disposal requests:', result.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch disposal requests'
            });
        }

        console.log(`📋 Found ${result.data.length} disposal requests`);
        console.log('📊 Request statuses breakdown:', 
            result.data.reduce((acc, req) => {
                acc[req.status] = (acc[req.status] || 0) + 1;
                return acc;
            }, {})
        );

        // Log scheduled requests specifically
        const scheduledRequests = result.data.filter(r => 
            r.status === 'pickup_scheduled' || 
            r.status === 'out_for_pickup' || 
            r.status === 'pickup_completed'
        );
        
        console.log(`🎯 Scheduled requests found: ${scheduledRequests.length}`);
        if (scheduledRequests.length > 0) {
            console.log('📝 Scheduled requests details:', 
                scheduledRequests.map(r => ({
                    id: r.request_id,
                    status: r.status,
                    pickup_datetime: r.pickup_datetime,
                    department: r.department
                }))
            );
        }

        res.json({
            success: true,
            data: { requests: result.data }
        });

    } catch (error) {
        console.error('❌ Vendor disposal requests fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch disposal requests'
        });
    }
});

// Vendor disposal request response/approval (protected - vendor role)
app.put('/api/vendor/disposal-requests/:requestId/respond', authenticateToken, async (req, res) => {
    try {
        // Check if user has vendor role
        if (req.user.role !== 'vendor' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Vendor role required.'
            });
        }

        const { requestId } = req.params;
        const { status, pickup_datetime } = req.body;

        console.log(`🔄 Processing disposal request update:`, {
            requestId,
            status,
            pickup_datetime,
            user: req.user.name
        });

        // Validate status value
        const validStatuses = ['pending', 'approved', 'pickup_scheduled', 'out_for_pickup', 'pickup_completed', 'rejected', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const { executeQuery } = await import('./config/database.js');

        // First, get the current request to verify it exists
        const currentRequest = await executeQuery(`
            SELECT * FROM disposal_requests 
            WHERE request_id = ? OR id = ?
        `, [requestId, requestId]);

        if (!currentRequest.success || currentRequest.data.length === 0) {
            console.log(`❌ Disposal request not found: ${requestId}`);
            return res.status(404).json({
                success: false,
                message: 'Disposal request not found'
            });
        }

        const request = currentRequest.data[0];
        console.log(`📋 Current request status: ${request.status}`);

        // Update the disposal request
        let updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
        let updateValues = [status];

        if (pickup_datetime && status === 'pickup_scheduled') {
            updateFields.push('pickup_datetime = ?');
            updateValues.push(pickup_datetime);
            console.log(`🗓️ Setting pickup datetime: ${pickup_datetime}`);
        }

        updateValues.push(requestId, requestId);

        const updateQuery = `
            UPDATE disposal_requests 
            SET ${updateFields.join(', ')}
            WHERE request_id = ? OR id = ?
        `;

        console.log(`🔄 Executing update query:`, updateQuery);
        console.log(`📋 Update values:`, updateValues);

        const updateResult = await executeQuery(updateQuery, updateValues);

        if (!updateResult.success) {
            console.error(`❌ Failed to update disposal request:`, updateResult.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update disposal request'
            });
        }

        console.log(`✅ Updated disposal request ${requestId} to status: ${status}`);

        // Verify the update by fetching the updated record
        const verifyResult = await executeQuery(`
            SELECT request_id, status, pickup_datetime, department, contact_name FROM disposal_requests 
            WHERE request_id = ? OR id = ?
        `, [requestId, requestId]);

        if (verifyResult.success && verifyResult.data.length > 0) {
            const updatedRequest = verifyResult.data[0];
            console.log(`✅ Verification - Updated request:`, {
                request_id: updatedRequest.request_id,
                status: updatedRequest.status,
                pickup_datetime: updatedRequest.pickup_datetime,
                department: updatedRequest.department,
                contact_name: updatedRequest.contact_name
            });
        } else {
            console.log(`❌ Verification failed - could not retrieve updated request`);
        }

        res.json({
            success: true,
            message: `Disposal request ${status} successfully`,
            data: {
                request_id: requestId,
                status: status,
                pickup_datetime: pickup_datetime || null
            }
        });

    } catch (error) {
        console.error('❌ Vendor disposal request response error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process vendor response'
        });
    }
});

// =====================
// Product/Service Management Routes
// =====================

// Create new product/service (protected - manager or higher)
app.post('/api/products', authenticateToken, requireManager, createProductValidation, createProduct);

// Get all products/services (public for customers to view)
app.get('/api/products', getProducts);

// Get single product by ID (public)
app.get('/api/products/:productId', getProductById);

// Update product (protected - manager or higher)
app.put('/api/products/:productId', authenticateToken, requireManager, updateProductValidation, updateProduct);

// Delete product (protected - admin only)
app.delete('/api/products/:productId', authenticateToken, requireAdmin, deleteProduct);

// Get product categories (public)
app.get('/api/products/categories', getProductCategories);

// Get product statistics (protected - manager or higher)
app.get('/api/products/stats', authenticateToken, requireManager, getProductStats);

// =====================
// Analytics Routes
// =====================

// Get overview analytics (protected - manager or higher)
app.get('/api/analytics/overview', authenticateToken, requireManager, getOverviewAnalytics);

// Get revenue analytics (protected - manager or higher)
app.get('/api/analytics/revenue', authenticateToken, requireManager, getRevenueAnalytics);

// Get channel performance (protected - manager or higher)
app.get('/api/analytics/channels', authenticateToken, requireManager, getChannelPerformance);

// Get customer segmentation (protected - manager or higher)
app.get('/api/analytics/customer-segmentation', authenticateToken, requireManager, getCustomerSegmentation);

// Get user retention data (protected - manager or higher)
app.get('/api/analytics/user-retention', authenticateToken, requireManager, getUserRetention);

// Get AI-powered insights (protected - manager or higher)
app.get('/api/analytics/insights', authenticateToken, requireManager, getAIPoweredInsights);

// Save analytics data (protected)
app.post('/api/analytics/data', authenticateToken, saveAnalyticsData);

// =====================
// User Management Routes
// =====================

// Get all users (admin only)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(`
            SELECT 
                u.id, u.name, u.email, u.role, u.department, u.phone, u.created_at, u.is_active,
                c.customer_code
            FROM users u
            LEFT JOIN customers c ON u.id = c.user_id
            ORDER BY u.created_at DESC
        `);
        
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

// Get user statistics (protected - manager or higher)
app.get('/api/users/stats', authenticateToken, requireManager, async (req, res) => {
    try {
        const { executeQuery } = await import('./config/database.js');
        
        // Get user counts by role
        const roleStatsResult = await executeQuery(`
            SELECT 
                role,
                COUNT(*) as count,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count
            FROM users 
            GROUP BY role
        `);

        // Get customer statistics
        const customerStatsResult = await executeQuery(`
            SELECT 
                COUNT(DISTINCT c.id) as total_customers,
                COUNT(DISTINCT o.customer_id) as customers_with_orders,
                AVG(order_stats.order_count) as avg_orders_per_customer
            FROM customers c
            LEFT JOIN orders o ON c.id = o.customer_id
            LEFT JOIN (
                SELECT customer_id, COUNT(*) as order_count
                FROM orders
                GROUP BY customer_id
            ) order_stats ON c.id = order_stats.customer_id
        `);

        // Get new users this month
        const newUsersResult = await executeQuery(`
            SELECT COUNT(*) as new_users_this_month
            FROM users 
            WHERE MONTH(created_at) = MONTH(CURDATE()) 
            AND YEAR(created_at) = YEAR(CURDATE())
        `);

        res.json({
            success: true,
            data: {
                role_stats: roleStatsResult.success ? roleStatsResult.data : [],
                customer_stats: customerStatsResult.success ? customerStatsResult.data[0] : {},
                new_users_this_month: newUsersResult.success ? newUsersResult.data[0].new_users_this_month : 0
            }
        });
        
    } catch (error) {
        console.error('User stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics'
        });
    }
});

// =====================
// Sales Routes
// =====================

// Create sale record (protected - technician or higher)
app.post('/api/sales', authenticateToken, requireTechnician, async (req, res) => {
    try {
        const { order_id, payment_method, discount_amount = 0, tax_rate = 8.5 } = req.body;
        
        if (!order_id) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const { executeQuery } = await import('./config/database.js');
        
        // Get order total
        const orderResult = await executeQuery(
            'SELECT actual_cost FROM orders WHERE id = ? AND status = "completed"',
            [order_id]
        );

        if (!orderResult.success || orderResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Completed order not found'
            });
        }

        const orderTotal = orderResult.data[0].actual_cost;
        const taxAmount = (orderTotal - discount_amount) * (tax_rate / 100);
        const netAmount = orderTotal - discount_amount + taxAmount;

        // Create sale record
        const result = await executeQuery(`
            INSERT INTO sales (order_id, sale_date, total_amount, payment_method, discount_amount, tax_amount, net_amount, payment_status)
            VALUES (?, CURDATE(), ?, ?, ?, ?, ?, 'paid')
        `, [order_id, orderTotal, payment_method, discount_amount, taxAmount, netAmount]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create sale record'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Sale recorded successfully',
            data: {
                sale_id: result.data.insertId,
                total_amount: orderTotal,
                net_amount: netAmount
            }
        });

    } catch (error) {
        console.error('Create sale error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record sale'
        });
    }
});

// Get sales data (protected - manager or higher)
app.get('/api/sales', authenticateToken, requireManager, async (req, res) => {
    try {
        const { start_date, end_date, payment_status } = req.query;
        
        let whereConditions = ['1=1'];
        let queryParams = [];

        if (start_date) {
            whereConditions.push('DATE(sale_date) >= ?');
            queryParams.push(start_date);
        }
        if (end_date) {
            whereConditions.push('DATE(sale_date) <= ?');
            queryParams.push(end_date);
        }
        if (payment_status) {
            whereConditions.push('payment_status = ?');
            queryParams.push(payment_status);
        }

        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(`
            SELECT 
                s.*,
                o.order_number,
                u.name as customer_name
            FROM sales s
            JOIN orders o ON s.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY s.sale_date DESC
        `, queryParams);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch sales data'
            });
        }

        res.json({
            success: true,
            data: { sales: result.data }
        });

    } catch (error) {
        console.error('Get sales error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sales data'
        });
    }
});

// =====================
// Settings Routes
// =====================

// Get settings (protected)
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(
            'SELECT setting_key, setting_value, setting_type, description FROM settings ORDER BY setting_key'
        );
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch settings'
            });
        }
        
        res.json({
            success: true,
            data: { settings: result.data }
        });
        
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
});

// Update setting (protected - admin only)
app.put('/api/settings/:key', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        if (!value) {
            return res.status(400).json({
                success: false,
                message: 'Setting value is required'
            });
        }

        const { executeQuery } = await import('./config/database.js');
        
        const result = await executeQuery(
            'UPDATE settings SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
            [value, req.user.id, key]
        );
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update setting'
            });
        }
        
        res.json({
            success: true,
            message: 'Setting updated successfully'
        });
        
    } catch (error) {
        console.error('Update setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update setting'
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
        console.log('🚀 Starting Repair Center Management Server...');
        
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
            console.log('🔧 Repair Center Management System Backend Ready!');
            console.log('👤 Default login: admin@repaircenter.com / admin123');
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