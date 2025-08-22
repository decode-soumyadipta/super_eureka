// Migration file to create the disposal_requests table

import { executeQuery } from '../config/database.js';

async function createDisposalRequestsTable() {
  try {
    const result = await executeQuery(`
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
        status ENUM('pending', 'approved', 'pickup_scheduled', 'out_for_pickup', 'pickup_completed', 'rejected', 'completed', 'in_progress', 'cancelled') DEFAULT 'pending',
        pickup_datetime DATETIME NULL,
        vendor_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_request_id (request_id),
        INDEX idx_status (status),
        INDEX idx_pickup_datetime (pickup_datetime),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    if (result.success) {
      console.log('✅ Disposal requests table created successfully');
      return true;
    } else {
      console.error('❌ Error creating disposal requests table:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating disposal requests table:', error);
    return false;
  }
}

export default createDisposalRequestsTable;