import { executeQuery } from '../config/database.js';

class DeviceLogService {
    
    /**
     * Log any device activity with comprehensive details
     */
    static async logActivity({
        deviceId,
        logType,
        actionDescription,
        performedBy,
        fromLocation = null,
        toLocation = null,
        fromDepartment = null,
        toDepartment = null,
        fromUserId = null,
        toUserId = null,
        relatedRequestId = null,
        relatedExchangeId = null,
        relatedDisposalId = null,
        previousCondition = null,
        newCondition = null,
        previousStatus = null,
        newStatus = null,
        metadata = null,
        notes = null,
        attachments = null,
        ipAddress = null,
        userAgent = null
    }) {
        try {
            const result = await executeQuery(`
                INSERT INTO device_activity_logs (
                    device_id, log_type, action_description, performed_by,
                    from_location, to_location, from_department, to_department,
                    from_user_id, to_user_id, related_request_id, related_exchange_id,
                    related_disposal_id, previous_condition, new_condition,
                    previous_status, new_status, metadata, notes, attachments,
                    ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                deviceId, logType, actionDescription, performedBy,
                fromLocation, toLocation, fromDepartment, toDepartment,
                fromUserId, toUserId, relatedRequestId, relatedExchangeId,
                relatedDisposalId, previousCondition, newCondition,
                previousStatus, newStatus, 
                metadata ? JSON.stringify(metadata) : null,
                notes, 
                attachments ? JSON.stringify(attachments) : null,
                ipAddress, userAgent
            ]);

            return result.success;
        } catch (error) {
            console.error('Error logging device activity:', error);
            return false;
        }
    }

    /**
     * Log device QR code scan
     */
    static async logQRScan({
        deviceId,
        scannedBy = null,
        scanLocation = null,
        scanPurpose = 'view',
        scanResult = 'success',
        ipAddress = null,
        userAgent = null
    }) {
        try {
            const result = await executeQuery(`
                INSERT INTO device_qr_scans (
                    device_id, scanned_by, scan_location, scan_purpose,
                    scan_result, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                deviceId, scannedBy, scanLocation, scanPurpose,
                scanResult, ipAddress, userAgent
            ]);

            // Also log as a general activity
            await this.logActivity({
                deviceId,
                logType: 'qr_scan',
                actionDescription: `QR code scanned for ${scanPurpose}`,
                performedBy: scannedBy || 1, // Default to system user if anonymous
                notes: `Scan result: ${scanResult}`,
                metadata: { scanPurpose, scanResult, scanLocation },
                ipAddress,
                userAgent
            });

            return result.success;
        } catch (error) {
            console.error('Error logging QR scan:', error);
            return false;
        }
    }

