import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { AlertTriangle, Package, Plus, Search, QrCode, MapPin } from "lucide-react";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import DeviceRegistrationModal from "../components/products/DeviceRegistrationModal";
import { deviceService } from "../services/deviceService.js";
import { authService } from "../services/authService.js";
import { toast } from "react-toastify";

const ProductsPage = () => {
	const [devices, setDevices] = useState([]);
	const [filteredDevices, setFilteredDevices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterCondition, setFilterCondition] = useState("all");
	const [filterType, setFilterType] = useState("all");
	const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
	const [user, setUser] = useState(null);

	useEffect(() => {
		const currentUser = authService.getCurrentUser();
		setUser(currentUser);
		fetchDevices();
	}, []);

	useEffect(() => {
		filterDevices();
	}, [devices, searchTerm, filterCondition, filterType]);

	const fetchDevices = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await deviceService.getDepartmentDevices();
			
			if (response.success) {
				console.log('Devices data:', response.data.devices);
				setDevices(response.data.devices || []);
			} else {
				setError('Failed to fetch devices');
				toast.error('Failed to fetch devices');
			}
		} catch (err) {
			console.error('Devices fetch error:', err);
			setError(err.message || 'Failed to fetch devices');
			toast.error(err.message || 'Failed to fetch devices');
		} finally {
			setLoading(false);
		}
	};

	const filterDevices = () => {
		let filtered = devices;

		// Search filter
		if (searchTerm) {
			const lowercaseSearch = searchTerm.toLowerCase();
			filtered = filtered.filter(device =>
				device.device_name?.toLowerCase().includes(lowercaseSearch) ||
				device.device_type?.toLowerCase().includes(lowercaseSearch) ||
				device.brand?.toLowerCase().includes(lowercaseSearch) ||
				device.model?.toLowerCase().includes(lowercaseSearch) ||
				device.device_id?.toLowerCase().includes(lowercaseSearch) ||
				device.current_location?.toLowerCase().includes(lowercaseSearch)
			);
		}

		// Condition filter
		if (filterCondition !== "all") {
			filtered = filtered.filter(device => device.condition_status === filterCondition);
		}

		// Type filter
		if (filterType !== "all") {
			filtered = filtered.filter(device => device.device_type === filterType);
		}

		setFilteredDevices(filtered);
	};

	const handleDeviceRegistered = (newDevice) => {
		setDevices(prev => [newDevice, ...prev]);
		toast.success("Device added to list!");
	};

	const getConditionColor = (condition) => {
		switch (condition?.toLowerCase()) {
			case 'excellent': return 'bg-green-100 text-green-800';
			case 'good': return 'bg-blue-100 text-blue-800';
			case 'fair': return 'bg-yellow-100 text-yellow-800';
			case 'poor': return 'bg-orange-100 text-orange-800';
			case 'damaged': return 'bg-red-100 text-red-800';
			default: return 'bg-gray-100 text-gray-800';
		}
	};

	const getUniqueDeviceTypes = () => {
		const types = [...new Set(devices.map(device => device.device_type))];
		return types.filter(type => type); // Filter out null/undefined
	};

	// Calculate stats
	const totalDevices = devices.length;
	const excellentDevices = devices.filter(d => d.condition_status === 'excellent').length;
	const needsAttention = devices.filter(d => ['poor', 'damaged'].includes(d.condition_status)).length;
	const recentDevices = devices.filter(d => {
		if (!d.registration_date) return false;
		const registrationDate = new Date(d.registration_date);
		if (isNaN(registrationDate)) return false;
		
		const weekAgo = new Date();
		weekAgo.setDate(weekAgo.getDate() - 7);
		return registrationDate > weekAgo;
	}).length;

	if (loading) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title='Device Management' />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
							<p className="mt-4 text-secondary-600">Loading devices...</p>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title='Device Management' />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center text-red-600">
							<AlertTriangle size={48} className="mx-auto mb-4" />
							<p className="text-lg font-semibold">Error Loading Devices</p>
							<p className="text-sm mt-2">{error}</p>
							<button 
								onClick={fetchDevices}
								className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
							>
								Retry
							</button>
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<Header title={`Device Management - ${user?.department || 'Department'}`} />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* STATS */}
				<motion.div
					className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1 }}
				>
					<StatCard 
						name='Total Devices' 
						icon={Package} 
						value={totalDevices.toLocaleString()} 
						color='#4caf50' 
					/>
					<StatCard 
						name='Excellent Condition' 
						icon={QrCode} 
						value={excellentDevices} 
						color='#45a049' 
					/>
					<StatCard 
						name='Needs Attention' 
						icon={AlertTriangle} 
						value={needsAttention} 
						color='#f44336' 
					/>
					<StatCard 
						name='Recent (7 days)' 
						icon={Plus} 
						value={recentDevices} 
						color='#2196f3' 
					/>
				</motion.div>

				{/* ACTIONS AND FILTERS */}
				<div className="mb-6 space-y-4">
					{/* Add Device Button */}
					<div className="flex justify-between items-center">
						<h2 className="text-xl font-semibold text-primary-800">Registered Devices</h2>
						<button
							onClick={() => setIsRegistrationModalOpen(true)}
							className="flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
						>
							<Plus size={20} />
							Register New Device
						</button>
					</div>

					{/* Search and Filters */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
							<input
								type="text"
								placeholder="Search devices..."
								className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>

						<select
							value={filterCondition}
							onChange={(e) => setFilterCondition(e.target.value)}
							className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
						>
							<option value="all">All Conditions</option>
							<option value="excellent">Excellent</option>
							<option value="good">Good</option>
							<option value="fair">Fair</option>
							<option value="poor">Poor</option>
							<option value="damaged">Damaged</option>
						</select>

						<select
							value={filterType}
							onChange={(e) => setFilterType(e.target.value)}
							className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
						>
							<option value="all">All Types</option>
							{getUniqueDeviceTypes().map(type => (
								<option key={type} value={type}>{type}</option>
							))}
						</select>
					</div>
				</div>

				{/* DEVICES TABLE */}
				<motion.div
					className="bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200 overflow-hidden"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
				>
					{filteredDevices.length === 0 ? (
						<div className="p-8 text-center">
							<Package size={48} className="mx-auto text-gray-400 mb-4" />
							<h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
							<p className="text-gray-600">
								{devices.length === 0 
									? "Get started by registering your first device."
									: "Try adjusting your search or filter criteria."
								}
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-primary-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider">
											Device Info
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider">
											Type & Brand
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider">
											Condition
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider">
											Location
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider">
											Registered
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-primary-800 uppercase tracking-wider">
											QR Code
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{filteredDevices.map((device) => (
										<tr key={device.id} className="hover:bg-primary-25">
											<td className="px-6 py-4">
												<div>
													<div className="text-sm font-medium text-gray-900">
														{device.device_name}
													</div>
													<div className="text-sm text-gray-500">
														ID: {device.device_id}
													</div>
													{device.serial_number && (
														<div className="text-xs text-gray-400">
															S/N: {device.serial_number}
														</div>
													)}
												</div>
											</td>
											<td className="px-6 py-4">
												<div className="text-sm text-gray-900">{device.device_type}</div>
												{(device.brand || device.model) && (
													<div className="text-sm text-gray-500">
														{device.brand} {device.model}
													</div>
												)}
											</td>
											<td className="px-6 py-4">
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(device.condition_status)}`}>
													{device.condition_status}
												</span>
											</td>
											<td className="px-6 py-4">
												<div className="flex items-center text-sm text-gray-900">
													<MapPin size={16} className="mr-1 text-gray-400" />
													{device.current_location || 'Not specified'}
												</div>
											</td>
											<td className="px-6 py-4 text-sm text-gray-500">
												{device.registration_date ? 
													new Date(device.registration_date).toLocaleDateString() : 
													'Unknown'
												}
											</td>
											<td className="px-6 py-4">
												<button
													onClick={() => window.open(`http://localhost:3000?qr=${device.qr_code}`, '_blank')}
													className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm"
												>
													<QrCode size={16} />
													View QR
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</motion.div>

				{/* Results summary */}
				{filteredDevices.length > 0 && (
					<div className="mt-4 text-sm text-gray-600 text-center">
						Showing {filteredDevices.length} of {devices.length} devices
						{searchTerm && ` matching "${searchTerm}"`}
					</div>
				)}
			</main>

			{/* Device Registration Modal */}
			<DeviceRegistrationModal
				isOpen={isRegistrationModalOpen}
				onClose={() => setIsRegistrationModalOpen(false)}
				onDeviceRegistered={handleDeviceRegistered}
			/>
		</div>
	);
};

export default ProductsPage;
