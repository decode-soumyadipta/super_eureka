import { executeQuery, testConnection } from '../config/database.js';

// Create all required tables for repair center management
export const createTables = async () => {
    console.log('🔄 Creating database tables...');
    
    try {
        // Test connection first
        const isConnected = await testConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }

        // Check if pickup_datetime column exists in disposal_requests table and add it if missing
        try {
            const columnCheck = await executeQuery(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'disposal_requests' 
                AND COLUMN_NAME = 'pickup_datetime'
            `);
            
            if (!columnCheck.success || columnCheck.data.length === 0) {
                console.log('🔄 Adding missing pickup_datetime column to disposal_requests table...');
                await executeQuery(`
                    ALTER TABLE disposal_requests 
                    ADD COLUMN pickup_datetime DATETIME NULL 
                    AFTER status
                `);
                console.log('✅ pickup_datetime column added successfully');
            } else {
                console.log('✅ pickup_datetime column already exists');
            }

            // Fix the status ENUM to include all required values
            console.log('🔄 Updating status ENUM values to include pickup scheduling statuses...');
            await executeQuery(`
                ALTER TABLE disposal_requests 
                MODIFY COLUMN status ENUM(
                    'pending', 
                    'approved', 
                    'pickup_scheduled', 
                    'out_for_pickup', 
                    'pickup_completed', 
                    'rejected', 
                    'cancelled', 
                    'in_progress', 
                    'completed'
                ) DEFAULT 'pending'
            `);
            console.log('✅ Status ENUM values updated successfully');

            // Verify the table structure
            const tableStructure = await executeQuery(`
                DESCRIBE disposal_requests
            `);
            if (tableStructure.success) {
                console.log('📋 Current disposal_requests table structure:');
                tableStructure.data.forEach(column => {
                    if (column.Field === 'status' || column.Field === 'pickup_datetime') {
                        console.log(`   ${column.Field}: ${column.Type} (${column.Default})`);
                    }
                });
            }

        } catch (alterError) {
            console.log('Note: Could not check/add pickup_datetime column, will be created with new table');
        }

        // Users table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                role ENUM('admin', 'manager', 'technician', 'customer', 'vendor') DEFAULT 'customer',
                department VARCHAR(100),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role),
                INDEX idx_department (department)
            )
        `);

        // Repair centers table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS repair_centers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                zip_code VARCHAR(20),
                phone VARCHAR(20),
                email VARCHAR(255),
                manager_id INT,
                specialties JSON,
                operating_hours JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_city (city),
                INDEX idx_state (state)
            )
        `);

        // Customers table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                customer_code VARCHAR(50) UNIQUE,
                address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                zip_code VARCHAR(20),
                preferred_contact_method ENUM('email', 'phone', 'sms') DEFAULT 'email',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_customer_code (customer_code),
                INDEX idx_city (city)
            )
        `);

        // Products/Services table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                description TEXT,
                price DECIMAL(10, 2),
                cost DECIMAL(10, 2),
                service_type ENUM('repair', 'replacement', 'maintenance', 'consultation') DEFAULT 'repair',
                estimated_time_hours INT DEFAULT 1,
                warranty_period_days INT DEFAULT 30,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_service_type (service_type)
            )
        `);

        // Orders/Service requests table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_number VARCHAR(50) UNIQUE NOT NULL,
                customer_id INT NOT NULL,
                repair_center_id INT,
                assigned_technician_id INT,
                device_type VARCHAR(100),
                device_brand VARCHAR(100),
                device_model VARCHAR(100),
                issue_description TEXT,
                status ENUM('pending', 'confirmed', 'in_progress', 'waiting_parts', 'completed', 'cancelled', 'delivered') DEFAULT 'pending',
                priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
                estimated_cost DECIMAL(10, 2),
                actual_cost DECIMAL(10, 2),
                estimated_completion DATETIME,
                completed_at DATETIME,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                FOREIGN KEY (repair_center_id) REFERENCES repair_centers(id) ON DELETE SET NULL,
                FOREIGN KEY (assigned_technician_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_order_number (order_number),
                INDEX idx_status (status),
                INDEX idx_priority (priority),
                INDEX idx_created_at (created_at)
            )
        `);

        // Order items table (for multiple services per order)
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT DEFAULT 1,
                unit_price DECIMAL(10, 2),
                total_price DECIMAL(10, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
                INDEX idx_order_id (order_id)
            )
        `);

        // Sales/Revenue tracking table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                sale_date DATE NOT NULL,
                total_amount DECIMAL(10, 2) NOT NULL,
                payment_method ENUM('cash', 'card', 'online', 'bank_transfer') DEFAULT 'cash',
                payment_status ENUM('pending', 'paid', 'partial', 'refunded') DEFAULT 'pending',
                discount_amount DECIMAL(10, 2) DEFAULT 0.00,
                tax_amount DECIMAL(10, 2) DEFAULT 0.00,
                net_amount DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                INDEX idx_sale_date (sale_date),
                INDEX idx_payment_status (payment_status)
            )
        `);

        // Analytics tracking table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS analytics_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                metric_name VARCHAR(100) NOT NULL,
                metric_value DECIMAL(15, 2),
                metric_data JSON,
                date_recorded DATE NOT NULL,
                repair_center_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (repair_center_id) REFERENCES repair_centers(id) ON DELETE SET NULL,
                INDEX idx_metric_name (metric_name),
                INDEX idx_date_recorded (date_recorded),
                INDEX idx_repair_center (repair_center_id)
            )
        `);

        // Order status history table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS order_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                old_status VARCHAR(50),
                new_status VARCHAR(50) NOT NULL,
                changed_by INT,
                notes TEXT,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_order_id (order_id),
                INDEX idx_changed_at (changed_at)
            )
        `);

        // Settings table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                setting_key VARCHAR(100) UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                description TEXT,
                repair_center_id INT,
                updated_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (repair_center_id) REFERENCES repair_centers(id) ON DELETE CASCADE,
                FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_setting_key (setting_key),
                INDEX idx_repair_center (repair_center_id)
            )
        `);

        // Notifications table
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                action_url VARCHAR(500),
                related_order_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (related_order_id) REFERENCES orders(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_is_read (is_read),
                INDEX idx_created_at (created_at)
            )
        `);

        // Disposal requests table for e-waste management
        await executeQuery(`
            CREATE TABLE IF NOT EXISTS disposal_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(50) NOT NULL UNIQUE,
                department VARCHAR(100) NOT NULL,
                contact_name VARCHAR(100) NOT NULL,
                contact_phone VARCHAR(20) NOT NULL,
                contact_email VARCHAR(100) NOT NULL,
                pickup_address TEXT NOT NULL,
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                e_waste_description TEXT NOT NULL,
                weight_kg DECIMAL(10, 2),
                item_count INT,
                preferred_date DATE,
                preferred_time_slot VARCHAR(50),
                additional_notes TEXT,
                estimated_value DECIMAL(12, 2),
                status ENUM('pending', 'approved', 'pickup_scheduled', 'out_for_pickup', 'pickup_completed', 'rejected', 'cancelled', 'in_progress', 'completed') DEFAULT 'pending',
                pickup_datetime DATETIME NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_request_id (request_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            )
        `);

        console.log('✅ All database tables created successfully');
        
        // Insert default data
        await insertDefaultData();
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    }
};

