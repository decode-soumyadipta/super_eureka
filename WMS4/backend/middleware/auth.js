import jwt from 'jsonwebtoken';
import { executeQuery } from '../config/database.js';

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        console.log('🔐 AUTH: Starting token authentication...');
        
        const authHeader = req.headers['authorization'];
        console.log('🔐 AUTH: Auth header:', authHeader ? 'Present' : 'Missing');
        
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            console.log('❌ AUTH: No token provided');
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        console.log('🔐 AUTH: Token found, verifying...');
        console.log('🔐 AUTH: Using JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Using fallback');

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ewaste-management-fallback-secret');
        console.log('✅ AUTH: Token decoded successfully, userId:', decoded.userId);
        
        // Verify user still exists and is active
        console.log('🔍 AUTH: Verifying user in database...');
        const result = await executeQuery(
            'SELECT id, name, email, department, role, is_active FROM users WHERE id = ? AND is_active = TRUE',
            [decoded.userId]
        );

        if (!result.success || result.data.length === 0) {
            console.log('❌ AUTH: User not found or inactive');
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        console.log('✅ AUTH: User verified:', {
            id: result.data[0].id,
            name: result.data[0].name,
            role: result.data[0].role
        });

        req.user = result.data[0];
        next();
    } catch (error) {
        console.error('❌ AUTH: Token verification failed:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid token format' 
            });
        }
        
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