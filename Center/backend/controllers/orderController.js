import { body, validationResult } from 'express-validator';
import { executeQuery, executeTransaction } from '../config/database.js';

// Validation rules for creating orders
export const createOrderValidation = [
    body('customer_id')
        .isInt({ min: 1 })
        .withMessage('Valid customer ID is required'),
    body('device_type')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Device type is required'),
    body('issue_description')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Issue description must be between 10 and 1000 characters'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('estimated_cost')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Invalid estimated cost format'),
];

// Validation rules for updating orders
export const updateOrderValidation = [
    body('status')
        .optional()
        .isIn(['pending', 'confirmed', 'in_progress', 'waiting_parts', 'completed', 'cancelled', 'delivered'])
        .withMessage('Invalid status'),
    body('assigned_technician_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid technician ID'),
    body('estimated_cost')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Invalid estimated cost format'),
    body('actual_cost')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Invalid actual cost format'),
];

// Generate unique order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
};

// Create new order
export const createOrder = async (req, res) => {
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

        const {
            customer_id,
            repair_center_id,
            device_type,
            device_brand,
            device_model,
            issue_description,
            priority = 'medium',
            estimated_cost,
            notes
        } = req.body;

        // Verify customer exists
        const customerResult = await executeQuery(
            'SELECT id FROM customers WHERE id = ?',
            [customer_id]
        );

        if (!customerResult.success || customerResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        // Generate order number
        const orderNumber = generateOrderNumber();

        // Create order
        const result = await executeQuery(`
            INSERT INTO orders (
                order_number, customer_id, repair_center_id, device_type, 
                device_brand, device_model, issue_description, priority, 
                estimated_cost, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
            orderNumber, customer_id, repair_center_id, device_type,
            device_brand, device_model, issue_description, priority,
            estimated_cost, notes
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create order'
            });
        }

        const orderId = result.data.insertId;

        // Create status history entry
        await executeQuery(`
            INSERT INTO order_status_history (order_id, new_status, changed_by, notes)
            VALUES (?, 'pending', ?, 'Order created')
        `, [orderId, req.user.id]);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            data: {
                order: {
                    id: orderId,
                    order_number: orderNumber,
                    status: 'pending'
                }
            }
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
};

// Get all orders
export const getOrders = async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            page = 1, 
            limit = 20,
            search,
            start_date,
            end_date 
        } = req.query;

        let whereConditions = ['1=1'];
        let queryParams = [];

        // Role-based filtering
        if (req.user.role === 'customer') {
            whereConditions.push('c.user_id = ?');
            queryParams.push(req.user.id);
        } else if (req.user.role === 'technician') {
            whereConditions.push('o.assigned_technician_id = ?');
            queryParams.push(req.user.id);
        }

        // Status filter
        if (status) {
            whereConditions.push('o.status = ?');
            queryParams.push(status);
        }

        // Priority filter
        if (priority) {
            whereConditions.push('o.priority = ?');
            queryParams.push(priority);
        }

        // Search filter
        if (search) {
            whereConditions.push('(o.order_number LIKE ? OR o.device_type LIKE ? OR o.device_brand LIKE ? OR u.name LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Date range filter
        if (start_date) {
            whereConditions.push('DATE(o.created_at) >= ?');
            queryParams.push(start_date);
        }
        if (end_date) {
            whereConditions.push('DATE(o.created_at) <= ?');
            queryParams.push(end_date);
        }

        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE ${whereConditions.join(' AND ')}
        `;
        
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult.success ? countResult.data[0].total : 0;

        // Get orders
        const ordersQuery = `
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                c.customer_code,
                tech.name as technician_name,
                rc.name as repair_center_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users tech ON o.assigned_technician_id = tech.id
            LEFT JOIN repair_centers rc ON o.repair_center_id = rc.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY o.created_at DESC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(parseInt(limit), offset);
        const ordersResult = await executeQuery(ordersQuery, queryParams);

        if (!ordersResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch orders'
            });
        }

        res.json({
            success: true,
            data: {
                orders: ordersResult.data,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: total,
                    total_pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;

        const orderQuery = `
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                c.customer_code,
                c.address as customer_address,
                c.city as customer_city,
                c.state as customer_state,
                c.zip_code as customer_zip,
                tech.name as technician_name,
                tech.email as technician_email,
                rc.name as repair_center_name,
                rc.phone as repair_center_phone
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users tech ON o.assigned_technician_id = tech.id
            LEFT JOIN repair_centers rc ON o.repair_center_id = rc.id
            WHERE o.id = ?
        `;

        const orderResult = await executeQuery(orderQuery, [orderId]);

        if (!orderResult.success || orderResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orderResult.data[0];

        // Check access permissions
        if (req.user.role === 'customer') {
            const customerResult = await executeQuery(
                'SELECT id FROM customers WHERE id = ? AND user_id = ?',
                [order.customer_id, req.user.id]
            );

            if (!customerResult.success || customerResult.data.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this order'
                });
            }
        }

        // Get order items
        const itemsQuery = `
            SELECT 
                oi.*,
                p.name as product_name,
                p.description as product_description
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        `;

        const itemsResult = await executeQuery(itemsQuery, [orderId]);

        // Get status history
        const historyQuery = `
            SELECT 
                osh.*,
                u.name as changed_by_name
            FROM order_status_history osh
            LEFT JOIN users u ON osh.changed_by = u.id
            WHERE osh.order_id = ?
            ORDER BY osh.changed_at DESC
        `;

        const historyResult = await executeQuery(historyQuery, [orderId]);

        res.json({
            success: true,
            data: {
                order: order,
                items: itemsResult.success ? itemsResult.data : [],
                status_history: historyResult.success ? historyResult.data : []
            }
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};

// Update order
export const updateOrder = async (req, res) => {
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

        const { orderId } = req.params;
        const {
            status,
            assigned_technician_id,
            estimated_cost,
            actual_cost,
            estimated_completion,
            notes
        } = req.body;

        // Get current order data
        const currentOrderResult = await executeQuery(
            'SELECT status, assigned_technician_id FROM orders WHERE id = ?',
            [orderId]
        );

        if (!currentOrderResult.success || currentOrderResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const currentOrder = currentOrderResult.data[0];

        // Build update query
        const updateFields = [];
        const updateValues = [];

        if (status && status !== currentOrder.status) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }

        if (assigned_technician_id !== undefined) {
            updateFields.push('assigned_technician_id = ?');
            updateValues.push(assigned_technician_id);
        }

        if (estimated_cost !== undefined) {
            updateFields.push('estimated_cost = ?');
            updateValues.push(estimated_cost);
        }

        if (actual_cost !== undefined) {
            updateFields.push('actual_cost = ?');
            updateValues.push(actual_cost);
        }

        if (estimated_completion !== undefined) {
            updateFields.push('estimated_completion = ?');
            updateValues.push(estimated_completion);
        }

        if (notes !== undefined) {
            updateFields.push('notes = ?');
            updateValues.push(notes);
        }

        if (status === 'completed') {
            updateFields.push('completed_at = CURRENT_TIMESTAMP');
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
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

        // Add status history if status changed
        if (status && status !== currentOrder.status) {
            await executeQuery(`
                INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
                VALUES (?, ?, ?, ?, ?)
            `, [orderId, currentOrder.status, status, req.user.id, notes || `Status changed to ${status}`]);
        }

        res.json({
            success: true,
            message: 'Order updated successfully'
        });

    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order'
        });
    }
};

// Get order statistics
export const getOrderStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateCondition = '';
        let queryParams = [];

        if (start_date && end_date) {
            dateCondition = 'WHERE DATE(created_at) BETWEEN ? AND ?';
            queryParams = [start_date, end_date];
        }

        // Get status distribution
        const statusStatsResult = await executeQuery(`
            SELECT status, COUNT(*) as count
            FROM orders
            ${dateCondition}
            GROUP BY status
        `, queryParams);

        // Get priority distribution
        const priorityStatsResult = await executeQuery(`
            SELECT priority, COUNT(*) as count
            FROM orders
            ${dateCondition}
            GROUP BY priority
        `, queryParams);

        // Get daily orders count
        const dailyOrdersResult = await executeQuery(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM orders
            ${dateCondition}
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at) DESC
            LIMIT 30
        `, queryParams);

        // Get revenue data
        const revenueResult = await executeQuery(`
            SELECT 
                SUM(actual_cost) as total_revenue,
                COUNT(*) as completed_orders
            FROM orders
            WHERE status = 'completed'
            ${dateCondition ? 'AND ' + dateCondition.replace('WHERE ', '') : ''}
        `, queryParams);

        res.json({
            success: true,
            data: {
                status_distribution: statusStatsResult.success ? statusStatsResult.data : [],
                priority_distribution: priorityStatsResult.success ? priorityStatsResult.data : [],
                daily_orders: dailyOrdersResult.success ? dailyOrdersResult.data : [],
                revenue: revenueResult.success ? revenueResult.data[0] : { total_revenue: 0, completed_orders: 0 }
            }
        });

    } catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics'
        });
    }
};

