import { executeQuery, executeRawQuery } from '../config/database.js';

const createDeviceLogsTable = async () => {
    try {
        console.log('📋 Creating comprehensive device_activity_logs table...');

        // Create comprehensive device activity logs table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS device_activity_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                log_type ENUM(
                    'registration', 
                    'movement', 
                    'transfer', 
                    'disposal_request', 
                    'disposal_approved', 
                    'disposal_completed',
                    'resource_exchange_request',
                    'resource_exchange_response',
                    'resource_exchange_accepted',
                    'resource_exchange_completed',
                    'maintenance',
                    'repair',
                    'condition_update',
                    'warranty_update',
                    'specification_update',
                    'location_update',
                    'department_transfer',
                    'status_change',
                    'qr_scan',
                    'manual_log'
                ) NOT NULL,
                action_description TEXT NOT NULL,
                
                -- Activity details
                from_location VARCHAR(255),
                to_location VARCHAR(255),
                from_department VARCHAR(100),
                to_department VARCHAR(100),
                from_user_id INT,
                to_user_id INT,
                
                -- Related records
                related_request_id INT,
                related_exchange_id INT,
                related_disposal_id INT,
                
                -- Device state changes
                previous_condition ENUM('excellent', 'good', 'fair', 'poor', 'damaged'),
                new_condition ENUM('excellent', 'good', 'fair', 'poor', 'damaged'),
                previous_status VARCHAR(50),
                new_status VARCHAR(50),
                
                -- Additional data
                metadata JSON,
                notes TEXT,
                attachments JSON,
                
                -- Who performed the action
                performed_by INT NOT NULL,
                performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- System info
                ip_address VARCHAR(45),
                user_agent TEXT,
                
                INDEX idx_device_id (device_id),
                INDEX idx_log_type (log_type),
                INDEX idx_performed_by (performed_by),
                INDEX idx_performed_at (performed_at),
                
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        console.log('✅ Device activity logs table created successfully');

        // Create device state history table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS device_state_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                field_name VARCHAR(100) NOT NULL,
                old_value TEXT,
                new_value TEXT,
                change_reason TEXT,
                changed_by INT NOT NULL,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_device_id (device_id),
                INDEX idx_changed_at (changed_at),
                
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Device state history table created successfully');

        // Create device QR scan logs table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS device_qr_scans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                scanned_by INT,
                scan_location VARCHAR(255),
                scan_purpose ENUM('view', 'verify', 'transfer', 'maintenance', 'disposal', 'other') DEFAULT 'view',
                scan_result ENUM('success', 'failed', 'unauthorized') DEFAULT 'success',
                scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                
                INDEX idx_device_id (device_id),
                INDEX idx_scanned_by (scanned_by),
                INDEX idx_scanned_at (scanned_at),
                
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (scanned_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        console.log('✅ Device QR scan logs table created successfully');

        // Create device performance metrics table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS device_performance_metrics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                metric_type ENUM('uptime', 'usage_hours', 'maintenance_count', 'repair_count', 'efficiency_score') NOT NULL,
                metric_value DECIMAL(10,2) NOT NULL,
                measurement_date DATE NOT NULL,
                recorded_by INT,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_device_id (device_id),
                INDEX idx_metric_type (metric_type),
                INDEX idx_measurement_date (measurement_date),
                
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
                
                UNIQUE KEY unique_device_metric_date (device_id, metric_type, measurement_date)
            )
        `);

        console.log('✅ Device performance metrics table created successfully');

        // Create device lifecycle events table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS device_lifecycle_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                lifecycle_stage ENUM(
                    'procurement',
                    'deployment',
                    'active_use',
                    'maintenance',
                    'repair',
                    'storage',
                    'decommission_request',
                    'disposal_preparation',
                    'data_wiping',
                    'parts_harvesting',
                    'recycling',
                    'disposal_complete'
                ) NOT NULL,
                stage_description TEXT,
                expected_duration_days INT,
                actual_duration_days INT,
                stage_status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                managed_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                INDEX idx_device_id (device_id),
                INDEX idx_lifecycle_stage (lifecycle_stage),
                INDEX idx_stage_status (stage_status),
                
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (managed_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `);

        console.log('✅ Device lifecycle events table created successfully');

        console.log('🔧 Creating triggers for automatic logging...');

        // Trigger for device updates to log state changes (using raw query)
        await executeRawQuery(`
            CREATE TRIGGER IF NOT EXISTS device_update_logger
            AFTER UPDATE ON devices
            FOR EACH ROW
            BEGIN
                -- Log condition changes
                IF OLD.condition != NEW.condition THEN
                    INSERT INTO device_activity_logs (
                        device_id, log_type, action_description,
                        previous_condition, new_condition,
                        performed_by, performed_at
                    ) VALUES (
                        NEW.id, 'condition_update',
                        CONCAT('Device condition changed from ', OLD.condition, ' to ', NEW.condition),
                        OLD.condition, NEW.condition,
                        NEW.updated_by, NOW()
                    );
                END IF;

                -- Log location changes
                IF OLD.current_location != NEW.current_location THEN
                    INSERT INTO device_activity_logs (
                        device_id, log_type, action_description,
                        from_location, to_location,
                        performed_by, performed_at
                    ) VALUES (
                        NEW.id, 'location_update',
                        CONCAT('Device moved from ', IFNULL(OLD.current_location, 'Unknown'), ' to ', NEW.current_location),
                        OLD.current_location, NEW.current_location,
                        NEW.updated_by, NOW()
                    );
                END IF;

                -- Log department changes
                IF OLD.department != NEW.department THEN
                    INSERT INTO device_activity_logs (
                        device_id, log_type, action_description,
                        from_department, to_department,
                        performed_by, performed_at
                    ) VALUES (
                        NEW.id, 'department_transfer',
                        CONCAT('Device transferred from ', IFNULL(OLD.department, 'Unknown'), ' to ', NEW.department),
                        OLD.department, NEW.department,
                        NEW.updated_by, NOW()
                    );
                END IF;

                -- Log status changes
                IF OLD.status != NEW.status THEN
                    INSERT INTO device_activity_logs (
                        device_id, log_type, action_description,
                        previous_status, new_status,
                        performed_by, performed_at
                    ) VALUES (
                        NEW.id, 'status_change',
                        CONCAT('Device status changed from ', OLD.status, ' to ', NEW.status),
                        OLD.status, NEW.status,
                        NEW.updated_by, NOW()
                    );
                END IF;
            END
        `);

        // Trigger for new device registration (using raw query)
        await executeRawQuery(`
            CREATE TRIGGER IF NOT EXISTS device_registration_logger
            AFTER INSERT ON devices
            FOR EACH ROW
            BEGIN
                INSERT INTO device_activity_logs (
                    device_id, log_type, action_description,
                    to_location, to_department,
                    new_condition, new_status,
                    performed_by, performed_at
                ) VALUES (
                    NEW.id, 'registration',
                    CONCAT('Device registered: ', NEW.model, ' (', NEW.serial_number, ')'),
                    NEW.current_location, NEW.department,
                    NEW.condition, NEW.status,
                    NEW.created_by, NEW.created_at
                );

                -- Create initial lifecycle event
                INSERT INTO device_lifecycle_events (
                    device_id, lifecycle_stage, stage_description,
                    stage_status, started_at, managed_by
                ) VALUES (
                    NEW.id, 'procurement', 'Device procured and registered in system',
                    'completed', NEW.created_at, NEW.created_by
                );
            END
        `);

        console.log('✅ All triggers created successfully');
        console.log('🎉 Device activity logging system setup complete!');

    } catch (error) {
        console.error('❌ Error creating device logs tables:', error);
        return false;
    }
};

export { createDeviceLogsTable };