import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

// Verify JWT token and extract user information
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'repair_center_secret_key');
        
        // Get fresh user data from database
        const userResult = await executeQuery(
            'SELECT id, name, email, role, department, is_active FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.userId]
        );

        if (!userResult.success || userResult.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token or user not found'
            });
        }

        req.user = userResult.data[0];
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Token verification failed'
        });
    }
};

// Require admin role
export const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Require manager or admin role
export const requireManager = (req, res, next) => {
    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Manager or admin access required'
        });
    }
    next();
};

// Require technician, manager, or admin role
export const requireTechnician = (req, res, next) => {
    if (!['admin', 'manager', 'technician'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'Technician access or higher required'
        });
    }
    next();
};

// Check if user can access specific repair center data
export const requireRepairCenterAccess = async (req, res, next) => {
    try {
        const repairCenterId = req.params.centerId || req.body.repair_center_id;
        
        if (!repairCenterId) {
            return res.status(400).json({
                success: false,
                message: 'Repair center ID required'
            });
        }

        // Admin can access all repair centers
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user is manager of this repair center
        const centerResult = await executeQuery(
            'SELECT id FROM repair_centers WHERE id = ? AND manager_id = ?',
            [repairCenterId, req.user.id]
        );

        if (!centerResult.success || centerResult.data.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied to this repair center'
            });
        }

        next();
    } catch (error) {
        console.error('Repair center access check error:', error);
        res.status(500).json({
            success: false,
            message: 'Access verification failed'
        });
    }
};

// Check if user can access specific customer data
export const requireCustomerAccess = async (req, res, next) => {
    try {
        const customerId = req.params.customerId || req.body.customer_id;
        
        if (!customerId) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID required'
            });
        }

        // Admin and managers can access all customers
        if (['admin', 'manager'].includes(req.user.role)) {
            return next();
        }

        // Customers can only access their own data
        if (req.user.role === 'customer') {
            const customerResult = await executeQuery(
                'SELECT id FROM customers WHERE id = ? AND user_id = ?',
                [customerId, req.user.id]
            );

            if (!customerResult.success || customerResult.data.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this customer data'
                });
            }
        }

        next();
    } catch (error) {
        console.error('Customer access check error:', error);
        res.status(500).json({
            success: false,
            message: 'Access verification failed'
        });
    }
};