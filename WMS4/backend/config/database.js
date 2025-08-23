import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 DATABASE: Initializing database connection...');
console.log('🔧 DATABASE: Environment variables:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? '***' : 'NOT SET'
});

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ewaste_management',
    charset: 'utf8mb4',
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: true
};

console.log('🔧 DATABASE: Final config:', {
    ...dbConfig,
    password: dbConfig.password ? '***' : 'NOT SET'
});

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        console.log('🔧 DATABASE: Testing connection...');
        const connection = await pool.getConnection();
        console.log('✅ DATABASE: Connection test successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ DATABASE: Connection test failed:', error.message);
        return false;
    }
};

// Execute database query with detailed logging
const executeQuery = async (query, params = []) => {
    let connection;
    try {
        console.log('🗄️ DATABASE: Executing query...');
        console.log('📝 DATABASE: Query:', query);
        console.log('📋 DATABASE: Parameters:', JSON.stringify(params, null, 2));
        
        connection = await pool.getConnection();
        console.log('✅ DATABASE: Connection acquired');
        
        const [rows, fields] = await connection.execute(query, params);
        console.log('✅ DATABASE: Query executed successfully');
        console.log('📊 DATABASE: Rows affected:', rows.affectedRows || 'N/A');
        console.log('📊 DATABASE: Insert ID:', rows.insertId || 'N/A');
        console.log('📊 DATABASE: Result length:', Array.isArray(rows) ? rows.length : 'Not array');
        
        return {
            success: true,
            data: rows,
            insertId: rows.insertId,
            affectedRows: rows.affectedRows
        };
    } catch (error) {
        console.error('❌ DATABASE: Query execution failed');
        console.error('❌ DATABASE: Error code:', error.code);
        console.error('❌ DATABASE: Error message:', error.message);
        console.error('❌ DATABASE: SQL State:', error.sqlState);
        console.error('❌ DATABASE: SQL Message:', error.sqlMessage);
        console.error('❌ DATABASE: Full error:', error);
        
        return {
            success: false,
            error: error.message,
            code: error.code,
            sqlState: error.sqlState
        };
    } finally {
        if (connection) {
            console.log('🔄 DATABASE: Releasing connection');
            connection.release();
        }
    }
};

// Execute raw SQL query without prepared statements (for triggers, procedures, etc.)
const executeRawQuery = async (query) => {
    let connection;
    try {
        console.log('🗄️ DATABASE: Executing raw query...');
        console.log('📝 DATABASE: Query:', query);
        
        connection = await pool.getConnection();
        console.log('✅ DATABASE: Connection acquired');
        
        const [rows, fields] = await connection.query(query);
        console.log('✅ DATABASE: Raw query executed successfully');
        console.log('📊 DATABASE: Rows affected:', rows.affectedRows || 'N/A');
        
        return {
            success: true,
            data: rows,
            affectedRows: rows.affectedRows
        };
    } catch (error) {
        console.error('❌ DATABASE: Raw query execution failed');
        console.error('❌ DATABASE: Error code:', error.code);
        console.error('❌ DATABASE: Error message:', error.message);
        console.error('❌ DATABASE: SQL State:', error.sqlState);
        console.error('❌ DATABASE: SQL Message:', error.sqlMessage);
        console.error('❌ DATABASE: Full error:', error);
        
        return {
            success: false,
            error: error.message,
            code: error.code,
            sqlState: error.sqlState
        };
    } finally {
        if (connection) {
            console.log('🔄 DATABASE: Releasing connection');
            connection.release();
        }
    }
};

