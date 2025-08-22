import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import { uploadToIPFS, getIPFSUrl, validateFileForIPFS } from '../services/ipfsService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/ipfs_temp');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPEG, and PNG files are allowed'), false);
        }
    }
});

// Upload file to IPFS
const uploadFileToIPFS = async (req, res) => {
    try {
        console.log('📥 IPFS Controller: Upload request received');
        console.log('👤 IPFS Controller: User:', JSON.stringify(req.user, null, 2));
        console.log('📋 IPFS Controller: Body:', JSON.stringify(req.body, null, 2));
        console.log('📎 IPFS Controller: File:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        } : 'No file');

        // Check if file was uploaded
        if (!req.file) {
            console.log('❌ IPFS Controller: No file provided');
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        // Validate file
        const validation = validateFileForIPFS(req.file);
        if (!validation.valid) {
            console.log('❌ IPFS Controller: File validation failed:', validation.error);
            
            // Clean up uploaded file
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        console.log('✅ IPFS Controller: File validation passed');

        // Upload to IPFS
        console.log('📤 IPFS Controller: Starting IPFS upload...');
        const ipfsHash = await uploadToIPFS(req.file.path);

        if (!ipfsHash) {
            console.log('❌ IPFS Controller: IPFS upload failed');
            
            // Clean up uploaded file
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file to IPFS'
            });
        }

        console.log('✅ IPFS Controller: IPFS upload successful, hash:', ipfsHash);

        // Get IPFS URL
        const ipfsUrl = getIPFSUrl(ipfsHash);
        
        // Get description from request body
        const description = req.body.description || null;

        // Save upload record to database
        console.log('💾 IPFS Controller: Saving upload record to database...');
        const result = await executeQuery(`
            INSERT INTO ipfs_uploads (
                user_id,
                original_filename,
                file_type,
                file_size,
                ipfs_hash,
                ipfs_url,
                description,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id,
            req.file.originalname,
            req.file.mimetype,
            req.file.size,
            ipfsHash,
            ipfsUrl,
            description,
            'uploaded'
        ]);

        // Clean up temporary file
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log('🗑️ IPFS Controller: Temporary file cleaned up');
        }

        if (!result.success) {
            console.error('❌ IPFS Controller: Database save failed:', result.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to save upload record'
            });
        }

        console.log('✅ IPFS Controller: Upload record saved successfully, Insert ID:', result.insertId);

        // Construct the response with proper data structure
        const responseData = {
            success: true,
            message: 'File uploaded to IPFS successfully',
            data: {
                id: result.insertId,
                originalFilename: req.file.originalname,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
                ipfsHash: ipfsHash, // Make sure this is the actual hash, not undefined
                ipfsUrl: ipfsUrl,   // Make sure this is the actual URL, not undefined
                description: description,
                uploadDate: new Date().toISOString(),
                status: 'uploaded'
            }
        };

        console.log('📤 IPFS Controller: Sending response:', JSON.stringify(responseData, null, 2));
        console.log('🔍 IPFS Controller: IPFS Hash being sent:', ipfsHash);
        console.log('🔍 IPFS Controller: IPFS URL being sent:', ipfsUrl);

        res.status(201).json(responseData);

    } catch (error) {
        console.error('❌ IPFS Controller: Upload error:', error);
        
        // Clean up temporary file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error during file upload'
        });
    }
};

// Get user's IPFS uploads
const getUserIPFSUploads = async (req, res) => {
    try {
        console.log('📥 IPFS Controller: Get uploads request for user:', req.user.id);

        // Use the same pattern as deviceController - simpler query structure
        const result = await executeQuery(`
            SELECT 
                id,
                original_filename,
                file_type,
                file_size,
                ipfs_hash,
                ipfs_url,
                description,
                upload_date,
                status
            FROM ipfs_uploads 
            WHERE user_id = ? AND status = 'uploaded'
            ORDER BY upload_date DESC
        `, [req.user.id]);

        if (!result.success) {
            console.error('❌ IPFS Controller: Database query failed:', result.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch uploads'
            });
        }

        console.log('✅ IPFS Controller: Found', result.data.length, 'uploads for user', req.user.id);
        console.log('📋 IPFS Controller: Sample upload data:', result.data.length > 0 ? result.data[0] : 'No data');

        // Use the same response format as deviceController
        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('❌ IPFS Controller: Get uploads error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get all IPFS uploads (admin only)
const getAllIPFSUploads = async (req, res) => {
    try {
        console.log('📥 IPFS Controller: Get all uploads request (admin)');

        const result = await executeQuery(`
            SELECT 
                iu.id,
                iu.original_filename,
                iu.file_type,
                iu.file_size,
                iu.ipfs_hash,
                iu.ipfs_url,
                iu.description,
                iu.upload_date,
                iu.status,
                u.name as uploaded_by_name,
                u.email as uploaded_by_email,
                u.department
            FROM ipfs_uploads iu
            LEFT JOIN users u ON iu.user_id = u.id
            WHERE iu.status = 'uploaded'
            ORDER BY iu.upload_date DESC
        `);

        if (!result.success) {
            console.error('❌ IPFS Controller: Database query failed:', result.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch uploads'
            });
        }

        console.log('✅ IPFS Controller: Found', result.data.length, 'total uploads');

        res.json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error('❌ IPFS Controller: Get all uploads error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Delete IPFS upload record
const deleteIPFSUpload = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📥 IPFS Controller: Delete upload request for ID:', id);

        // Check if upload exists and belongs to user (or user is admin)
        const checkQuery = req.user.role === 'admin' 
            ? 'SELECT * FROM ipfs_uploads WHERE id = ?'
            : 'SELECT * FROM ipfs_uploads WHERE id = ? AND user_id = ?';
        
        const checkParams = req.user.role === 'admin' 
            ? [id] 
            : [id, req.user.id];

        const checkResult = await executeQuery(checkQuery, checkParams);

        if (!checkResult.success || checkResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Upload record not found'
            });
        }

        // Mark as deleted (soft delete)
        const deleteResult = await executeQuery(`
            UPDATE ipfs_uploads 
            SET status = 'deleted', updated_at = NOW() 
            WHERE id = ?
        `, [id]);

        if (!deleteResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to delete upload record'
            });
        }

        console.log('✅ IPFS Controller: Upload record deleted successfully');

        res.json({
            success: true,
            message: 'Upload record deleted successfully'
        });

    } catch (error) {
        console.error('❌ IPFS Controller: Delete upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

export {
    uploadFileToIPFS,
    getUserIPFSUploads,
    getAllIPFSUploads,
    deleteIPFSUpload,
    upload
};