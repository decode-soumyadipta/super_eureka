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
                status ENUM('pending', 'approved', 'rejected', 'completed', 'in_progress', 'cancelled') DEFAULT 'pending',
                vendor_notes TEXT,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        
        if (createDisposalTableResult.success) {
            console.log('✅ DATABASE: disposal_requests table ready');
        }

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

        console.log('✅ DATABASE: Database initialization complete');
        return true;
    } catch (error) {
        console.error('❌ DATABASE: Initialization failed:', error);
        return false;
    }
};

// Initialize on startup
initializeDatabase();

export { executeQuery, testConnection, initializeDatabase };