import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, 
    QrCode, 
    Calendar, 
    MapPin, 
    User, 
    Cpu, 
    HardDrive, 
    Memory, 
    Monitor,
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Eye,
    Download,
    FileText,
    Smartphone,
    Laptop,
    Server
} from 'lucide-react';
import { deviceService } from '../../services/deviceService';
import { toast } from 'react-toastify';

const QRProfileModal = ({ isOpen, onClose, qrCode, deviceId }) => {
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        if (isOpen && (qrCode || deviceId)) {
            fetchDeviceProfile();
        }
    }, [isOpen, qrCode, deviceId]);

    const fetchDeviceProfile = async () => {
        setLoading(true);
        try {
            const response = await deviceService.getDeviceProfile(deviceId || qrCode);
            if (response.success) {
                setDevice(response.data.device);
                setActivities(response.data.activities || []);
            } else {
                toast.error('Device not found');
                onClose();
            }
        } catch (error) {
            console.error('Error fetching device profile:', error);
            toast.error('Failed to load device profile');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const getDeviceIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'laptop': return <Laptop className="w-8 h-8" />;
            case 'desktop': return <Monitor className="w-8 h-8" />;
            case 'server': return <Server className="w-8 h-8" />;
            case 'smartphone': return <Smartphone className="w-8 h-8" />;
            case 'tablet': return <Smartphone className="w-8 h-8" />;
            default: return <Monitor className="w-8 h-8" />;
        }
    };

    const getConditionColor = (condition) => {
        switch (condition?.toLowerCase()) {
            case 'excellent': return 'text-green-600 bg-green-100';
            case 'good': return 'text-blue-600 bg-blue-100';
            case 'fair': return 'text-yellow-600 bg-yellow-100';
            case 'poor': return 'text-orange-600 bg-orange-100';
            case 'damaged': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'qr_scan': return <QrCode className="w-4 h-4" />;
            case 'location_update': return <MapPin className="w-4 h-4" />;
            case 'condition_update': return <Activity className="w-4 h-4" />;
            case 'maintenance': return <CheckCircle className="w-4 h-4" />;
            case 'disposal_request': return <AlertTriangle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const downloadQRCode = () => {
        if (device?.qr_code_url) {
            const link = document.createElement('a');
            link.href = device.qr_code_url;
            link.download = `QR_${device.device_id}.png`;
            link.click();
        }
    };

    const generateReport = () => {
        const reportData = {
            device,
            activities,
            generatedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `device_report_${device.device_id}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading device profile...</p>
                        </div>
                    ) : device ? (
                        <>
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-4">
                                        <div className="text-white">
                                            {getDeviceIcon(device.device_type)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold">{device.device_name}</h2>
                                            <p className="text-blue-100">ID: {device.device_id}</p>
                                            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getConditionColor(device.condition_status)}`}>
                                                {device.condition_status || 'Unknown'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={downloadQRCode}
                                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                            title="Download QR Code"
                                        >
                                            <Download className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={generateReport}
                                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                            title="Generate Report"
                                        >
                                            <FileText className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8 px-6">
                                    {[
                                        { id: 'overview', label: 'Overview', icon: Eye },
                                        { id: 'specifications', label: 'Specifications', icon: Cpu },
                                        { id: 'activity', label: 'Activity Log', icon: Activity },
                                        { id: 'qr', label: 'QR Code', icon: QrCode }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                                activeTab === tab.id
                                                    ? 'border-blue-500 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <tab.icon className="w-4 h-4" />
                                            <span>{tab.label}</span>
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* Content */}
                            <div className="p-6 max-h-96 overflow-y-auto">
                                {activeTab === 'overview' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-gray-800">Device Information</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Type:</span>
                                                    <span className="font-medium">{device.device_type || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Brand:</span>
                                                    <span className="font-medium">{device.brand || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Model:</span>
                                                    <span className="font-medium">{device.model || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Serial Number:</span>
                                                    <span className="font-medium font-mono text-sm">{device.serial_number || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Current Location:</span>
                                                    <span className="font-medium">{device.current_location || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-gray-800">Lifecycle Information</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Registration Date:</span>
                                                    <span className="font-medium">{formatDate(device.registration_date)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Purchase Date:</span>
                                                    <span className="font-medium">{device.purchase_date ? formatDate(device.purchase_date) : 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Warranty Expiry:</span>
                                                    <span className="font-medium">{device.warranty_expiry ? formatDate(device.warranty_expiry) : 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Last Updated:</span>
                                                    <span className="font-medium">{formatDate(device.updated_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'specifications' && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-semibold text-gray-800">Technical Specifications</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="flex items-center space-x-2 mb-3">
                                                    <Cpu className="w-5 h-5 text-blue-600" />
                                                    <h4 className="font-medium">Processor</h4>
                                                </div>
                                                <p className="text-gray-700">{device.specifications?.processor || 'Not specified'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="flex items-center space-x-2 mb-3">
                                                    <Memory className="w-5 h-5 text-green-600" />
                                                    <h4 className="font-medium">RAM</h4>
                                                </div>
                                                <p className="text-gray-700">{device.specifications?.ram || 'Not specified'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="flex items-center space-x-2 mb-3">
                                                    <HardDrive className="w-5 h-5 text-purple-600" />
                                                    <h4 className="font-medium">Storage</h4>
                                                </div>
                                                <p className="text-gray-700">{device.specifications?.storage || 'Not specified'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div className="flex items-center space-x-2 mb-3">
                                                    <Monitor className="w-5 h-5 text-orange-600" />
                                                    <h4 className="font-medium">Operating System</h4>
                                                </div>
                                                <p className="text-gray-700">{device.specifications?.os || 'Not specified'}</p>
                                            </div>
                                        </div>
                                        {device.notes && (
                                            <div className="mt-6">
                                                <h4 className="font-medium mb-2">Additional Notes</h4>
                                                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{device.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'activity' && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Activity Timeline</h3>
                                        {activities.length > 0 ? (
                                            <div className="space-y-4">
                                                {activities.map((activity, index) => (
                                                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                                        <div className="mt-1">
                                                            {getActivityIcon(activity.activity_type)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium text-gray-800">{activity.description}</p>
                                                            <p className="text-sm text-gray-600">{formatDate(activity.timestamp)}</p>
                                                            {activity.performed_by && (
                                                                <p className="text-sm text-gray-500">by {activity.performed_by}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 text-center py-8">No activity recorded for this device.</p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'qr' && (
                                    <div className="text-center space-y-4">
                                        <h3 className="text-lg font-semibold text-gray-800">QR Code</h3>
                                        {device.qr_code_url ? (
                                            <div className="space-y-4">
                                                <img
                                                    src={device.qr_code_url}
                                                    alt="Device QR Code"
                                                    className="mx-auto border border-gray-300 rounded-lg max-w-xs"
                                                />
                                                <div className="bg-blue-50 p-4 rounded-lg">
                                                    <p className="text-sm text-blue-700">
                                                        <strong>QR Code:</strong> {device.qr_code}
                                                    </p>
                                                    <p className="text-xs text-blue-600 mt-1">
                                                        Scan this QR code to quickly access device information
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={downloadQRCode}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                >
                                                    Download QR Code
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">QR Code not available</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <p className="text-gray-600">Device not found</p>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default QRProfileModal;