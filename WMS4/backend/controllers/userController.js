import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'ewaste-management-fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// User registration
const registerUser = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password, department, phone } = req.body;

        // Check if user already exists
        const existingUser = await executeQuery(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUser.success && existingUser.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await executeQuery(
            'INSERT INTO users (name, email, password, department, phone) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, department, phone || null]
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create user account'
            });
        }

        // Generate token
        const token = generateToken(result.data.insertId);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: result.data.insertId,
                    name,
                    email,
                    department,
                    role: 'user'
                },
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// User login
const loginUser = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const result = await executeQuery(
            'SELECT id, name, email, password, department, role, is_active FROM users WHERE email = ?',
            [email]
        );

        if (!result.success || result.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.data[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    department: user.department,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        const result = await executeQuery(
            'SELECT id, name, email, department, role, phone, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user: result.data[0] }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update user profile
const updateUserProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, phone } = req.body;

        const result = await executeQuery(
            'UPDATE users SET name = ?, phone = ? WHERE id = ?',
            [name, phone || null, req.user.id]
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Validation rules
const registerValidation = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Name is required'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 4 })
        .withMessage('Password must be at least 4 characters long'),
    body('department')
        .trim()
        .notEmpty()
        .withMessage('Department is required'),
    body('phone')
        .optional()
        .isLength({ min: 0 })
        .withMessage('Phone number is optional')
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const updateProfileValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Name must be between 2 and 255 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number is required')
];

export { 
    registerUser, 
    loginUser, 
    getUserProfile, 
    updateUserProfile,
    registerValidation,
    loginValidation,
    updateProfileValidation
};