// Initialize database and create tables if they don't exist
const initializeDatabase = async () => {
    try {
        console.log('🚀 DATABASE: Starting database initialization...');
        
        // Test connection with the existing database
        const connectionOk = await testConnection();
        if (!connectionOk) {
            throw new Error('Database connection failed');
        }

        // Create disposal_requests table if it doesn't exist
        console.log('🏗️ DATABASE: Creating disposal_requests table...');
        const createDisposalTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS disposal_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(50) NOT NULL UNIQUE,
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
                status ENUM('pending', 'approved', 'pickup_scheduled', 'out_for_pickup', 'pickup_completed', 'rejected', 'completed', 'in_progress', 'cancelled') DEFAULT 'pending',
                pickup_datetime DATETIME NULL,
                vendor_notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_request_id (request_id),
                INDEX idx_status (status),
                INDEX idx_pickup_datetime (pickup_datetime),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createDisposalTableResult.success) {
            console.log('✅ DATABASE: disposal_requests table ready');
        }

        // Add pickup_datetime column if it doesn't exist (for existing databases)
        console.log('🔄 DATABASE: Adding pickup_datetime column if missing...');
        await executeQuery(`
            ALTER TABLE disposal_requests 
            ADD COLUMN IF NOT EXISTS pickup_datetime DATETIME NULL 
            AFTER status;
        `).catch(() => {
            // Column might already exist, ignore error
            console.log('ℹ️ DATABASE: pickup_datetime column already exists or couldn\'t be added');
        });

        // Add estimated_value column if it doesn't exist (for existing databases)
        console.log('🔄 DATABASE: Adding estimated_value column if missing...');
        await executeQuery(`
            ALTER TABLE disposal_requests 
            ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(12, 2) AFTER additional_notes;
        `).catch(() => {
            // Column might already exist, ignore error
            console.log('ℹ️ DATABASE: estimated_value column already exists or couldn\'t be added');
        });

        // Create IPFS uploads table if it doesn't exist
        console.log('🏗️ DATABASE: Creating ipfs_uploads table...');
        const createIPFSTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS ipfs_uploads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                original_filename VARCHAR(255) NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                file_size INT NOT NULL,
                ipfs_hash VARCHAR(100) NOT NULL UNIQUE,
                ipfs_url VARCHAR(255) NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                status ENUM('uploaded', 'failed', 'deleted') DEFAULT 'uploaded',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id),
                INDEX idx_ipfs_hash (ipfs_hash),
                INDEX idx_upload_date (upload_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createIPFSTableResult.success) {
            console.log('✅ DATABASE: ipfs_uploads table ready');
        }

        // Create community tables
        console.log('🏗️ DATABASE: Creating community tables...');
        
        // Create posts table
        const createPostsTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS community_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createPostsTableResult.success) {
            console.log('✅ DATABASE: community_posts table ready');
        }

        // Create media table
        const createMediaTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS community_media (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_type ENUM('image', 'video') NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
                INDEX idx_post_id (post_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createMediaTableResult.success) {
            console.log('✅ DATABASE: community_media table ready');
        }

        // Create likes table
        const createLikesTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS community_likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_like (post_id, user_id),
                INDEX idx_post_id (post_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createLikesTableResult.success) {
            console.log('✅ DATABASE: community_likes table ready');
        }

        // Create comments table
        const createCommentsTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS community_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                user_id INT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_post_id (post_id),
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createCommentsTableResult.success) {
            console.log('✅ DATABASE: community_comments table ready');
        }

        // Create resource exchange tables
        console.log('🏗️ DATABASE: Creating resource exchange tables...');
        
        // Create resource requests table
        const createResourceRequestsTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS resource_exchange_requests (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id VARCHAR(50) NOT NULL UNIQUE,
                requester_user_id INT NOT NULL,
                requester_department VARCHAR(100) NOT NULL,
                device_type VARCHAR(100) NOT NULL,
                specifications JSON,
                description TEXT NOT NULL,
                urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
                preferred_exchange_date DATE,
                is_exchange BOOLEAN DEFAULT TRUE,
                status ENUM('open', 'matched', 'completed', 'cancelled') DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_status (status),
                INDEX idx_requester_department (requester_department),
                INDEX idx_device_type (device_type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createResourceRequestsTableResult.success) {
            console.log('✅ DATABASE: resource_exchange_requests table ready');
        }

        // Create resource responses table
        const createResourceResponsesTableResult = await executeQuery(`
            CREATE TABLE IF NOT EXISTS resource_exchange_responses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                request_id INT NOT NULL,
                responder_user_id INT NOT NULL,
                responder_department VARCHAR(100) NOT NULL,
                offered_device_id INT,
                offer_description TEXT NOT NULL,
                terms TEXT,
                response_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES resource_exchange_requests(id) ON DELETE CASCADE,
                FOREIGN KEY (responder_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (offered_device_id) REFERENCES devices(id) ON DELETE SET NULL,
                INDEX idx_request_id (request_id),
                INDEX idx_responder_department (responder_department),
                INDEX idx_status (status),
                INDEX idx_response_date (response_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createResourceResponsesTableResult.success) {
            console.log('✅ DATABASE: resource_exchange_responses table ready');
        }

        console.log('✅ DATABASE: Database initialization complete');
        return true;
    } catch (error) {
        console.error('❌ DATABASE: Initialization failed:', error);
        return false;
    }
};

// Initialize on startup
initializeDatabase();

export { executeQuery, executeRawQuery, testConnection, initializeDatabase };