import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ewaste_management',
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10
};

let pool;

// Initialize database connection pool
export const initializeDatabase = async () => {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('✅ Database connection pool initialized');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

// Test database connection
export const testConnection = async () => {
    try {
        if (!pool) {
            await initializeDatabase();
        }
        
        const connection = await pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        console.log('✅ Database connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
};

// Execute query with error handling
export const executeQuery = async (query, params = []) => {
    try {
        if (!pool) {
            throw new Error('Database pool not initialized');
        }

        const [rows] = await pool.execute(query, params);
        return {
            success: true,
            data: rows
        };
    } catch (error) {
        console.error('Database query error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Execute transaction
export const executeTransaction = async (queries) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const query of queries) {
            const [rows] = await connection.execute(query.sql, query.params || []);
            results.push(rows);
        }
        
        await connection.commit();
        connection.release();
        
        return {
            success: true,
            data: results
        };
    } catch (error) {
        await connection.rollback();
        connection.release();
        
        console.error('Transaction error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Close database connection
export const closeDatabaseConnection = async () => {
    try {
        if (pool) {
            await pool.end();
            console.log('✅ Database connection closed');
        }
    } catch (error) {
        console.error('❌ Error closing database connection:', error);
    }
};