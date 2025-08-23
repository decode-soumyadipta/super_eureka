import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import DeviceLogService from '../services/deviceLogService.js';

// Generate unique device ID
const generateDeviceId = (department, deviceType) => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${department}-${deviceType}-${timestamp}-${random}`;
};

// Register new device
const registerDevice = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            device_name,
            device_type,
            brand,
            model,
            serial_number,
            purchase_date,
            warranty_expiry,
            condition_status,
            current_location,
            specifications,
            notes
        } = req.body;

        // Generate unique device ID and QR code
        const device_id = generateDeviceId(req.user.department, device_type);
        const qr_code = uuidv4();

        // Insert device into database
        const result = await executeQuery(`
            INSERT INTO devices (
                device_id, qr_code, device_name, device_type, brand, model, 
                serial_number, purchase_date, warranty_expiry, condition_status,
                current_location, current_department, registered_by, specifications, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            device_id,
            qr_code,
            device_name,
            device_type,
            brand || null,
            model || null,
            serial_number || null,
            purchase_date || null,
            warranty_expiry || null,
            condition_status || 'good',
            current_location || null,
            req.user.department,
            req.user.id,
            specifications ? JSON.stringify(specifications) : null,
            notes || null
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to register device'
            });
        }

        const deviceDbId = result.data.insertId;

        // Log the registration action using comprehensive logging
        await DeviceLogService.logActivity({
            deviceId: deviceDbId,
            logType: 'registration',
            actionDescription: `Device "${device_name}" registered in ${req.user.department} department`,
            performedBy: req.user.id,
            toLocation: current_location || req.user.department,
            toDepartment: req.user.department,
            newCondition: condition_status,
            metadata: {
                device_id,
                device_type,
                brand,
                model,
                serial_number,
                specifications
            },
            notes: `Device registered by ${req.user.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Generate QR code data URL
        const qrData = JSON.stringify({
            device_id,
            qr_code,
            device_name,
            device_type,
            department: req.user.department,
            registered_date: new Date().toISOString()
        });

        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: parseInt(process.env.QR_CODE_SIZE) || 256,
            margin: 2
        });

        res.status(201).json({
            success: true,
            message: 'Device registered successfully',
            data: {
                device: {
                    id: deviceDbId,
                    device_id,
                    qr_code,
                    device_name,
                    device_type,
                    current_location,
                    current_department: req.user.department,
                    registration_date: new Date().toISOString()
                },
                qr_code_url: qrCodeDataURL
            }
        });

    } catch (error) {
        console.error('Device registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get device by QR code with comprehensive history
const getDeviceByQR = async (req, res) => {
    try {
        const { qr_code } = req.params;

        const result = await executeQuery(`
            SELECT d.*, u.name as registered_by_name
            FROM devices d
            LEFT JOIN users u ON d.registered_by = u.id
            WHERE d.qr_code = ? AND d.is_active = TRUE
        `, [qr_code]);

        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = result.data[0];

        // Log QR scan activity
        await DeviceLogService.logQRScan({
            deviceId: device.id,
            scannedBy: req.user?.id || null,
            scanLocation: req.body.scan_location || null,
            scanPurpose: 'view',
            scanResult: 'success',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Get comprehensive device history
        const [activityHistory, qrScanHistory, stateHistory, activityStats] = await Promise.all([
            DeviceLogService.getDeviceHistory(device.id),
            DeviceLogService.getQRScanHistory(device.id),
            DeviceLogService.getStateHistory(device.id),
            DeviceLogService.getDeviceActivityStats(device.id)
        ]);

        res.json({
            success: true,
            data: {
                device: {
                    ...device,
                    specifications: device.specifications ? JSON.parse(device.specifications) : null
                },
                activity_history: activityHistory.data || [],
                qr_scan_history: qrScanHistory.data || [],
                state_history: stateHistory.data || [],
                activity_stats: activityStats.data || []
            }
        });

    } catch (error) {
        console.error('Device fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get all devices for department
const getDepartmentDevices = async (req, res) => {
    try {
        const department = req.user.role === 'admin' ? req.query.department || req.user.department : req.user.department;

        const result = await executeQuery(`
            SELECT d.*, u.name as registered_by_name
            FROM devices d
            LEFT JOIN users u ON d.registered_by = u.id
            WHERE d.current_department = ? AND d.is_active = TRUE
            ORDER BY d.registration_date DESC
        `, [department]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch devices'
            });
        }

        const devices = result.data.map(device => ({
            ...device,
            specifications: device.specifications ? JSON.parse(device.specifications) : null
        }));

        res.json({
            success: true,
            data: { devices }
        });

    } catch (error) {
        console.error('Devices fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Move device to different location with logging
const moveDevice = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { device_id } = req.params;
        const { to_location, notes } = req.body;

        // Get current device info
        const deviceResult = await executeQuery(
            'SELECT id, current_location, current_department FROM devices WHERE device_id = ? AND is_active = TRUE',
            [device_id]
        );

        if (!deviceResult.success || deviceResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = deviceResult.data[0];

        // Update device location
        const updateResult = await executeQuery(
            'UPDATE devices SET current_location = ? WHERE id = ?',
            [to_location, device.id]
        );

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update device location'
            });
        }

        // Log the movement with comprehensive details
        await DeviceLogService.logActivity({
            deviceId: device.id,
            logType: 'location_update',
            actionDescription: `Device moved from "${device.current_location}" to "${to_location}"`,
            performedBy: req.user.id,
            fromLocation: device.current_location,
            toLocation: to_location,
            metadata: {
                movement_type: 'location_change',
                authorized_by: req.user.name
            },
            notes: notes || `Device moved by ${req.user.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Log field change
        await DeviceLogService.logFieldChange({
            deviceId: device.id,
            fieldName: 'current_location',
            oldValue: device.current_location,
            newValue: to_location,
            changeReason: 'Location update requested',
            changedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'Device location updated successfully'
        });

    } catch (error) {
        console.error('Device move error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Transfer device between departments
const transferDevice = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { to_department, to_user_id, reason, notes } = req.body;

        // Get current device info
        const deviceResult = await executeQuery(`
            SELECT id, device_name, current_department, current_location, assigned_to 
            FROM devices WHERE device_id = ? AND is_active = TRUE
        `, [device_id]);

        if (!deviceResult.success || deviceResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = deviceResult.data[0];

        // Update device department and assignment
        const updateResult = await executeQuery(`
            UPDATE devices 
            SET current_department = ?, assigned_to = ? 
            WHERE id = ?
        `, [to_department, to_user_id || null, device.id]);

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to transfer device'
            });
        }

        // Log the transfer with comprehensive details
        await DeviceLogService.logActivity({
            deviceId: device.id,
            logType: 'department_transfer',
            actionDescription: `Device transferred from ${device.current_department} to ${to_department}`,
            performedBy: req.user.id,
            fromDepartment: device.current_department,
            toDepartment: to_department,
            fromUserId: device.assigned_to,
            toUserId: to_user_id || null,
            metadata: {
                transfer_reason: reason,
                device_name: device.device_name,
                authorized_by: req.user.name
            },
            notes: notes || `Device transferred by ${req.user.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Device transferred successfully'
        });

    } catch (error) {
        console.error('Device transfer error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Update device condition
const updateDeviceCondition = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { condition_status, notes } = req.body;

        // Get current device info
        const deviceResult = await executeQuery(
            'SELECT id, condition_status FROM devices WHERE device_id = ? AND is_active = TRUE',
            [device_id]
        );

        if (!deviceResult.success || deviceResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = deviceResult.data[0];

        // Update condition
        const updateResult = await executeQuery(
            'UPDATE devices SET condition_status = ? WHERE id = ?',
            [condition_status, device.id]
        );

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update device condition'
            });
        }

        // Log the condition update
        await DeviceLogService.logActivity({
            deviceId: device.id,
            logType: 'condition_update',
            actionDescription: `Device condition updated from "${device.condition_status}" to "${condition_status}"`,
            performedBy: req.user.id,
            previousCondition: device.condition_status,
            newCondition: condition_status,
            metadata: {
                update_type: 'condition_change',
                updated_by: req.user.name
            },
            notes: notes || `Condition updated by ${req.user.name}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        // Log field change
        await DeviceLogService.logFieldChange({
            deviceId: device.id,
            fieldName: 'condition_status',
            oldValue: device.condition_status,
            newValue: condition_status,
            changeReason: 'Condition assessment update',
            changedBy: req.user.id
        });

        res.json({
            success: true,
            message: 'Device condition updated successfully'
        });

    } catch (error) {
        console.error('Device condition update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get department statistics for dashboard
const getDepartmentStats = async (req, res) => {
    try {
        const department = req.user.role === 'admin' ? req.query.department || req.user.department : req.user.department;

        // Get total devices count
        const totalDevicesResult = await executeQuery(`
            SELECT COUNT(*) as total_devices
            FROM devices 
            WHERE current_department = ? AND is_active = TRUE
        `, [department]);

        // Get devices by condition status
        const conditionStatsResult = await executeQuery(`
            SELECT condition_status, COUNT(*) as count
            FROM devices 
            WHERE current_department = ? AND is_active = TRUE
            GROUP BY condition_status
        `, [department]);

        // Get devices by type
        const typeStatsResult = await executeQuery(`
            SELECT device_type, COUNT(*) as count
            FROM devices 
            WHERE current_department = ? AND is_active = TRUE
            GROUP BY device_type
            ORDER BY count DESC
            LIMIT 10
        `, [department]);

        // Get recent activities (last 7 days)
        const recentActivitiesResult = await executeQuery(`
            SELECT COUNT(*) as recent_activities
            FROM device_logs dl
            JOIN devices d ON dl.device_id = d.id
            WHERE d.current_department = ? AND dl.action_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [department]);

        // Get devices needing maintenance (warranty expired or poor condition)
        const maintenanceNeededResult = await executeQuery(`
            SELECT COUNT(*) as maintenance_needed
            FROM devices 
            WHERE current_department = ? AND is_active = TRUE 
            AND (condition_status IN ('poor', 'damaged') OR warranty_expiry < CURDATE())
        `, [department]);

        // Get monthly registration trend (last 6 months)
        const monthlyTrendResult = await executeQuery(`
            SELECT 
                DATE_FORMAT(registration_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM devices 
            WHERE current_department = ? AND is_active = TRUE
            AND registration_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(registration_date, '%Y-%m')
            ORDER BY month
        `, [department]);

        const stats = {
            total_devices: totalDevicesResult.success ? totalDevicesResult.data[0].total_devices : 0,
            condition_breakdown: conditionStatsResult.success ? conditionStatsResult.data : [],
            device_types: typeStatsResult.success ? typeStatsResult.data : [],
            recent_activities: recentActivitiesResult.success ? recentActivitiesResult.data[0].recent_activities : 0,
            maintenance_needed: maintenanceNeededResult.success ? maintenanceNeededResult.data[0].maintenance_needed : 0,
            monthly_trend: monthlyTrendResult.success ? monthlyTrendResult.data : [],
            department: department
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Department stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get comprehensive device profile with all activities (for QR code scanning)
const getDeviceProfile = async (req, res) => {
    try {
        const { device_id, qr_code } = req.params;
        
        // Find device by either device_id or qr_code
        const deviceQuery = device_id 
            ? 'SELECT * FROM devices WHERE device_id = ? AND is_active = TRUE'
            : 'SELECT * FROM devices WHERE qr_code = ? AND is_active = TRUE';
        
        const deviceParam = device_id || qr_code;

        const deviceResult = await executeQuery(deviceQuery, [deviceParam]);

        if (!deviceResult.success || deviceResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = deviceResult.data[0];

        // Log QR scan activity if accessed via QR code
        if (qr_code) {
            await DeviceLogService.logQRScan({
                deviceId: device.id,
                scannedBy: req.user?.id || null,
                scanLocation: req.body.scan_location || req.query.scan_location || null,
                scanPurpose: req.query.purpose || 'profile_view',
                scanResult: 'success',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });
        }

        // Get comprehensive device data in parallel
        const [
            activityHistory,
            qrScanHistory, 
            stateHistory,
            activityStats,
            resourceExchanges,
            disposalRequests,
            fieldChanges,
            recentActivities
        ] = await Promise.all([
            // Complete activity history
            executeQuery(`
                SELECT 
                    dal.*,
                    u1.name as performed_by_name,
                    u2.name as from_user_name,
                    u3.name as to_user_name,
                    dr.request_id as disposal_request_id,
                    dr.status as disposal_status
                FROM device_activity_logs dal
                LEFT JOIN users u1 ON dal.performed_by = u1.id
                LEFT JOIN users u2 ON dal.from_user_id = u2.id  
                LEFT JOIN users u3 ON dal.to_user_id = u3.id
                LEFT JOIN disposal_requests dr ON dal.related_disposal_id = dr.id
                WHERE dal.device_id = ?
                ORDER BY dal.action_date DESC
                LIMIT 100
            `, [device.id]),

            // QR scan history
            executeQuery(`
                SELECT 
                    dqs.*,
                    u.name as scanned_by_name
                FROM device_qr_scans dqs
                LEFT JOIN users u ON dqs.scanned_by = u.id
                WHERE dqs.device_id = ?
                ORDER BY dqs.scan_date DESC
                LIMIT 50
            `, [device.id]),

            // State change history
            executeQuery(`
                SELECT 
                    dsh.*,
                    u.name as changed_by_name
                FROM device_state_history dsh
                LEFT JOIN users u ON dsh.changed_by = u.id
                WHERE dsh.device_id = ?
                ORDER BY dsh.change_date DESC
                LIMIT 50
            `, [device.id]),

            // Activity statistics
            executeQuery(`
                SELECT 
                    log_type,
                    COUNT(*) as count,
                    MAX(action_date) as last_occurrence
                FROM device_activity_logs
                WHERE device_id = ?
                GROUP BY log_type
                ORDER BY count DESC
            `, [device.id]),

            // Resource exchanges involving this device
            executeQuery(`
                SELECT 
                    re.*,
                    u1.name as offered_by_name,
                    u2.name as requested_by_name,
                    rei.quantity as device_quantity
                FROM resource_exchanges re
                LEFT JOIN users u1 ON re.offered_by = u1.id
                LEFT JOIN users u2 ON re.requested_by = u2.id
                JOIN resource_exchange_items rei ON re.id = rei.exchange_id
                WHERE rei.item_type = 'device' AND rei.item_id = ?
                ORDER BY re.created_at DESC
                LIMIT 20
            `, [device.id]),

            // Disposal requests involving this device
            executeQuery(`
                SELECT 
                    dr.*,
                    u.name as created_by_name
                FROM disposal_requests dr
                LEFT JOIN users u ON dr.created_by = u.id
                WHERE dr.id IN (
                    SELECT DISTINCT related_disposal_id 
                    FROM device_activity_logs 
                    WHERE device_id = ? AND related_disposal_id IS NOT NULL
                )
                ORDER BY dr.created_at DESC
            `, [device.id]),

            // Field changes history
            executeQuery(`
                SELECT 
                    dfc.*,
                    u.name as changed_by_name
                FROM device_field_changes dfc
                LEFT JOIN users u ON dfc.changed_by = u.id
                WHERE dfc.device_id = ?
                ORDER BY dfc.change_date DESC
                LIMIT 30
            `, [device.id]),

            // Recent activities (last 30 days)
            executeQuery(`
                SELECT 
                    dal.log_type,
                    dal.action_description,
                    dal.action_date,
                    u.name as performed_by_name
                FROM device_activity_logs dal
                LEFT JOIN users u ON dal.performed_by = u.id
                WHERE dal.device_id = ? 
                AND dal.action_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY dal.action_date DESC
                LIMIT 10
            `, [device.id])
        ]);

        // Parse specifications if exists
        const deviceData = {
            ...device,
            specifications: device.specifications ? JSON.parse(device.specifications) : null
        };

        // Calculate device metrics
        const totalActivities = activityHistory.success ? activityHistory.data.length : 0;
        const totalScans = qrScanHistory.success ? qrScanHistory.data.length : 0;
        const totalExchanges = resourceExchanges.success ? resourceExchanges.data.length : 0;
        const totalDisposalRequests = disposalRequests.success ? disposalRequests.data.length : 0;

        // Get current device status summary
        const statusSummary = {
            condition: device.condition_status,
            location: device.current_location,
            department: device.current_department,
            disposal_status: device.disposal_status,
            is_active: device.is_active,
            last_activity: activityHistory.success && activityHistory.data.length > 0 
                ? activityHistory.data[0].action_date 
                : device.registration_date,
            registration_age_days: Math.floor(
                (new Date() - new Date(device.registration_date)) / (1000 * 60 * 60 * 24)
            )
        };

        // Prepare comprehensive response
        const profileData = {
            device: deviceData,
            status_summary: statusSummary,
            metrics: {
                total_activities: totalActivities,
                total_qr_scans: totalScans,
                total_exchanges: totalExchanges,
                total_disposal_requests: totalDisposalRequests
            },
            activity_history: activityHistory.success ? activityHistory.data : [],
            qr_scan_history: qrScanHistory.success ? qrScanHistory.data : [],
            state_history: stateHistory.success ? stateHistory.data : [],
            activity_stats: activityStats.success ? activityStats.data : [],
            resource_exchanges: resourceExchanges.success ? resourceExchanges.data : [],
            disposal_requests: disposalRequests.success ? disposalRequests.data : [],
            field_changes: fieldChanges.success ? fieldChanges.data : [],
            recent_activities: recentActivities.success ? recentActivities.data : []
        };

        res.json({
            success: true,
            message: 'Device profile retrieved successfully',
            data: profileData
        });

    } catch (error) {
        console.error('Device profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get device audit trail (detailed timeline of all activities)
const getDeviceAuditTrail = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { start_date, end_date, activity_type, limit = 100 } = req.query;

        // Find device
        const deviceResult = await executeQuery(
            'SELECT id, device_id, device_name FROM devices WHERE device_id = ?',
            [device_id]
        );

        if (!deviceResult.success || deviceResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        const device = deviceResult.data[0];

        // Build audit trail query with filters
        let auditQuery = `
            SELECT 
                'activity' as source_type,
                dal.action_date as timestamp,
                dal.log_type as event_type,
                dal.action_description as description,
                dal.notes,
                dal.metadata,
                dal.ip_address,
                u.name as performed_by_name,
                dal.from_location,
                dal.to_location,
                dal.from_department,
                dal.to_department,
                dal.previous_condition,
                dal.new_condition
            FROM device_activity_logs dal
            LEFT JOIN users u ON dal.performed_by = u.id
            WHERE dal.device_id = ?
        `;

        const queryParams = [device.id];

        // Add date filters
        if (start_date) {
            auditQuery += ' AND dal.action_date >= ?';
            queryParams.push(start_date);
        }
        if (end_date) {
            auditQuery += ' AND dal.action_date <= ?';
            queryParams.push(end_date);
        }
        if (activity_type) {
            auditQuery += ' AND dal.log_type = ?';
            queryParams.push(activity_type);
        }

        auditQuery += `
            UNION ALL
            SELECT 
                'qr_scan' as source_type,
                dqs.scan_date as timestamp,
                'qr_scan' as event_type,
                CONCAT('QR code scanned for ', dqs.scan_purpose) as description,
                dqs.scan_notes as notes,
                JSON_OBJECT('scan_location', dqs.scan_location, 'scan_result', dqs.scan_result) as metadata,
                dqs.ip_address,
                u.name as performed_by_name,
                dqs.scan_location as from_location,
                null as to_location,
                null as from_department,
                null as to_department,
                null as previous_condition,
                null as new_condition
            FROM device_qr_scans dqs
            LEFT JOIN users u ON dqs.scanned_by = u.id
            WHERE dqs.device_id = ?
        `;

        queryParams.push(device.id);

        if (start_date) {
            auditQuery += ' AND dqs.scan_date >= ?';
            queryParams.push(start_date);
        }
        if (end_date) {
            auditQuery += ' AND dqs.scan_date <= ?';
            queryParams.push(end_date);
        }

        auditQuery += `
            ORDER BY timestamp DESC
            LIMIT ?
        `;
        queryParams.push(parseInt(limit));

        const auditResult = await executeQuery(auditQuery, queryParams);

        // Get summary statistics
        const summaryResult = await executeQuery(`
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT DATE(dal.action_date)) as active_days,
                MIN(dal.action_date) as first_activity,
                MAX(dal.action_date) as last_activity
            FROM device_activity_logs dal
            WHERE dal.device_id = ?
        `, [device.id]);

        const auditTrail = {
            device: {
                id: device.id,
                device_id: device.device_id,
                device_name: device.device_name
            },
            summary: summaryResult.success ? summaryResult.data[0] : {},
            events: auditResult.success ? auditResult.data.map(event => ({
                ...event,
                metadata: event.metadata ? JSON.parse(event.metadata) : null
            })) : [],
            filters: {
                start_date,
                end_date,
                activity_type,
                limit: parseInt(limit)
            }
        };

        res.json({
            success: true,
            message: 'Device audit trail retrieved successfully',
            data: auditTrail
        });

    } catch (error) {
        console.error('Device audit trail error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Validation rules
const deviceRegistrationValidation = [
    body('device_name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Device name must be between 2 and 255 characters'),
    body('device_type')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Device type is required'),
    body('brand')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Brand name too long'),
    body('model')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Model name too long'),
    body('serial_number')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Serial number too long'),
    body('condition_status')
        .optional()
        .isIn(['excellent', 'good', 'fair', 'poor', 'damaged'])
        .withMessage('Invalid condition status'),
    body('current_location')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Location name too long')
];

const deviceMoveValidation = [
    body('to_location')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Destination location is required')
];

export { 
    registerDevice, 
    getDeviceByQR, 
    getDepartmentDevices, 
    getDepartmentStats,
    moveDevice,
    transferDevice,
    updateDeviceCondition,
    getDeviceProfile,        // New comprehensive QR profile endpoint
    getDeviceAuditTrail,     // New audit trail endpoint
    deviceRegistrationValidation,
    deviceMoveValidation
};