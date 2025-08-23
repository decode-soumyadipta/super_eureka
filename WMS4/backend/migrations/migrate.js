import { initializeDatabase, executeQuery } from '../config/database.js';
import createDisposalRequestsTable from './create_disposal_requests_table.js';
import createIPFSUploadsTable from './create_ipfs_uploads_table.js';
import createCommunityTables from './create_community_tables.js';
import { createDeviceLogsTable as createDeviceActivityLogsTable } from './create_device_activity_logs.js';
import process from 'process';

// Create all necessary tables for the e-waste management system
const createTables = async () => {
    console.log('🚀 Starting database migration...');

    try {
        // Initialize database first
        await initializeDatabase();

        // Create users table
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                department VARCHAR(100) NOT NULL,
                role ENUM('admin', 'user', 'vendor') DEFAULT 'user',
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `;

        // Create devices table for electronic devices
        const createDevicesTable = `
            CREATE TABLE IF NOT EXISTS devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(100) UNIQUE NOT NULL,
                qr_code VARCHAR(255) UNIQUE NOT NULL,
                device_name VARCHAR(255) NOT NULL,
                device_type VARCHAR(100) NOT NULL,
                brand VARCHAR(100),
                model VARCHAR(100),
                serial_number VARCHAR(255),
                purchase_date DATE,
                warranty_expiry DATE,
                condition_status ENUM('excellent', 'good', 'fair', 'poor', 'damaged') DEFAULT 'good',
                current_location VARCHAR(255),
                current_department VARCHAR(100),
                assigned_to INT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                registered_by INT NOT NULL,
                specifications JSON,
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (assigned_to) REFERENCES users(id),
                FOREIGN KEY (registered_by) REFERENCES users(id)
            )
        `;

        // Create device_logs table for tracking device movements
        const createDeviceLogsTable = `
            CREATE TABLE IF NOT EXISTS device_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                action_type ENUM('registered', 'moved', 'assigned', 'unassigned', 'repaired', 'disposed', 'updated') NOT NULL,
                from_location VARCHAR(255),
                to_location VARCHAR(255),
                from_user INT,
                to_user INT,
                performed_by INT NOT NULL,
                action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (from_user) REFERENCES users(id),
                FOREIGN KEY (to_user) REFERENCES users(id),
                FOREIGN KEY (performed_by) REFERENCES users(id)
            )
        `;

        // Create departments table
        const createDepartmentsTable = `
            CREATE TABLE IF NOT EXISTS departments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                code VARCHAR(10) UNIQUE NOT NULL,
                head_of_department INT,
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (head_of_department) REFERENCES users(id)
            )
        `;

        // Create locations table for labs/rooms
        const createLocationsTable = `
            CREATE TABLE IF NOT EXISTS locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                department_id INT NOT NULL,
                location_type ENUM('lab', 'office', 'storage', 'repair_center') DEFAULT 'lab',
                capacity INT DEFAULT 0,
                current_devices INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )
        `;

        // Create maintenance_records table
        const createMaintenanceTable = `
            CREATE TABLE IF NOT EXISTS maintenance_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id INT NOT NULL,
                maintenance_type ENUM('repair', 'cleaning', 'upgrade', 'inspection') NOT NULL,
                description TEXT,
                cost DECIMAL(10, 2) DEFAULT 0.00,
                performed_by INT NOT NULL,
                maintenance_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                next_maintenance_due DATE,
                status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
                FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
                FOREIGN KEY (performed_by) REFERENCES users(id)
            )
        `;

        // Create disposal_requests table
        const createDisposalRequestsTable = `
            CREATE TABLE IF NOT EXISTS disposal_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(20) NOT NULL UNIQUE,
                department VARCHAR(100) NOT NULL,
                contact_name VARCHAR(100) NOT NULL,
                contact_phone VARCHAR(20) NOT NULL,
                contact_email VARCHAR(100) NOT NULL,
                pickup_address TEXT NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                e_waste_description TEXT NOT NULL,
                weight_kg DECIMAL(10, 2),
                item_count INT,
                preferred_date DATE,
                preferred_time_slot VARCHAR(50),
                additional_notes TEXT,
                estimated_value DECIMAL(12, 2),
                status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
                created_by INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                approved_by INT,
                approved_at TIMESTAMP NULL,
                vendor_id INT,
                FOREIGN KEY (created_by) REFERENCES users(id),
                FOREIGN KEY (approved_by) REFERENCES users(id)
            )
        `;

        // Execute table creation queries
        const tables = [
            { name: 'users', query: createUsersTable },
            { name: 'departments', query: createDepartmentsTable },
            { name: 'locations', query: createLocationsTable },
            { name: 'devices', query: createDevicesTable },
            { name: 'device_logs', query: createDeviceLogsTable },
            { name: 'maintenance_records', query: createMaintenanceTable },
            { name: 'disposal_requests', query: createDisposalRequestsTable }
        ];

        for (const table of tables) {
            const result = await executeQuery(table.query);
            if (result.success) {
                console.log(`✅ Table '${table.name}' created successfully`);
            } else {
                console.error(`❌ Failed to create table '${table.name}':`, result.error);
            }
        }

        // Insert default departments
        const insertDefaultDepartments = `
            INSERT IGNORE INTO departments (name, code, location) VALUES
            ('Computer Science Engineering', 'CSE', 'Block A'),
            ('Electronics and Communication Engineering', 'ECE', 'Block B'),
            ('Mechanical Engineering', 'MECH', 'Block C'),
            ('Electrical Engineering', 'EEE', 'Block D'),
            ('Information Technology', 'IT', 'Block E')
        `;

        const deptResult = await executeQuery(insertDefaultDepartments);
        if (deptResult.success) {
            console.log('✅ Default departments inserted successfully');
        }

        // Create device activity logging tables
        await createDeviceActivityLogsTable();

        console.log('🎉 Database migration completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Migration failed:', error);
        return false;
    }
};

async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    
    try {
        // Run main tables migration
        const mainTablesCreated = await createTables();
        
        // Run disposal requests table migration
        const disposalTableCreated = await createDisposalRequestsTable();
        
        // Run IPFS uploads table migration
        const ipfsTableCreated = await createIPFSUploadsTable();
        
        // Run community tables migration
        const communityTablesCreated = await createCommunityTables();
        
        if (mainTablesCreated && disposalTableCreated && ipfsTableCreated && communityTablesCreated) {
            console.log('✅ All migrations completed successfully');
        } else {
            console.log('⚠️ Some migrations failed');
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
    }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigrations();
}

export default runMigrations;
export { createTables };