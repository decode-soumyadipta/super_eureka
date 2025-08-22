import { executeQuery } from '../config/database.js';

async function createIPFSUploadsTable() {
    try {
        console.log('🗄️ Creating IPFS uploads table...');
        
        const result = await executeQuery(`
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
        
        if (result.success) {
            console.log('✅ IPFS uploads table created successfully');
            return true;
        } else {
            console.error('❌ Error creating IPFS uploads table:', result.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Error creating IPFS uploads table:', error);
        return false;
    }
}

export default createIPFSUploadsTable;