import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, QrCode } from "lucide-react";
import { toast } from "react-toastify";
import { deviceService } from "../../services/deviceService.js";

const DeviceRegistrationModal = ({ isOpen, onClose, onDeviceRegistered }) => {
    const [formData, setFormData] = useState({
        device_name: "",
        device_type: "",
        brand: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        warranty_expiry: "",
        condition_status: "good",
        current_location: "",
        specifications: {
            ram: "",
            storage: "",
            processor: "",
            os: ""
        },
        notes: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);

    const deviceTypes = [
        "Laptop", "Desktop", "Monitor", "Printer", "Scanner", 
        "Projector", "Router", "Switch", "Server", "Tablet",
        "Smartphone", "Camera", "Other"
    ];

    const conditionStatuses = [
        { value: "excellent", label: "Excellent" },
        { value: "good", label: "Good" },
        { value: "fair", label: "Fair" },
        { value: "poor", label: "Poor" },
        { value: "damaged", label: "Damaged" }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name.startsWith('spec_')) {
            const specField = name.replace('spec_', '');
            setFormData(prev => ({
                ...prev,
                specifications: {
                    ...prev.specifications,
                    [specField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Filter out empty specifications
            const cleanSpecs = Object.fromEntries(
                Object.entries(formData.specifications).filter(([_, value]) => value.trim() !== '')
            );

            const deviceData = {
                ...formData,
                specifications: Object.keys(cleanSpecs).length > 0 ? cleanSpecs : null
            };

            const response = await deviceService.registerDevice(deviceData);

            if (response.success) {
                toast.success("Device registered successfully!");
                setQrCodeData(response.data);
                
                // Reset form
                setFormData({
                    device_name: "",
                    device_type: "",
                    brand: "",
                    model: "",
                    serial_number: "",
                    purchase_date: "",
                    warranty_expiry: "",
                    condition_status: "good",
                    current_location: "",
                    specifications: { ram: "", storage: "", processor: "", os: "" },
                    notes: ""
                });

                // Notify parent component
                if (onDeviceRegistered) {
                    onDeviceRegistered(response.data.device);
                }
            }
        } catch (error) {
            console.error('Device registration error:', error);
            const errorMessage = error.message || error.errors?.[0]?.msg || "Failed to register device";
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setQrCodeData(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-primary-800">
                            {qrCodeData ? "Device Registered Successfully!" : "Register New Device"}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {qrCodeData ? (
                        // QR Code Display
                        <div className="text-center">
                            <div className="mb-4">
                                <img 
                                    src={qrCodeData.qr_code_url} 
                                    alt="Device QR Code"
                                    className="mx-auto border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="bg-primary-50 p-4 rounded-lg mb-4">
                                <p className="text-sm text-primary-700 mb-2">
                                    <strong>Device ID:</strong> {qrCodeData.device.device_id}
                                </p>
                                <p className="text-sm text-primary-700">
                                    <strong>Device:</strong> {qrCodeData.device.device_name}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const link = document.createElement('a');
                                        link.download = `${qrCodeData.device.device_id}_qr.png`;
                                        link.href = qrCodeData.qr_code_url;
                                        link.click();
                                    }}
                                    className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600"
                                >
                                    Download QR Code
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Registration Form
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Device Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="device_name"
                                        value={formData.device_name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Dell Laptop Lab 1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Device Type *
                                    </label>
                                    <select
                                        name="device_type"
                                        value={formData.device_type}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select Type</option>
                                        {deviceTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Dell, HP, Lenovo"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Model
                                    </label>
                                    <input
                                        type="text"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Inspiron 15, EliteBook"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Serial Number
                                    </label>
                                    <input
                                        type="text"
                                        name="serial_number"
                                        value={formData.serial_number}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Current Location
                                    </label>
                                    <input
                                        type="text"
                                        name="current_location"
                                        value={formData.current_location}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                        placeholder="e.g., Lab 1, Room 205"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Purchase Date
                                    </label>
                                    <input
                                        type="date"
                                        name="purchase_date"
                                        value={formData.purchase_date}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Warranty Expiry
                                    </label>
                                    <input
                                        type="date"
                                        name="warranty_expiry"
                                        value={formData.warranty_expiry}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Condition Status
                                    </label>
                                    <select
                                        name="condition_status"
                                        value={formData.condition_status}
                                        onChange={handleInputChange}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    >
                                        {conditionStatuses.map(status => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Specifications */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-800 mb-3">Specifications (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        name="spec_ram"
                                        value={formData.specifications.ram}
                                        onChange={handleInputChange}
                                        placeholder="RAM (e.g., 8GB DDR4)"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                    <input
                                        type="text"
                                        name="spec_storage"
                                        value={formData.specifications.storage}
                                        onChange={handleInputChange}
                                        placeholder="Storage (e.g., 256GB SSD)"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                    <input
                                        type="text"
                                        name="spec_processor"
                                        value={formData.specifications.processor}
                                        onChange={handleInputChange}
                                        placeholder="Processor (e.g., Intel i5)"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                    <input
                                        type="text"
                                        name="spec_os"
                                        value={formData.specifications.os}
                                        onChange={handleInputChange}
                                        placeholder="OS (e.g., Windows 11)"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    placeholder="Additional notes or comments..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-primary-500 text-white py-2 px-4 rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode size={20} />
                                            Register Device
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DeviceRegistrationModal;