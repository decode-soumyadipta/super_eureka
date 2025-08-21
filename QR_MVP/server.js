const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced data structure for comprehensive device information
const deviceFields = [
    'wasteType', 'sourceLocation', 'generatedDate', 'weightKg', 'recyclable', 
    'disposalMethod', 'costPerKg', 'disposalStatus',
    // Device Information
    'deviceType', 'brand', 'model', 'serialNumber', 'deviceId', 'productName',
    'category', 'subCategory',
    // Technical Specifications
    'specifications', 'processor', 'memory', 'storage', 'screenSize', 'resolution',
    'operatingSystem', 'connectivity', 'ports',
    // Purchase & Warranty
    'purchaseDate', 'purchasePrice', 'warrantyPeriod', 'warrantyExpiry',
    'vendor', 'invoiceNumber', 'retailer',
    // Owner Information
    'ownerName', 'firstName', 'lastName', 'email', 'phone', 'mobile',
    'address', 'city', 'state', 'country', 'zipCode', 'organization', 'department',
    // Device Status & Condition
    'condition', 'status', 'workingCondition', 'damageDescription', 'functionalStatus',
    'batteryHealth', 'age', 'usageHours',
    // Disposal & Recycling
    'recyclingMethod', 'disposalDate', 'recyclingCenter', 'disposalReason',
    'environmentalImpact', 'materialComposition', 'hazardousMaterials',
    // Registration & Tracking
    'registrationDate', 'registeredBy', 'registrationId', 'qrCode',
    'trackingNumber', 'lastUpdated', 'notes', 'comments',
    // Additional Information
    'accessories', 'software', 'licenses', 'dataWiped', 'securityLevel',
    'complianceCertification', 'estimatedValue', 'refurbishable'
];

app.post('/add-data', (req, res) => {
    try {
        // Extract all possible fields from the request
        const deviceData = {};
        deviceFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
                deviceData[field] = req.body[field];
            }
        });

        // Add timestamp and generated ID if not present
        if (!deviceData.registrationDate) {
            deviceData.registrationDate = new Date().toISOString();
        }
        if (!deviceData.deviceId) {
            deviceData.deviceId = `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        }
        if (!deviceData.qrCode) {
            deviceData.qrCode = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        }

        // Create CSV header if file doesn't exist
        const csvPath = 'Gdata.csv';
        let csvData = '';
        
        if (!fs.existsSync(csvPath)) {
            // Create header with all fields
            csvData = deviceFields.join(',') + '\n';
        }

        // Create CSV row with all fields (empty for missing data)
        const csvRow = deviceFields.map(field => {
            const value = deviceData[field] || '';
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        }).join(',');

        csvData += csvRow + '\n';

        fs.appendFile(csvPath, csvData, (err) => {
            if (err) {
                console.error('Error writing to file', err);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to save device data',
                    error: err.message 
                });
            } else {
                console.log('Device data saved successfully:', deviceData.deviceId);
                res.json({ 
                    success: true, 
                    message: 'Device data saved successfully',
                    deviceId: deviceData.deviceId,
                    qrCode: deviceData.qrCode,
                    data: deviceData
                });
            }
        });

        // Also save as JSON for easier retrieval
        const jsonPath = 'devices.json';
        let devices = [];
        
        if (fs.existsSync(jsonPath)) {
            try {
                const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                devices = JSON.parse(jsonContent);
            } catch (parseErr) {
                console.error('Error parsing existing JSON:', parseErr);
                devices = [];
            }
        }

        devices.push(deviceData);
        
        fs.writeFileSync(jsonPath, JSON.stringify(devices, null, 2));

    } catch (error) {
        console.error('Error processing device data:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

// New endpoint to retrieve device data by QR code or device ID
app.get('/device/:identifier', (req, res) => {
    try {
        const identifier = req.params.identifier;
        const jsonPath = 'devices.json';
        
        if (!fs.existsSync(jsonPath)) {
            return res.status(404).json({
                success: false,
                message: 'No devices found'
            });
        }

        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        const devices = JSON.parse(jsonContent);
        
        // Search by QR code or device ID
        const device = devices.find(d => 
            d.qrCode === identifier || 
            d.deviceId === identifier ||
            d.serialNumber === identifier
        );

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        res.json({
            success: true,
            message: 'Device found',
            data: device
        });

    } catch (error) {
        console.error('Error retrieving device:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// New endpoint to get all devices
app.get('/devices', (req, res) => {
    try {
        const jsonPath = 'devices.json';
        
        if (!fs.existsSync(jsonPath)) {
            return res.json({
                success: true,
                message: 'No devices found',
                data: []
            });
        }

        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        const devices = JSON.parse(jsonContent);
        
        res.json({
            success: true,
            message: `Found ${devices.length} devices`,
            data: devices
        });

    } catch (error) {
        console.error('Error retrieving devices:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Enhanced endpoint for device registration with comprehensive data
app.post('/register-device', (req, res) => {
    try {
        const deviceData = { ...req.body };
        
        // Auto-generate required fields if not provided
        deviceData.registrationDate = new Date().toISOString();
        deviceData.deviceId = deviceData.deviceId || `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        deviceData.qrCode = deviceData.qrCode || `QR-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
        deviceData.status = deviceData.status || 'Active';
        deviceData.lastUpdated = new Date().toISOString();

        // Save to JSON
        const jsonPath = 'devices.json';
        let devices = [];
        
        if (fs.existsSync(jsonPath)) {
            try {
                const jsonContent = fs.readFileSync(jsonPath, 'utf8');
                devices = JSON.parse(jsonContent);
            } catch (parseErr) {
                devices = [];
            }
        }

        devices.push(deviceData);
        fs.writeFileSync(jsonPath, JSON.stringify(devices, null, 2));

        // Also save to CSV
        const csvPath = 'Gdata.csv';
        let csvData = '';
        
        if (!fs.existsSync(csvPath)) {
            csvData = deviceFields.join(',') + '\n';
        }

        const csvRow = deviceFields.map(field => {
            const value = deviceData[field] || '';
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value;
        }).join(',');

        csvData += csvRow + '\n';
        fs.appendFileSync(csvPath, csvData);

        res.json({
            success: true,
            message: 'Device registered successfully',
            data: {
                deviceId: deviceData.deviceId,
                qrCode: deviceData.qrCode,
                device: deviceData
            }
        });

    } catch (error) {
        console.error('Error registering device:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to register device',
            error: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`🌱 e-Shunya E-Waste Management Server running at http://localhost:${port}`);
    console.log(`📊 Enhanced with comprehensive device data tracking`);
    console.log(`🔍 API Endpoints available:`);
    console.log(`   POST /add-data - Add device data`);
    console.log(`   POST /register-device - Register new device`);
    console.log(`   GET /device/:identifier - Get device by QR/ID`);
    console.log(`   GET /devices - Get all devices`);
});