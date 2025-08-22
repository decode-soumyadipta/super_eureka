import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Kaleido IPFS configuration
const KALEIDO_IPFS_URL = process.env.KALEIDO_IPFS_URL || "https://u0t97h3j4n:Fvd4U6558vatz6IuOD2I6GVfw-COaraAX4Ob2uVm12M@u0ooj5dqwn-u0nyalmjaw-ipfs.us0-aws.kaleido.io/api/v0/add";
const KALEIDO_APP_ID = process.env.KALEIDO_APP_ID || "u0t97h3j4n";
const KALEIDO_APP_PASSWORD = process.env.KALEIDO_APP_PASSWORD || "Fvd4U6558vatz6IuOD2I6GVfw-COaraAX4Ob2uVm12M";

/**
 * Upload file to IPFS using Kaleido
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<string|null>} - IPFS hash (CID) or null if failed
 */
export const uploadToIPFS = async (filePath) => {
    try {
        console.log('📤 IPFS: Starting upload for file:', filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error('❌ IPFS: File not found:', filePath);
            throw new Error('File not found');
        }

        // Create form data
        const formData = new FormData();
        const fileStream = fs.createReadStream(filePath);
        formData.append('path', fileStream);

        console.log('🔐 IPFS: Using Kaleido authentication');
        
        // Upload to Kaleido IPFS with increased timeout
        const response = await axios.post(KALEIDO_IPFS_URL, formData, {
            headers: {
                ...formData.getHeaders(),
            },
            auth: {
                username: KALEIDO_APP_ID,
                password: KALEIDO_APP_PASSWORD
            },
            timeout: 120000, // Increased to 2 minutes
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        console.log('✅ IPFS: Upload successful');
        console.log('📊 IPFS: Response status:', response.status);

        // Extract IPFS hash from response
        if (response.status === 200 && response.data) {
            const ipfsHash = response.data.Hash || response.data.hash;
            if (ipfsHash) {
                console.log('🎯 IPFS: File uploaded successfully with hash:', ipfsHash);
                return ipfsHash;
            } else {
                console.error('❌ IPFS: No hash found in response');
                return null;
            }
        } else {
            console.error('❌ IPFS: Upload failed with status:', response.status);
            return null;
        }

    } catch (error) {
        console.error('❌ IPFS: Upload error occurred');
        console.error('❌ IPFS: Error message:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error('❌ IPFS: Upload timeout - file may be too large or network is slow');
        }
        
        if (error.response) {
            console.error('📊 IPFS: HTTP Error Response:');
            console.error('📊 IPFS: Status:', error.response.status);
            console.error('📊 IPFS: Status Text:', error.response.statusText);
        } else if (error.request) {
            console.error('❌ IPFS: Network Error - No response received');
        }
        
        throw error;
    }
};

/**
 * Get IPFS file URL
 * @param {string} ipfsHash - IPFS hash/CID
 * @returns {string} - Public IPFS URL
 */
export const getIPFSUrl = (ipfsHash) => {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
};

/**
 * Validate file for IPFS upload
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
export const validateFileForIPFS = (file) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: 'Only PDF, JPEG, and PNG files are allowed'
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: 'File size must be less than 10MB'
        };
    }

    return {
        valid: true,
        error: null
    };
};