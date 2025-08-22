import { useState, useEffect } from "react";
import { Package, Clock, Truck, CheckCircle, Calendar, MapPin, Phone, Mail, User, FileText, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";

const ApprovedRequestsPage = () => {
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [updating, setUpdating] = useState({});

	useEffect(() => {
		fetchApprovedRequests();
	}, []);

	const fetchApprovedRequests = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const token = localStorage.getItem('token');
			if (!token) {
				setError('No authentication token found');
				return;
			}

			const response = await fetch('/api/vendor/disposal-requests', {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to fetch requests');
			}

			const data = await response.json();
			
			if (data.success) {
				// Filter only approved requests and requests that are in process
				const approvedRequests = (data.data.requests || []).filter(r => 
					r.status === 'approved' || 
					r.status === 'pickup_scheduled' || 
					r.status === 'out_for_pickup' || 
					r.status === 'pickup_completed'
				);
				setRequests(approvedRequests);
			} else {
				throw new Error(data.message || 'Failed to fetch requests');
			}
		} catch (err) {
			console.error('Error fetching approved requests:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async (requestId, newStatus, pickupDate = null) => {
		try {
			setUpdating(prev => ({ ...prev, [requestId]: true }));
			setError(null);

			console.log('🔄 Frontend: Updating request status', {
				requestId,
				newStatus,
				pickupDate,
				timestamp: new Date().toISOString()
			});

			const token = localStorage.getItem('token');
			const payload = { status: newStatus };
			
			if (pickupDate && newStatus === 'pickup_scheduled') {
				payload.pickup_datetime = pickupDate;
				console.log('📅 Frontend: Adding pickup datetime to payload', payload);
			}

			console.log('📤 Frontend: Sending API request', {
				url: `/api/vendor/disposal-requests/${requestId}/respond`,
				method: 'PUT',
				payload
			});

			const response = await fetch(`/api/vendor/disposal-requests/${requestId}/respond`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			console.log('📥 Frontend: Received response', {
				status: response.status,
				ok: response.ok
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error('❌ Frontend: API error response', errorData);
				throw new Error(errorData.message || 'Failed to update status');
			}

			const data = await response.json();
			console.log('✅ Frontend: Successful response', data);
			
			if (data.success) {
				console.log('🔄 Frontend: Refreshing approved requests data...');
				await fetchApprovedRequests(); // Refresh the data
				console.log('✅ Frontend: Data refreshed successfully');
			} else {
				throw new Error(data.message || 'Failed to update status');
			}
		} catch (err) {
			console.error('❌ Frontend: Error updating status:', err);
			setError(err.message);
		} finally {
			setUpdating(prev => ({ ...prev, [requestId]: false }));
		}
	};

	const getStatusColor = (status) => {
		const colors = {
			approved: 'bg-blue-500',
			pickup_scheduled: 'bg-purple-500',
			out_for_pickup: 'bg-orange-500',
			pickup_completed: 'bg-green-500'
		};
		return colors[status] || 'bg-gray-500';
	};

	const getStatusLabel = (status) => {
		const labels = {
			approved: 'Approved',
			pickup_scheduled: 'Pickup Scheduled',
			out_for_pickup: 'Out for Pickup',
			pickup_completed: 'Pickup Completed'
		};
		return labels[status] || status;
	};

	const formatDate = (dateString) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const StatusDropdown = ({ request }) => {
		const [selectedStatus, setSelectedStatus] = useState(request.status);
		const [pickupDate, setPickupDate] = useState('');
		const [showDatePicker, setShowDatePicker] = useState(false);

		const handleStatusChange = async (newStatus) => {
			if (newStatus === 'pickup_scheduled') {
				setShowDatePicker(true);
				setSelectedStatus(newStatus);
			}
		};

		const handleDateSubmit = async () => {
			if (pickupDate) {
				await handleStatusUpdate(request.request_id, selectedStatus, pickupDate);
				setShowDatePicker(false);
				setPickupDate('');
			}
		};

		// Only show schedule pickup option for approved requests
		if (request.status !== 'approved') {
			return (
				<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(request.status)}`}>
					{getStatusLabel(request.status)}
				</span>
			);
		}

		return (
			<div className="relative">
				<select
					value={selectedStatus}
					onChange={(e) => handleStatusChange(e.target.value)}
					disabled={updating[request.request_id]}
					className="bg-gray-700 text-gray-100 rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
				>
					<option value="approved">Approved</option>
					<option value="pickup_scheduled">Schedule Pickup</option>
				</select>

				{showDatePicker && (
					<div className="absolute top-full mt-2 bg-gray-700 rounded-lg p-4 border border-gray-600 z-50 min-w-max">
						<label className="block text-sm font-medium text-gray-300 mb-2">
							Select Pickup Date & Time:
						</label>
						<input
							type="datetime-local"
							value={pickupDate}
							onChange={(e) => setPickupDate(e.target.value)}
							className="bg-gray-600 text-gray-100 rounded px-3 py-2 border border-gray-500 focus:border-blue-500 focus:outline-none mb-3"
						/>
						<div className="flex space-x-2">
							<button
								onClick={handleDateSubmit}
								disabled={!pickupDate}
								className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
							>
								Confirm
							</button>
							<button
								onClick={() => {
									setShowDatePicker(false);
									setSelectedStatus(request.status);
									setPickupDate('');
								}}
								className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</div>
		);
	};

	const RequestDetailsCard = ({ request }) => (
		<div className="bg-gray-700/30 rounded-lg p-4 mt-2">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{/* Contact Information */}
				<div>
					<h4 className="font-semibold text-gray-100 mb-2 flex items-center">
						<User className="w-4 h-4 mr-2" />
						Contact Information
					</h4>
					<div className="space-y-1 text-sm">
						<div className="flex items-center">
							<User className="w-3 h-3 text-gray-400 mr-2" />
							<span className="text-gray-300">{request.contact_name}</span>
						</div>
						<div className="flex items-center">
							<Phone className="w-3 h-3 text-gray-400 mr-2" />
							<span className="text-gray-300">{request.contact_phone}</span>
						</div>
						<div className="flex items-center">
							<Mail className="w-3 h-3 text-gray-400 mr-2" />
							<span className="text-gray-300">{request.contact_email}</span>
						</div>
						<div className="flex items-center">
							<Package className="w-3 h-3 text-gray-400 mr-2" />
							<span className="text-gray-300">{request.department}</span>
						</div>
					</div>
				</div>

				{/* Pickup Information */}
				<div>
					<h4 className="font-semibold text-gray-100 mb-2 flex items-center">
						<MapPin className="w-4 h-4 mr-2" />
						Pickup Information
					</h4>
					<div className="space-y-1 text-sm">
						<div className="flex items-start">
							<MapPin className="w-3 h-3 text-gray-400 mr-2 mt-1" />
							<span className="text-gray-300">{request.pickup_address}</span>
						</div>
						{request.preferred_date && (
							<div className="flex items-center">
								<Calendar className="w-3 h-3 text-gray-400 mr-2" />
								<span className="text-gray-300">
									Preferred: {formatDate(request.preferred_date)}
								</span>
							</div>
						)}
						{request.pickup_datetime && (
							<div className="flex items-center">
								<Clock className="w-3 h-3 text-gray-400 mr-2" />
								<span className="text-gray-300">
									Scheduled: {formatDate(request.pickup_datetime)}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* E-Waste Details */}
				<div>
					<h4 className="font-semibold text-gray-100 mb-2 flex items-center">
						<FileText className="w-4 h-4 mr-2" />
						E-Waste Details
					</h4>
					<div className="space-y-1 text-sm">
						<div>
							<span className="text-gray-400">Description:</span>
							<p className="text-gray-300 text-xs">{request.e_waste_description}</p>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<span className="text-gray-400">Weight:</span>
								<p className="text-gray-100">{request.weight_kg ? `${request.weight_kg} kg` : 'N/A'}</p>
							</div>
							<div>
								<span className="text-gray-400">Items:</span>
								<p className="text-gray-100">{request.item_count || 'N/A'}</p>
							</div>
						</div>
						<div>
							<span className="text-gray-400">Est. Value:</span>
							<p className="text-gray-100">{request.estimated_value ? `$${request.estimated_value}` : 'N/A'}</p>
						</div>
					</div>
				</div>
			</div>

			{request.additional_notes && (
				<div className="mt-4 pt-4 border-t border-gray-600">
					<h5 className="font-medium text-gray-100 mb-2">Additional Notes:</h5>
					<p className="text-gray-300 text-sm">{request.additional_notes}</p>
				</div>
			)}
		</div>
	);

	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<Header title='Manage Approved Requests' />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* Page Header */}
				<div className='mb-8'>
					<h1 className='text-3xl font-bold text-gray-100 mb-2'>Approved Disposal Requests</h1>
					<p className='text-gray-400'>Manage pickup scheduling and track request progress</p>
				</div>

				{/* Error Display */}
				{error && (
					<div className='mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4'>
						<div className='flex items-center'>
							<AlertCircle className='w-5 h-5 text-red-400 mr-2' />
							<span className='text-red-300'>{error}</span>
						</div>
					</div>
				)}

				{/* Requests Table */}
				<motion.div
					className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-xl font-semibold text-gray-100'>Approved Requests ({requests.length})</h2>
						<button
							onClick={fetchApprovedRequests}
							disabled={loading}
							className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
						>
							{loading ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>

					{loading ? (
						<div className='text-center py-8'>
							<div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
							<p className='text-gray-400 mt-2'>Loading requests...</p>
						</div>
					) : requests.length === 0 ? (
						<div className='text-center py-8'>
							<Package className='w-12 h-12 text-gray-400 mx-auto mb-4' />
							<p className='text-gray-400'>No approved requests found</p>
						</div>
					) : (
						<div className='space-y-4'>
							{requests.map((request, index) => (
								<motion.div
									key={request.request_id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.3, delay: index * 0.1 }}
									className='bg-gray-700/50 rounded-lg border border-gray-600'
								>
									{/* Request Header */}
									<div className='p-4'>
										<div className='flex flex-wrap items-center justify-between gap-4'>
											<div className='flex items-center space-x-4'>
												<div>
													<h3 className='text-lg font-semibold text-gray-100'>
														{request.request_id}
													</h3>
													<p className='text-sm text-gray-400'>
														{request.department} • {request.contact_name}
													</p>
												</div>
											</div>

											<div className='flex items-center space-x-4'>
												<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(request.status)}`}>
													{getStatusLabel(request.status)}
												</span>
												
												<StatusDropdown request={request} />
											</div>
										</div>
									</div>

									{/* Request Details */}
									<RequestDetailsCard request={request} />
								</motion.div>
							))}
						</div>
					)}
				</motion.div>
			</main>
		</div>
	);
};

export default ApprovedRequestsPage;