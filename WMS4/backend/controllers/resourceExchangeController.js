import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { nanoid } from 'nanoid';
import DeviceLogService from '../services/deviceLogService.js';

// Create a new resource exchange request
const createResourceRequest = async (req, res) => {
    try {
        console.log('🔥 BACKEND: Creating resource exchange request');
        console.log('📥 BACKEND: Request body:', JSON.stringify(req.body, null, 2));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ BACKEND: Validation errors:', JSON.stringify(errors.array(), null, 2));
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            device_type,
            specifications,
            description,
            urgency,
            preferred_exchange_date,
            is_exchange,
            device_ids // Array of device IDs included in the request
        } = req.body;

        // Generate unique request ID
        const requestId = 'RES-' + nanoid(10).toUpperCase();

        // Get user information from JWT token
        const userId = req.user.id;
        const userDepartment = req.user.department;

        // Insert request into database
        const result = await executeQuery(`
            INSERT INTO resource_exchange_requests (
                request_id,
                requester_user_id,
                requester_department,
                device_type,
                specifications,
                description,
                urgency,
                preferred_exchange_date,
                is_exchange
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            requestId,
            userId,
            userDepartment,
            device_type,
            specifications ? JSON.stringify(specifications) : null,
            description,
            urgency || 'medium',
            preferred_exchange_date || null,
            is_exchange !== undefined ? is_exchange : true
        ]);

        if (!result.success) {
            throw new Error('Failed to create resource exchange request');
        }

        const exchangeRequestId = result.data.insertId;

        // Log device activities for all devices included in the request
        if (device_ids && Array.isArray(device_ids)) {
            for (const deviceId of device_ids) {
                await DeviceLogService.logResourceExchange({
                    deviceId: deviceId,
                    exchangeType: 'request',
                    exchangeId: exchangeRequestId,
                    requesterId: userId,
                    exchangeDetails: {
                        request_id: requestId,
                        device_type,
                        description,
                        urgency,
                        specifications
                    },
                    performedBy: userId
                });
            }
        }

        console.log('✅ BACKEND: Resource request created successfully:', requestId);

        res.status(201).json({
            success: true,
            message: 'Resource exchange request created successfully',
            data: {
                requestId,
                department: userDepartment,
                status: 'open'
            }
        });

    } catch (error) {
        console.error('❌ BACKEND: Create resource request error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get all resource exchange requests
const getResourceRequests = async (req, res) => {
    try {
        console.log('📥 BACKEND: Fetching resource exchange requests');
        
        const { status, department } = req.query;
        let query = `
            SELECT 
                r.*,
                u.name as requester_name,
                u.email as requester_email,
                COUNT(resp.id) as response_count
            FROM resource_exchange_requests r
            LEFT JOIN users u ON r.requester_user_id = u.id
            LEFT JOIN resource_exchange_responses resp ON r.id = resp.request_id
        `;

        const params = [];
        const conditions = [];

        if (status) {
            conditions.push('r.status = ?');
            params.push(status);
        }

        if (department) {
            conditions.push('r.requester_department = ?');
            params.push(department);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY r.id ORDER BY r.created_at DESC';

        const result = await executeQuery(query, params);

        if (!result.success) {
            throw new Error('Failed to fetch resource exchange requests');
        }

        // Parse specifications for each request
        const requests = result.data.map(request => ({
            ...request,
            specifications: request.specifications ? JSON.parse(request.specifications) : null
        }));

        res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('❌ BACKEND: Get resource requests error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get resource exchange request by ID
const getResourceRequestById = async (req, res) => {
    try {
        const { requestId } = req.params;

        const result = await executeQuery(`
            SELECT 
                r.*,
                u.name as requester_name,
                u.email as requester_email,
                u.phone as requester_phone
            FROM resource_exchange_requests r
            LEFT JOIN users u ON r.requester_user_id = u.id
            WHERE r.request_id = ? OR r.id = ?
        `, [requestId, requestId]);

        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource exchange request not found'
            });
        }

        const request = {
            ...result.data[0],
            specifications: result.data[0].specifications ? JSON.parse(result.data[0].specifications) : null
        };

        // Get responses for this request
        const responsesResult = await executeQuery(`
            SELECT 
                resp.*,
                u.name as responder_name,
                u.email as responder_email,
                u.phone as responder_phone,
                d.device_name,
                d.device_type as offered_device_type,
                d.brand as offered_device_brand,
                d.model as offered_device_model
            FROM resource_exchange_responses resp
            LEFT JOIN users u ON resp.responder_user_id = u.id
            LEFT JOIN devices d ON resp.offered_device_id = d.id
            WHERE resp.request_id = ?
            ORDER BY resp.created_at DESC
        `, [request.id]);

        request.responses = responsesResult.success ? responsesResult.data : [];

        res.json({
            success: true,
            data: request
        });

    } catch (error) {
        console.error('❌ BACKEND: Get resource request by ID error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Create a response to a resource exchange request
const createResourceResponse = async (req, res) => {
    try {
        console.log('🔥 BACKEND: Creating resource exchange response');
        
        const { requestId } = req.params;
        const {
            offered_device_id,
            offer_description,
            terms
        } = req.body;

        // Get user information
        const userId = req.user.id;
        const userDepartment = req.user.department;

        // Check if request exists and is open
        const requestResult = await executeQuery(
            'SELECT id, status, requester_user_id FROM resource_exchange_requests WHERE request_id = ? OR id = ?',
            [requestId, requestId]
        );

        if (!requestResult.success || requestResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Resource exchange request not found'
            });
        }

        const request = requestResult.data[0];

        if (request.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: 'This request is no longer accepting responses'
            });
        }

        // Prevent self-response
        if (request.requester_user_id === userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot respond to your own request'
            });
        }

        // Insert response
        const result = await executeQuery(`
            INSERT INTO resource_exchange_responses (
                request_id,
                responder_user_id,
                responder_department,
                offered_device_id,
                offer_description,
                terms
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            request.id,
            userId,
            userDepartment,
            offered_device_id || null,
            offer_description,
            terms || null
        ]);

        if (!result.success) {
            throw new Error('Failed to create response');
        }

        const responseId = result.data.insertId;

        // Log device activity for the offered device
        if (offered_device_id) {
            await DeviceLogService.logResourceExchange({
                deviceId: offered_device_id,
                exchangeType: 'response',
                exchangeId: request.id,
                requesterId: request.requester_user_id,
                responderId: userId,
                exchangeDetails: {
                    response_id: responseId,
                    offer_description,
                    terms
                },
                performedBy: userId
            });
        }

        res.status(201).json({
            success: true,
            message: 'Response submitted successfully',
            data: { responseId: responseId }
        });

    } catch (error) {
        console.error('❌ BACKEND: Create resource response error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update response status (accept/reject)
const updateResponseStatus = async (req, res) => {
    try {
        const { responseId } = req.params;
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "accepted" or "rejected"'
            });
        }

        // Get response details and check ownership
        const responseResult = await executeQuery(`
            SELECT 
                resp.*,
                req.requester_user_id,
                req.status as request_status,
                req.id as request_id
            FROM resource_exchange_responses resp
            JOIN resource_exchange_requests req ON resp.request_id = req.id
            WHERE resp.id = ?
        `, [responseId]);

        if (!responseResult.success || responseResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Response not found'
            });
        }

        const response = responseResult.data[0];

        // Check if user is the original requester
        if (response.requester_user_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only manage responses to your own requests'
            });
        }

        // Update response status
        const updateResult = await executeQuery(
            'UPDATE resource_exchange_responses SET status = ? WHERE id = ?',
            [status, responseId]
        );

        if (!updateResult.success) {
            throw new Error('Failed to update response status');
        }

        // Log device activity for the offered device
        if (response.offered_device_id) {
            await DeviceLogService.logResourceExchange({
                deviceId: response.offered_device_id,
                exchangeType: 'accepted',
                exchangeId: response.request_id,
                requesterId: response.requester_user_id,
                responderId: response.responder_user_id,
                exchangeDetails: {
                    response_id: responseId,
                    status,
                    offer_description: response.offer_description
                },
                performedBy: req.user.id
            });
        }

        // If accepted, update request status to matched
        if (status === 'accepted') {
            await executeQuery(
                'UPDATE resource_exchange_requests SET status = ? WHERE id = ?',
                ['matched', response.request_id]
            );

            // Reject all other pending responses for this request
            await executeQuery(
                'UPDATE resource_exchange_responses SET status = ? WHERE request_id = ? AND id != ? AND status = ?',
                ['rejected', response.request_id, responseId, 'pending']
            );
        }

        res.json({
            success: true,
            message: `Response ${status} successfully`
        });

    } catch (error) {
        console.error('❌ BACKEND: Update response status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get user's own resource requests
const getUserResourceRequests = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await executeQuery(`
            SELECT 
                r.*,
                COUNT(resp.id) as response_count
            FROM resource_exchange_requests r
            LEFT JOIN resource_exchange_responses resp ON r.id = resp.request_id
            WHERE r.requester_user_id = ?
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `, [userId]);

        if (!result.success) {
            throw new Error('Failed to fetch user resource requests');
        }

        const requests = result.data.map(request => ({
            ...request,
            specifications: request.specifications ? JSON.parse(request.specifications) : null
        }));

        res.json({
            success: true,
            data: requests
        });

    } catch (error) {
        console.error('❌ BACKEND: Get user resource requests error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Complete resource exchange (final step)
const completeResourceExchange = async (req, res) => {
    try {
        const { responseId } = req.params;
        const { completion_notes, transfer_details } = req.body;

        // Get exchange details
        const exchangeResult = await executeQuery(`
            SELECT 
                resp.*,
                req.requester_user_id,
                req.request_id
            FROM resource_exchange_responses resp
            JOIN resource_exchange_requests req ON resp.request_id = req.id
            WHERE resp.id = ? AND resp.status = 'accepted'
        `, [responseId]);

        if (!exchangeResult.success || exchangeResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Accepted exchange not found'
            });
        }

        const exchange = exchangeResult.data[0];

        // Update response status to completed
        await executeQuery(
            'UPDATE resource_exchange_responses SET status = ?, completion_notes = ? WHERE id = ?',
            ['completed', completion_notes, responseId]
        );

        // Update request status to completed
        await executeQuery(
            'UPDATE resource_exchange_requests SET status = ? WHERE id = ?',
            ['completed', exchange.request_id]
        );

        // Log completion for the offered device
        if (exchange.offered_device_id) {
            await DeviceLogService.logResourceExchange({
                deviceId: exchange.offered_device_id,
                exchangeType: 'completed',
                exchangeId: exchange.request_id,
                requesterId: exchange.requester_user_id,
                responderId: exchange.responder_user_id,
                exchangeDetails: {
                    response_id: responseId,
                    completion_notes,
                    transfer_details
                },
                performedBy: req.user.id
            });

            // If transfer details include new location/department, update device
            if (transfer_details) {
                if (transfer_details.new_location) {
                    await executeQuery(
                        'UPDATE devices SET current_location = ? WHERE id = ?',
                        [transfer_details.new_location, exchange.offered_device_id]
                    );

                    await DeviceLogService.logActivity({
                        deviceId: exchange.offered_device_id,
                        logType: 'transfer',
                        actionDescription: `Device transferred as part of resource exchange ${exchange.request_id}`,
                        performedBy: req.user.id,
                        fromUserId: exchange.responder_user_id,
                        toUserId: exchange.requester_user_id,
                        toLocation: transfer_details.new_location,
                        relatedExchangeId: exchange.request_id,
                        metadata: {
                            exchange_type: 'resource_transfer',
                            transfer_details
                        },
                        notes: completion_notes
                    });
                }

                if (transfer_details.new_department) {
                    await executeQuery(
                        'UPDATE devices SET current_department = ? WHERE id = ?',
                        [transfer_details.new_department, exchange.offered_device_id]
                    );
                }
            }
        }

        res.json({
            success: true,
            message: 'Resource exchange completed successfully'
        });

    } catch (error) {
        console.error('❌ BACKEND: Complete resource exchange error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Validation rules for creating a resource request
const resourceRequestValidation = [
    body('device_type')
        .trim()
        .notEmpty()
        .withMessage('Device type is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Device type must be between 2 and 100 characters'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
    body('urgency')
        .optional()
        .isIn(['low', 'medium', 'high'])
        .withMessage('Urgency must be low, medium, or high'),
    body('preferred_exchange_date')
        .optional()
        .isISO8601()
        .withMessage('Preferred exchange date must be a valid date')
];

export {
    createResourceRequest,
    getResourceRequests,
    getResourceRequestById,
    createResourceResponse,
    updateResponseStatus,
    getUserResourceRequests,
    completeResourceExchange,
    resourceRequestValidation
};