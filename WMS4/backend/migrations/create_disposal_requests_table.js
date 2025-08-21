// Migration file to create the disposal_requests table

const db = require('../config/database');

async function createDisposalRequestsTable() {
  try {
    await db.query(`
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
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        vendor_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Disposal requests table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating disposal requests table:', error);
    return false;
  }
}

module.exports = createDisposalRequestsTable;