// Get orders pending vendor approval/response
export const getVendorOrders = async (req, res) => {
    try {
        const { 
            status, 
            priority, 
            page = 1, 
            limit = 20,
            search,
            start_date,
            end_date 
        } = req.query;

        let whereConditions = ['1=1'];
        let queryParams = [];

        // Status filter - focus on orders that need vendor attention
        if (status) {
            whereConditions.push('o.status = ?');
            queryParams.push(status);
        } else {
            // Default to orders that need vendor attention
            whereConditions.push('o.status IN (?, ?, ?)');
            queryParams.push('pending', 'confirmed', 'in_progress');
        }

        // Priority filter
        if (priority) {
            whereConditions.push('o.priority = ?');
            queryParams.push(priority);
        }

        // Search filter
        if (search) {
            whereConditions.push('(o.order_number LIKE ? OR o.device_type LIKE ? OR o.device_brand LIKE ? OR u.name LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Date range filter
        if (start_date) {
            whereConditions.push('DATE(o.created_at) >= ?');
            queryParams.push(start_date);
        }
        if (end_date) {
            whereConditions.push('DATE(o.created_at) <= ?');
            queryParams.push(end_date);
        }

        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE ${whereConditions.join(' AND ')}
        `;
        
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult.success ? countResult.data[0].total : 0;

        // Get orders
        const ordersQuery = `
            SELECT 
                o.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                c.customer_code,
                c.address as customer_address,
                c.city as customer_city,
                c.state as customer_state,
                c.zip_code as customer_zip,
                tech.name as technician_name,
                tech.email as technician_email,
                rc.name as repair_center_name,
                rc.phone as repair_center_phone
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            LEFT JOIN users tech ON o.assigned_technician_id = tech.id
            LEFT JOIN repair_centers rc ON o.repair_center_id = rc.id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY 
                CASE o.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END ASC,
                o.created_at ASC
            LIMIT ? OFFSET ?
        `;

        queryParams.push(parseInt(limit), offset);
        const ordersResult = await executeQuery(ordersQuery, queryParams);

        if (!ordersResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch vendor orders'
            });
        }

        res.json({
            success: true,
            data: {
                orders: ordersResult.data,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: total,
                    total_pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor orders'
        });
    }
};

// Vendor order response/approval
export const respondToOrder = async (req, res) => {
    try {
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

        // Determine new status and fields based on action
        switch (action) {
            case 'approve':
                newStatus = 'confirmed';
                if (estimated_cost) {
                    updateFields.push('estimated_cost = ?');
                    updateValues.push(parseFloat(estimated_cost));
                }
                if (estimated_completion) {
                    updateFields.push('estimated_completion = ?');
                    updateValues.push(estimated_completion);
                }
                if (assigned_technician_id) {
                    // Verify technician exists
                    const techResult = await executeQuery(
                        'SELECT id FROM users WHERE id = ? AND role IN (?, ?)',
                        [assigned_technician_id, 'technician', 'manager']
                    );
                    if (techResult.success && techResult.data.length > 0) {
                        updateFields.push('assigned_technician_id = ?');
                        updateValues.push(assigned_technician_id);
                    }
                }
                if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
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

        // Update order in transaction
        const queries = [
            {
                sql: `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
                params: updateValues
            },
            {
                sql: `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
                      VALUES (?, ?, ?, ?, ?)`,
                params: [orderId, currentOrder.status, newStatus, req.user.id, `Vendor ${action} - ${req.user.name}`]
            }
        ];

        const transactionResult = await executeTransaction(queries);

        if (!transactionResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to process vendor response'
            });
        }

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
};

