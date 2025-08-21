import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { nanoid } from 'nanoid';

// Create a new e-waste disposal request
const createDisposalRequest = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

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

        // Convert empty strings to null for optional fields
        const processedWeight = weight_kg === '' ? null : weight_kg;
        const processedItemCount = item_count === '' ? null : item_count;
        const processedPreferredDate = preferred_date === '' ? null : preferred_date;

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
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            requestId,
            department,
            contact_name,
            contact_phone,
            contact_email,
            pickup_address,
            latitude,
            longitude,
            e_waste_description,
            processedWeight,
            processedItemCount,
            processedPreferredDate,
            preferred_time_slot || null,
            additional_notes || null,
            'pending'
        ]);

        if (!result.success) {
            throw new Error('Failed to create disposal request');
        }

        res.status(201).json({
            success: true,
            message: 'E-waste disposal request created successfully',
            data: {
                requestId,
                department
            }
        });

    } catch (error) {
        console.error('Create disposal request error:', error);
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
    body('department')
        .trim()
        .notEmpty().withMessage('Department is required'),
    body('contact_name')
        .trim()
        .notEmpty().withMessage('Contact name is required'),
    body('contact_phone')
        .trim()
        .notEmpty().withMessage('Contact phone number is required'),
    body('contact_email')
        .trim()
        .isEmail().withMessage('Valid email address is required'),
    body('pickup_address')
        .trim()
        .notEmpty().withMessage('Pickup address is required'),
    body('latitude')
        .isFloat().withMessage('Valid latitude is required'),
    body('longitude')
        .isFloat().withMessage('Valid longitude is required'),
    body('e_waste_description')
        .trim()
        .notEmpty().withMessage('E-waste description is required'),
    body('weight_kg')
        .optional()
        .isFloat().withMessage('Weight must be a valid number'),
    body('item_count')
        .optional()
        .isInt().withMessage('Item count must be a valid integer'),
    body('preferred_date')
        .optional()
        .isDate().withMessage('Preferred date must be a valid date'),
    body('preferred_time_slot')
        .optional()
        .trim(),
    body('additional_notes')
        .optional()
        .trim()
];

export {
    createDisposalRequest,
    getDisposalRequests,
    getDisposalRequestById,
    updateDisposalRequestStatus,
    deleteDisposalRequest,
    disposalRequestValidation
};