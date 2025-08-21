import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

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

        // Log the registration action
        await executeQuery(`
            INSERT INTO device_logs (device_id, action_type, to_location, performed_by, notes)
            VALUES (?, 'registered', ?, ?, ?)
        `, [
            result.data.insertId,
            current_location || req.user.department,
            req.user.id,
            `Device registered by ${req.user.name}`
        ]);

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
                    id: result.data.insertId,
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

// Get device by QR code
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

        // Get device logs
        const logsResult = await executeQuery(`
            SELECT dl.*, u.name as performed_by_name
            FROM device_logs dl
            LEFT JOIN users u ON dl.performed_by = u.id
            WHERE dl.device_id = ?
            ORDER BY dl.action_date DESC
        `, [device.id]);

        res.json({
            success: true,
            data: {
                device: {
                    ...device,
                    specifications: device.specifications ? JSON.parse(device.specifications) : null
                },
                logs: logsResult.success ? logsResult.data : []
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

// Move device to different location
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

        // Log the movement
        await executeQuery(`
            INSERT INTO device_logs (device_id, action_type, from_location, to_location, performed_by, notes)
            VALUES (?, 'moved', ?, ?, ?, ?)
        `, [
            device.id,
            device.current_location,
            to_location,
            req.user.id,
            notes || `Device moved by ${req.user.name}`
        ]);

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
    deviceRegistrationValidation,
    deviceMoveValidation
};