// Respond to disposal request (vendor action)
export const respondToDisposalRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;

        // Validate required fields
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        // Validate status values
        const validStatuses = ['approved', 'rejected', 'pickup_scheduled', 'out_for_pickup', 'pickup_completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Get current request to validate
        const currentRequest = await executeQuery(
            'SELECT * FROM disposal_requests WHERE request_id = ? OR id = ?',
            [requestId, requestId]
        );

        if (!currentRequest.success || currentRequest.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Disposal request not found'
            });
        }

        const request = currentRequest.data[0];

        // Update disposal request status
        let updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
        let updateValues = [status];

        // Add pickup datetime for scheduled pickups
        if (status === 'pickup_scheduled' && req.body.pickup_datetime) {
            updateFields.push('pickup_datetime = ?');
            updateValues.push(req.body.pickup_datetime);
        }

        const query = `
            UPDATE disposal_requests 
            SET ${updateFields.join(', ')}
            WHERE request_id = ? OR id = ?
        `;
        updateValues.push(requestId, requestId);

        const result = await executeQuery(query, updateValues);

        if (!result.success) {
            throw new Error('Failed to update disposal request');
        }

        // Log the status change (optional - create a simple log)
        const action = status === 'approved' ? 'approved' : 
                     status === 'rejected' ? 'rejected' : 
                     status === 'pickup_scheduled' ? 'scheduled pickup' :
                     status === 'out_for_pickup' ? 'started pickup' :
                     status === 'pickup_completed' ? 'completed pickup' : 'updated';

        console.log(`✅ Disposal request ${request.request_id} ${action} by user ${req.user.name}`);

        res.json({
            success: true,
            message: `Disposal request ${action} successfully`,
            data: {
                request_id: request.request_id,
                status: status,
                updated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error responding to disposal request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update disposal request',
            error: error.message
        });
    }
};

