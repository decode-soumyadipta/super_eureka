import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Phone, Mail, User, FileText, AlertCircle, Package } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";

const ScheduledRequestsPage = () => {
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [updating, setUpdating] = useState({});

	useEffect(() => {
		fetchScheduledRequests();
	}, []);

	const fetchScheduledRequests = async () => {
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
				// Filter only scheduled requests and sort by pickup_datetime
				const scheduledRequests = (data.data.requests || [])
					.filter(r => 
						r.status === 'pickup_scheduled' || 
						r.status === 'out_for_pickup' || 
						r.status === 'pickup_completed'
					)
					.sort((a, b) => {
						// Sort by pickup_datetime, putting null dates at the end
						if (!a.pickup_datetime && !b.pickup_datetime) return 0;
						if (!a.pickup_datetime) return 1;
						if (!b.pickup_datetime) return -1;
						return new Date(a.pickup_datetime) - new Date(b.pickup_datetime);
					});
				setRequests(scheduledRequests);
			} else {
				throw new Error(data.message || 'Failed to fetch requests');
			}
		} catch (err) {
			console.error('Error fetching scheduled requests:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleStatusUpdate = async (requestId, newStatus) => {
		try {
			setUpdating(prev => ({ ...prev, [requestId]: true }));
			setError(null);

			const token = localStorage.getItem('token');
			const payload = { status: newStatus };

			const response = await fetch(`/api/vendor/disposal-requests/${requestId}/respond`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to update status');
			}

			const data = await response.json();
			
			if (data.success) {
				await fetchScheduledRequests(); // Refresh the data
			} else {
				throw new Error(data.message || 'Failed to update status');
			}
		} catch (err) {
			console.error('Error updating status:', err);
			setError(err.message);
		} finally {
			setUpdating(prev => ({ ...prev, [requestId]: false }));
		}
	};

	const getStatusColor = (status) => {
		const colors = {
			pickup_scheduled: 'bg-purple-500',
			out_for_pickup: 'bg-orange-500',
			pickup_completed: 'bg-green-500'
		};
		return colors[status] || 'bg-gray-500';
	};

	const getStatusLabel = (status) => {
		const labels = {
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

	const formatDateOnly = (dateString) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString();
	};

	const StatusDropdown = ({ request }) => {
		const [selectedStatus, setSelectedStatus] = useState(request.status);

		const handleStatusChange = async (newStatus) => {
			setSelectedStatus(newStatus);
			await handleStatusUpdate(request.request_id, newStatus);
		};

		// Show different options based on current status
		const getAvailableOptions = () => {
			switch (request.status) {
				case 'pickup_scheduled':
					return [
						{ value: 'pickup_scheduled', label: 'Pickup Scheduled' },
						{ value: 'out_for_pickup', label: 'Out for Pickup' }
					];
				case 'out_for_pickup':
					return [
						{ value: 'out_for_pickup', label: 'Out for Pickup' },
						{ value: 'pickup_completed', label: 'Pickup Completed' }
					];
				case 'pickup_completed':
					return [
						{ value: 'pickup_completed', label: 'Pickup Completed' }
					];
				default:
					return [{ value: request.status, label: getStatusLabel(request.status) }];
			}
		};

		const options = getAvailableOptions();

		if (options.length === 1) {
			return (
				<span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(request.status)}`}>
					{getStatusLabel(request.status)}
				</span>
			);
		}

		return (
			<select
				value={selectedStatus}
				onChange={(e) => handleStatusChange(e.target.value)}
				disabled={updating[request.request_id]}
				className="bg-gray-700 text-gray-100 rounded-lg px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none disabled:opacity-50"
			>
				{options.map(option => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
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

	// Group requests by date
	const groupedRequests = requests.reduce((groups, request) => {
		const date = request.pickup_datetime ? formatDateOnly(request.pickup_datetime) : 'No Date Set';
		if (!groups[date]) {
			groups[date] = [];
		}
		groups[date].push(request);
		return groups;
	}, {});

	// Sort dates
	const sortedDates = Object.keys(groupedRequests).sort((a, b) => {
		if (a === 'No Date Set') return 1;
		if (b === 'No Date Set') return -1;
		return new Date(a) - new Date(b);
	});

	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<Header title='Manage Scheduled Requests' />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* Page Header */}
				<div className='mb-8'>
					<h1 className='text-3xl font-bold text-gray-100 mb-2'>Scheduled Pickup Requests</h1>
					<p className='text-gray-400'>Manage pickup execution and completion - sorted by pickup date</p>
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

				{/* Requests grouped by date */}
				<motion.div
					className='space-y-6'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-xl font-semibold text-gray-100'>Total Scheduled Requests: {requests.length}</h2>
						<button
							onClick={fetchScheduledRequests}
							disabled={loading}
							className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
						>
							{loading ? 'Refreshing...' : 'Refresh'}
						</button>
					</div>

					{loading ? (
						<div className='text-center py-8'>
							<div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
							<p className='text-gray-400 mt-2'>Loading scheduled requests...</p>
						</div>
					) : requests.length === 0 ? (
						<div className='text-center py-8 bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-xl'>
							<Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
							<p className='text-gray-400'>No scheduled requests found</p>
						</div>
					) : (
						<div className='space-y-6'>
							{sortedDates.map((date, dateIndex) => (
								<motion.div
									key={date}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.3, delay: dateIndex * 0.1 }}
									className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl border border-gray-700'
								>
									{/* Date Header */}
									<div className='bg-gray-700/50 px-6 py-4 rounded-t-xl border-b border-gray-600'>
										<h3 className='text-lg font-semibold text-gray-100 flex items-center'>
											<Calendar className='w-5 h-5 mr-2' />
											{date} ({groupedRequests[date].length} request{groupedRequests[date].length !== 1 ? 's' : ''})
										</h3>
									</div>

									{/* Requests for this date */}
									<div className='p-6 space-y-4'>
										{groupedRequests[date].map((request, index) => (
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
																<h4 className='text-lg font-semibold text-gray-100'>
																	{request.request_id}
																</h4>
																<p className='text-sm text-gray-400'>
																	{request.department} • {request.contact_name}
																</p>
																{request.pickup_datetime && (
																	<p className='text-xs text-purple-400'>
																		Time: {new Date(request.pickup_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
																	</p>
																)}
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
								</motion.div>
							))}
						</div>
					)}
				</motion.div>
			</main>
		</div>
	);
};

export default ScheduledRequestsPage;