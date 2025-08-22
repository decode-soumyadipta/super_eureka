import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { nanoid } from 'nanoid';

// Create a new e-waste disposal request
const createDisposalRequest = async (req, res) => {
    try {
        console.log('🔥 BACKEND: =================================');
        console.log('🔥 BACKEND: Disposal request received');
        console.log('📥 BACKEND: Request body:', JSON.stringify(req.body, null, 2));
        console.log('👤 BACKEND: User from token:', JSON.stringify(req.user, null, 2));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ BACKEND: Validation errors:', JSON.stringify(errors.array(), null, 2));
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        console.log('✅ BACKEND: Validation passed');

        const {
            request_id,
            department,
            contact_name,
            contact_phone,
            contact_email,
            pickup_address,
            latitude,
            longitude,
            e_waste_description,
            weight_kg,
            item_count,
            preferred_date,
            preferred_time_slot,
            additional_notes
        } = req.body;

        // Generate a unique request ID if not provided
        const requestId = request_id || 'EWASTE-' + nanoid(10).toUpperCase();

        // Get user information from JWT token
        const userId = req.user?.id;
        const userDepartment = req.user?.department || department;
        const userName = req.user?.name || contact_name;
        const userEmail = req.user?.email || contact_email;

        // Convert empty strings to null for optional fields
        const processedWeight = weight_kg === '' || weight_kg === undefined ? null : parseFloat(weight_kg);
        const processedItemCount = item_count === '' || item_count === undefined ? null : parseInt(item_count);
        const processedPreferredDate = preferred_date === '' || preferred_date === undefined ? null : preferred_date;

        // Validate required coordinates
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({
                success: false,
                message: 'Valid latitude and longitude coordinates are required'
            });
        }

        console.log('💾 Creating disposal request with data:', {
            requestId,
            department: userDepartment,
            contact_name: userName,
            contact_phone,
            contact_email: userEmail,
            pickup_address,
            latitude: lat,
            longitude: lng,
            e_waste_description,
            weight_kg: processedWeight,
            item_count: processedItemCount,
            preferred_date: processedPreferredDate,
            preferred_time_slot: preferred_time_slot || null,
            additional_notes: additional_notes || null,
            created_by: userId
        });

        const result = await executeQuery(`
            INSERT INTO disposal_requests (
                request_id,
                department,
                contact_name,
                contact_phone,
                contact_email,
                pickup_address,
                latitude,
                longitude,
                e_waste_description,
                weight_kg,
                item_count,
                preferred_date,
                preferred_time_slot,
                additional_notes,
                status,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            requestId,
            userDepartment,
            userName,
            contact_phone,
            userEmail,
            pickup_address,
            lat,
            lng,
            e_waste_description,
            processedWeight,
            processedItemCount,
            processedPreferredDate,
            preferred_time_slot || null,
            additional_notes || null,
            'pending',
            userId
        ]);

        if (!result.success) {
            console.error('❌ Database error:', result.error);
            throw new Error('Failed to create disposal request: ' + result.error);
        }

        console.log('✅ Disposal request created successfully:', requestId);

        res.status(201).json({
            success: true,
            message: 'E-waste disposal request created successfully',
            data: {
                requestId,
                department: userDepartment,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Create disposal request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get all disposal requests
const getDisposalRequests = async (req, res) => {
    try {
        let query = `
            SELECT * FROM disposal_requests
        `;

        const params = [];

        // Add status filter if provided
        if (req.query.status) {
            query += ` WHERE status = ?`;
            params.push(req.query.status);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await executeQuery(query, params);

        if (!result.success) {
            throw new Error('Failed to fetch disposal requests');
        }

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('Get disposal requests error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get a single disposal request by ID
const getDisposalRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery(`
            SELECT * FROM disposal_requests WHERE request_id = ? OR id = ?
        `, [id, id]);

        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Disposal request not found'
            });
        }

        res.json({
            success: true,
            data: result.data[0]
        });

    } catch (error) {
        console.error('Get disposal request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update disposal request status
const updateDisposalRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, vendor_notes } = req.body;

        // Validate status value
        const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'in_progress', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Update the request status
        const updateResult = await executeQuery(`
            UPDATE disposal_requests 
            SET status = ?, vendor_notes = ?, updated_at = NOW()
            WHERE request_id = ? OR id = ?
        `, [status, vendor_notes || null, id, id]);

        if (!updateResult.success) {
            throw new Error('Failed to update disposal request status');
        }

        res.json({
            success: true,
            message: `Disposal request status updated to ${status}`,
            data: {
                id,
                status
            }
        });

    } catch (error) {
        console.error('Update disposal status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Delete disposal request
const deleteDisposalRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await executeQuery(
            'DELETE FROM disposal_requests WHERE request_id = ? OR id = ?',
            [id, id]
        );

        if (!result.success || result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Disposal request not found'
            });
        }

        res.json({
            success: true,
            message: 'Disposal request deleted successfully'
        });

    } catch (error) {
        console.error('Delete disposal request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Validation rules for creating a disposal request
const disposalRequestValidation = [
    body('contact_phone')
        .trim()
        .notEmpty().withMessage('Contact phone number is required')
        .isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10-15 digits'),
    body('pickup_address')
        .trim()
        .notEmpty().withMessage('Pickup address is required')
        .isLength({ min: 10 }).withMessage('Please provide a complete pickup address'),
    body('latitude')
        .notEmpty().withMessage('Location coordinates are required')
        .isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required (-90 to 90)'),
    body('longitude')
        .notEmpty().withMessage('Location coordinates are required') 
        .isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required (-180 to 180)'),
    body('e_waste_description')
        .trim()
        .notEmpty().withMessage('Device description is required')
        .isLength({ min: 5 }).withMessage('Please provide a detailed description of the e-waste'),
    // Optional fields with basic validation
    body('department').optional().trim(),
    body('contact_name').optional().trim(),
    body('contact_email').optional().isEmail().withMessage('Valid email address is required if provided'),
    body('weight_kg').optional().isFloat({ min: 0 }).withMessage('Weight must be a positive number'),
    body('item_count').optional().isInt({ min: 1 }).withMessage('Item count must be at least 1'),
    body('preferred_date').optional().isDate().withMessage('Preferred date must be a valid date'),
    body('preferred_time_slot').optional().trim(),
    body('additional_notes').optional().trim()
];

export {
    createDisposalRequest,
    getDisposalRequests,
    getDisposalRequestById,
    updateDisposalRequestStatus,
    deleteDisposalRequest,
    disposalRequestValidation
};