    /**
     * Log device field changes
     */
    static async logFieldChange({
        deviceId,
        fieldName,
        oldValue,
        newValue,
        changeReason,
        changedBy
    }) {
        try {
            const result = await executeQuery(`
                INSERT INTO device_state_history (
                    device_id, field_name, old_value, new_value,
                    change_reason, changed_by
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                deviceId, fieldName, oldValue, newValue, changeReason, changedBy
            ]);

            return result.success;
        } catch (error) {
            console.error('Error logging field change:', error);
            return false;
        }
    }

    /**
     * Log resource exchange activities
     */
    static async logResourceExchange({
        deviceId,
        exchangeType, // 'request', 'response', 'accepted', 'completed'
        exchangeId,
        requesterId,
        responderId = null,
        exchangeDetails,
        performedBy
    }) {
        try {
            const logTypes = {
                'request': 'resource_exchange_request',
                'response': 'resource_exchange_response', 
                'accepted': 'resource_exchange_accepted',
                'completed': 'resource_exchange_completed'
            };

            const descriptions = {
                'request': 'Device included in resource exchange request',
                'response': 'Response submitted for device exchange',
                'accepted': 'Device exchange response accepted',
                'completed': 'Device exchange completed successfully'
            };

            await this.logActivity({
                deviceId,
                logType: logTypes[exchangeType],
                actionDescription: descriptions[exchangeType],
                performedBy,
                fromUserId: exchangeType === 'completed' ? requesterId : null,
                toUserId: exchangeType === 'completed' ? responderId : null,
                relatedExchangeId: exchangeId,
                metadata: {
                    exchangeType,
                    requesterId,
                    responderId,
                    exchangeDetails
                },
                notes: `Exchange ID: ${exchangeId}`
            });

            return true;
        } catch (error) {
            console.error('Error logging resource exchange:', error);
            return false;
        }
    }

    /**
     * Log disposal activities
     */
    static async logDisposalActivity({
        deviceId,
        disposalType, // 'request', 'approved', 'completed'
        disposalId,
        requesterId,
        disposalDetails,
        performedBy
    }) {
        try {
            const logTypes = {
                'request': 'disposal_request',
                'approved': 'disposal_approved',
                'completed': 'disposal_completed'
            };

            const descriptions = {
                'request': 'Device included in disposal request',
                'approved': 'Device disposal request approved',
                'completed': 'Device disposal completed'
            };

            await this.logActivity({
                deviceId,
                logType: logTypes[disposalType],
                actionDescription: descriptions[disposalType],
                performedBy,
                relatedDisposalId: disposalId,
                metadata: {
                    disposalType,
                    requesterId,
                    disposalDetails
                },
                notes: `Disposal ID: ${disposalId}`
            });

            return true;
        } catch (error) {
            console.error('Error logging disposal activity:', error);
            return false;
        }
    }

    /**
     * Get comprehensive device activity history
     */
    static async getDeviceHistory(deviceId, limit = 50) {
        try {
            const result = await executeQuery(`
                SELECT 
                    dal.*,
                    u.name as performed_by_name,
                    u.department as performed_by_department,
                    fu.name as from_user_name,
                    tu.name as to_user_name
                FROM device_activity_logs dal
                LEFT JOIN users u ON dal.performed_by = u.id
                LEFT JOIN users fu ON dal.from_user_id = fu.id
                LEFT JOIN users tu ON dal.to_user_id = tu.id
                WHERE dal.device_id = ?
                ORDER BY dal.performed_at DESC
                LIMIT ?
            `, [deviceId, limit]);

            if (!result.success) {
                return { success: false, data: [] };
            }

            // Parse JSON fields
            const activities = result.data.map(activity => ({
                ...activity,
                metadata: activity.metadata ? JSON.parse(activity.metadata) : null,
                attachments: activity.attachments ? JSON.parse(activity.attachments) : null
            }));

            return { success: true, data: activities };
        } catch (error) {
            console.error('Error getting device history:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * Get device QR scan history
     */
    static async getQRScanHistory(deviceId, limit = 20) {
        try {
            const result = await executeQuery(`
                SELECT 
                    dqs.*,
                    u.name as scanned_by_name,
                    u.department as scanned_by_department
                FROM device_qr_scans dqs
                LEFT JOIN users u ON dqs.scanned_by = u.id
                WHERE dqs.device_id = ?
                ORDER BY dqs.scanned_at DESC
                LIMIT ?
            `, [deviceId, limit]);

            return result.success ? { success: true, data: result.data } : { success: false, data: [] };
        } catch (error) {
            console.error('Error getting QR scan history:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * Get device state change history
     */
    static async getStateHistory(deviceId, limit = 20) {
        try {
            const result = await executeQuery(`
                SELECT 
                    dsh.*,
                    u.name as changed_by_name,
                    u.department as changed_by_department
                FROM device_state_history dsh
                LEFT JOIN users u ON dsh.changed_by = u.id
                WHERE dsh.device_id = ?
                ORDER BY dsh.changed_at DESC
                LIMIT ?
            `, [deviceId, limit]);

            return result.success ? { success: true, data: result.data } : { success: false, data: [] };
        } catch (error) {
            console.error('Error getting state history:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * Get comprehensive device profile with all activities
     */
    static async getComprehensiveDeviceProfile(deviceId) {
        try {
            // Get device basic info
            const deviceResult = await executeQuery(`
                SELECT d.*, u.name as current_holder_name, u.department as current_department
                FROM devices d
                LEFT JOIN users u ON d.current_holder_id = u.id
                WHERE d.id = ?
            `, [deviceId]);

            if (!deviceResult.success || deviceResult.data.length === 0) {
                return { success: false, message: 'Device not found' };
            }

            const device = deviceResult.data[0];

            // Get all activity logs
            const activityHistory = await this.getDeviceHistory(deviceId, 100);
            
            // Get QR scan history
            const qrScans = await this.getQRScanHistory(deviceId, 50);
            
            // Get state change history
            const stateHistory = await this.getStateHistory(deviceId, 50);

            // Get related resource exchanges
            const exchangesResult = await executeQuery(`
                SELECT re.*, 
                       req.name as requester_name, req.department as requester_department,
                       resp.name as responder_name, resp.department as responder_department
                FROM resource_exchanges re
                LEFT JOIN users req ON re.requester_id = req.id
                LEFT JOIN users resp ON re.responder_id = resp.id
                WHERE JSON_EXTRACT(re.requested_items, '$[*].device_id') LIKE '%${deviceId}%'
                   OR JSON_EXTRACT(re.offered_items, '$[*].device_id') LIKE '%${deviceId}%'
                ORDER BY re.created_at DESC
            `);

            // Get related disposal requests
            const disposalsResult = await executeQuery(`
                SELECT dr.*, u.name as requester_name, u.department as requester_department
                FROM disposal_requests dr
                LEFT JOIN users u ON dr.requester_id = u.id
                WHERE JSON_EXTRACT(dr.items, '$[*].device_id') LIKE '%${deviceId}%'
                ORDER BY dr.created_at DESC
            `);

            // Get device statistics
            const statsResult = await executeQuery(`
                SELECT 
                    COUNT(*) as total_activities,
                    COUNT(CASE WHEN log_type LIKE '%exchange%' THEN 1 END) as exchange_activities,
                    COUNT(CASE WHEN log_type LIKE '%disposal%' THEN 1 END) as disposal_activities,
                    COUNT(CASE WHEN log_type = 'qr_scan' THEN 1 END) as qr_scans,
                    COUNT(CASE WHEN log_type = 'transfer' THEN 1 END) as transfers,
                    MIN(performed_at) as first_activity,
                    MAX(performed_at) as last_activity
                FROM device_activity_logs
                WHERE device_id = ?
            `, [deviceId]);

            return {
                success: true,
                data: {
                    device,
                    statistics: statsResult.success ? statsResult.data[0] : null,
                    activities: activityHistory.data || [],
                    qrScans: qrScans.data || [],
                    stateHistory: stateHistory.data || [],
                    resourceExchanges: exchangesResult.success ? exchangesResult.data : [],
                    disposalRequests: disposalsResult.success ? disposalsResult.data : []
                }
            };
        } catch (error) {
            console.error('Error getting comprehensive device profile:', error);
            return { success: false, message: 'Error retrieving device profile' };
        }
    }

    /**
     * Log device transfer between users
     */
    static async logTransfer({
        deviceId,
        fromUserId,
        toUserId,
        transferReason,
        performedBy,
        approvedBy = null
    }) {
        try {
            // Get user details
            const fromUserResult = await executeQuery('SELECT name, department FROM users WHERE id = ?', [fromUserId]);
            const toUserResult = await executeQuery('SELECT name, department FROM users WHERE id = ?', [toUserId]);

            const fromUser = fromUserResult.success ? fromUserResult.data[0] : null;
            const toUser = toUserResult.success ? toUserResult.data[0] : null;

            await this.logActivity({
                deviceId,
                logType: 'transfer',
                actionDescription: `Device transferred from ${fromUser?.name || 'Unknown'} to ${toUser?.name || 'Unknown'}`,
                performedBy,
                fromUserId,
                toUserId,
                fromDepartment: fromUser?.department,
                toDepartment: toUser?.department,
                metadata: {
                    transferReason,
                    approvedBy,
                    fromUserName: fromUser?.name,
                    toUserName: toUser?.name
                },
                notes: transferReason
            });

            return true;
        } catch (error) {
            console.error('Error logging transfer:', error);
            return false;
        }
    }
}

export default DeviceLogService;