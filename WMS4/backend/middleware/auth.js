import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists and is active
        const result = await executeQuery(
            'SELECT id, name, email, department, role, is_active FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.userId]
        );

        if (!result.success || result.data.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        req.user = result.data[0];
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
};

// Admin role middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    next();
};

// Department access middleware
const requireSameDepartment = (req, res, next) => {
    // Admins can access all departments
    if (req.user.role === 'admin') {
        return next();
    }

    // For regular users, check if they're accessing their own department's data
    const requestedDepartment = req.params.department || req.body.department;
    if (requestedDepartment && requestedDepartment !== req.user.department) {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied: Different department' 
        });
    }
    next();
};

export { authenticateToken, requireAdmin, requireSameDepartment };