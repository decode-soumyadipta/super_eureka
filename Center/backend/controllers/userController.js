import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

// Validation rules for user registration
export const registerValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('role')
        .optional()
        .isIn(['admin', 'manager', 'technician', 'customer'])
        .withMessage('Invalid role specified'),
];

// Validation rules for user login
export const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

// Validation rules for profile update
export const updateProfileValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department name too long'),
];

// Generate JWT token
const generateToken = (userId, role) => {
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET || 'repair_center_secret_key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// Register new user
export const registerUser = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { name, email, password, phone, role = 'customer', department } = req.body;

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

        // Insert user into database
        const result = await executeQuery(`
            INSERT INTO users (name, email, password, phone, role, department) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, email, hashedPassword, phone, role, department]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create user account'
            });
        }

        const userId = result.data.insertId;

        // Create customer record if role is customer
        if (role === 'customer') {
            const customerCode = `CUST${String(userId).padStart(6, '0')}`;
            await executeQuery(`
                INSERT INTO customers (user_id, customer_code) 
                VALUES (?, ?)
            `, [userId, customerCode]);
        }

        // Generate token
        const token = generateToken(userId, role);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: userId,
                    name,
                    email,
                    role,
                    department
                },
                token
            }
        });

    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
};

// User login
export const loginUser = async (req, res) => {
    try {
        // Check validation errors
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
        const userResult = await executeQuery(
            'SELECT id, name, email, password, role, department, is_active FROM users WHERE email = ?',
            [email]
        );

        if (!userResult.success || userResult.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = userResult.data[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact administrator.'
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
        const token = generateToken(user.id, user.role);

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutPassword,
                token
            }
        });

    } catch (error) {
        console.error('User login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
};

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await executeQuery(`
            SELECT u.id, u.name, u.email, u.phone, u.role, u.department, u.created_at,
                   c.customer_code, c.address, c.city, c.state, c.zip_code
            FROM users u
            LEFT JOIN customers c ON u.id = c.user_id
            WHERE u.id = ?
        `, [userId]);

        if (!userResult.success || userResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: { user: userResult.data[0] }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile'
        });
    }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { name, phone, department, address, city, state, zip_code } = req.body;

        // Update user table
        const updateFields = [];
        const updateValues = [];

        if (name) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (phone) {
            updateFields.push('phone = ?');
            updateValues.push(phone);
        }
        if (department) {
            updateFields.push('department = ?');
            updateValues.push(department);
        }

        if (updateFields.length > 0) {
            updateValues.push(userId);
            await executeQuery(
                `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                updateValues
            );
        }

        // Update customer table if user is a customer
        if (req.user.role === 'customer' && (address || city || state || zip_code)) {
            const customerFields = [];
            const customerValues = [];

            if (address) {
                customerFields.push('address = ?');
                customerValues.push(address);
            }
            if (city) {
                customerFields.push('city = ?');
                customerValues.push(city);
            }
            if (state) {
                customerFields.push('state = ?');
                customerValues.push(state);
            }
            if (zip_code) {
                customerFields.push('zip_code = ?');
                customerValues.push(zip_code);
            }

            if (customerFields.length > 0) {
                customerValues.push(userId);
                await executeQuery(
                    `UPDATE customers SET ${customerFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
                    customerValues
                );
            }
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
};

// Change password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Get current password
        const userResult = await executeQuery(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );

        if (!userResult.success || userResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.data[0].password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        const updateResult = await executeQuery(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, userId]
        );

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update password'
            });
        }

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};