// Insert default/seed data
const insertDefaultData = async () => {
    console.log('🔄 Inserting default data...');
    
    try {
        // Check if admin user exists
        const adminCheck = await executeQuery(
            'SELECT id FROM users WHERE email = ? AND role = ?',
            ['admin@repaircenter.com', 'admin']
        );

        if (!adminCheck.success || adminCheck.data.length === 0) {
            // Insert default admin user (password: admin123)
            const bcrypt = await import('bcryptjs');
            const hashedPassword = await bcrypt.default.hash('admin123', 12);
            
            await executeQuery(`
                INSERT INTO users (name, email, password, role, department, phone) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'System Administrator',
                'admin@repaircenter.com',
                hashedPassword,
                'admin',
                'Administration',
                '+1-555-0100'
            ]);
            
            console.log('✅ Default admin user created');
        }

        // Insert default repair center
        const centerCheck = await executeQuery('SELECT id FROM repair_centers LIMIT 1');
        if (!centerCheck.success || centerCheck.data.length === 0) {
            await executeQuery(`
                INSERT INTO repair_centers (name, address, city, state, zip_code, phone, email, specialties, operating_hours) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'Main Repair Center',
                '123 Tech Street',
                'Tech City',
                'Tech State',
                '12345',
                '+1-555-0200',
                'contact@repaircenter.com',
                JSON.stringify(['Electronics', 'Mobile Phones', 'Laptops', 'Tablets']),
                JSON.stringify({
                    'monday': '9:00-18:00',
                    'tuesday': '9:00-18:00',
                    'wednesday': '9:00-18:00',
                    'thursday': '9:00-18:00',
                    'friday': '9:00-18:00',
                    'saturday': '10:00-16:00',
                    'sunday': 'closed'
                })
            ]);
            
            console.log('✅ Default repair center created');
        }

        // Insert default products/services
        const productCheck = await executeQuery('SELECT id FROM products LIMIT 1');
        if (!productCheck.success || productCheck.data.length === 0) {
            const defaultProducts = [
                ['Laptop Screen Replacement', 'Electronics', 'Professional laptop screen replacement service', 150.00, 80.00, 'repair', 2, 30],
                ['Smartphone Battery Replacement', 'Electronics', 'High-quality battery replacement for smartphones', 50.00, 25.00, 'repair', 1, 90],
                ['Tablet Charging Port Repair', 'Electronics', 'Charging port repair and replacement', 80.00, 40.00, 'repair', 1, 30],
                ['Data Recovery Service', 'Electronics', 'Professional data recovery from damaged devices', 200.00, 100.00, 'repair', 4, 0],
                ['Device Diagnostic', 'Electronics', 'Comprehensive device diagnostic and assessment', 40.00, 20.00, 'consultation', 1, 0]
            ];

            for (const product of defaultProducts) {
                await executeQuery(`
                    INSERT INTO products (name, category, description, price, cost, service_type, estimated_time_hours, warranty_period_days) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, product);
            }
            
            console.log('✅ Default products/services created');
        }

        // Insert default settings
        const settingsCheck = await executeQuery('SELECT id FROM settings LIMIT 1');
        if (!settingsCheck.success || settingsCheck.data.length === 0) {
            const defaultSettings = [
                ['company_name', 'Repair Center Management', 'string', 'Company/Organization Name'],
                ['default_tax_rate', '8.5', 'number', 'Default tax rate percentage'],
                ['default_warranty_days', '30', 'number', 'Default warranty period in days'],
                ['notification_email', 'notifications@repaircenter.com', 'string', 'Email for system notifications'],
                ['business_hours', '{"start": "09:00", "end": "18:00"}', 'json', 'Default business hours']
            ];

            for (const setting of defaultSettings) {
                await executeQuery(`
                    INSERT INTO settings (setting_key, setting_value, setting_type, description) 
                    VALUES (?, ?, ?, ?)
                `, setting);
            }
            
            console.log('✅ Default settings created');
        }

        console.log('✅ Default data insertion completed');
        
        // Insert sample disposal requests for testing
        const disposalCheck = await executeQuery('SELECT id FROM disposal_requests LIMIT 1');
        if (!disposalCheck.success || disposalCheck.data.length === 0) {
            const sampleRequests = [
                [
                    'EWR-2024-001',
                    'IT Department',
                    'John Smith',
                    '+1-555-1001',
                    'john.smith@company.com',
                    '123 Business Plaza, Floor 5, Room 501, Tech City, TS 12345',
                    40.7128,
                    -74.0060,
                    'Old desktop computers (5 units), CRT monitors (3 units), keyboards and mice (8 sets)',
                    45.5,
                    16,
                    '2024-08-25',
                    'Morning (9:00 AM - 12:00 PM)',
                    'Equipment is from 2018-2020. All hard drives need secure data destruction.',
                    850.00,
                    'pending'
                ],
                [
                    'EWR-2024-002',
                    'HR Department',
                    'Sarah Johnson',
                    '+1-555-1002',
                    'sarah.johnson@company.com',
                    '456 Corporate Center, Suite 200, Tech City, TS 12346',
                    40.7580,
                    -73.9855,
                    'Laptops (12 units), printers (2 units), mobile phones (8 units)',
                    32.0,
                    22,
                    '2024-08-26',
                    'Afternoon (1:00 PM - 5:00 PM)',
                    'Some devices may still contain sensitive employee data.',
                    1200.00,
                    'approved'
                ],
                [
                    'EWR-2024-003',
                    'Finance Department',
                    'Mike Chen',
                    '+1-555-1003',
                    'mike.chen@company.com',
                    '789 Financial Tower, 15th Floor, Tech City, TS 12347',
                    40.7489,
                    -73.9680,
                    'Servers (3 units), networking equipment (routers, switches)',
                    78.2,
                    8,
                    '2024-08-27',
                    'Full Day (9:00 AM - 5:00 PM)',
                    'Critical: Contains financial data. Requires certified data destruction.',
                    2500.00,
                    'pickup_scheduled'
                ]
            ];

            for (const request of sampleRequests) {
                await executeQuery(`
                    INSERT INTO disposal_requests (
                        request_id, department, contact_name, contact_phone, contact_email, 
                        pickup_address, latitude, longitude, e_waste_description, weight_kg, 
                        item_count, preferred_date, preferred_time_slot, additional_notes, 
                        estimated_value, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, request);
            }
            
            console.log('✅ Sample disposal requests created');
        }
        
    } catch (error) {
        console.error('❌ Error inserting default data:', error);
        throw error;
    }
};

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🚀 Running database migrations...');
    createTables()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}