// Get vendor dashboard statistics
export const getVendorDashboard = async (req, res) => {
    try {
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

        // Get urgent orders
        const urgentOrdersResult = await executeQuery(`
            SELECT COUNT(*) as urgent_count
            FROM orders 
            WHERE priority = 'urgent' AND status IN ('pending', 'confirmed', 'in_progress')
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
                o.status,
                u.name as customer_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE o.status IN ('pending', 'confirmed')
            ORDER BY 
                CASE o.priority 
                    WHEN 'urgent' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    WHEN 'low' THEN 4
                END ASC,
                o.created_at ASC
            LIMIT 10
        `);

        // Get technician workload
        const technicianWorkloadResult = await executeQuery(`
            SELECT 
                u.name as technician_name,
                COUNT(o.id) as active_orders
            FROM users u
            LEFT JOIN orders o ON u.id = o.assigned_technician_id AND o.status IN ('confirmed', 'in_progress')
            WHERE u.role IN ('technician', 'manager')
            GROUP BY u.id, u.name
            ORDER BY active_orders DESC
        `);

        res.json({
            success: true,
            data: {
                status_stats: statusStatsResult.success ? statusStatsResult.data : [],
                pending_orders: pendingOrdersResult.success ? pendingOrdersResult.data[0].pending_count : 0,
                urgent_orders: urgentOrdersResult.success ? urgentOrdersResult.data[0].urgent_count : 0,
                today_orders: todayOrdersResult.success ? todayOrdersResult.data[0].today_count : 0,
                monthly_revenue: monthlyRevenueResult.success ? monthlyRevenueResult.data[0].monthly_revenue : 0,
                completed_orders: monthlyRevenueResult.success ? monthlyRevenueResult.data[0].completed_orders : 0,
                recent_orders: recentOrdersResult.success ? recentOrdersResult.data : [],
                technician_workload: technicianWorkloadResult.success ? technicianWorkloadResult.data : []
            }
        });

    } catch (error) {
        console.error('Vendor dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch vendor dashboard data'
        });
    }
};