import React, { useState, useEffect } from "react";
import { Package, Clock, CheckCircle, Truck, AlertCircle, Eye, MapPin, Phone, Mail, Calendar, User, FileText } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";

const OverviewPage = () => {
	const [stats, setStats] = useState({
		total_requests: 0,
		pending_requests: 0,
		scheduled_pickups: 0,
		completed_pickups: 0
	});
	const [recentRequests, setRecentRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [selectedRequest, setSelectedRequest] = useState(null);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const token = localStorage.getItem('token');
			if (!token) {
				setError('No authentication token found');
				return;
			}

			// Fetch disposal requests for admin dashboard
			const response = await fetch('/api/vendor/disposal-requests', {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to fetch dashboard data');
			}

			const data = await response.json();
			
			if (data.success) {
				const requests = data.data.requests || [];
				
				// Calculate stats from real data
				const calculatedStats = {
					total_requests: requests.length,
					pending_requests: requests.filter(r => r.status === 'pending').length,
					scheduled_pickups: requests.filter(r => r.status === 'pickup_scheduled').length,
					completed_pickups: requests.filter(r => r.status === 'pickup_completed').length
				};
				
				setStats(calculatedStats);
				setRecentRequests(requests.slice(0, 5)); // Show last 5 requests
			} else {
				throw new Error(data.message || 'Failed to fetch dashboard data');
			}
		} catch (err) {
			console.error('Error fetching dashboard data:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleViewDetails = (request) => {
		setSelectedRequest(request);
	};

	const handleCloseDetails = () => {
		setSelectedRequest(null);
	};

	const handleRequestAction = async (requestId, action, notes = '') => {
		try {
			setActionLoading(true);
			setError(null);

			const token = localStorage.getItem('token');
			const response = await fetch(`/api/vendor/disposal-requests/${requestId}/respond`, {
				method: 'PUT',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					status: action,
					vendor_notes: notes
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `Failed to ${action} request`);
			}

			const data = await response.json();
			
			if (data.success) {
				setSelectedRequest(null);
				fetchDashboardData(); // Refresh the data
			} else {
				throw new Error(data.message || `Failed to ${action} request`);
			}
		} catch (err) {
			console.error(`Error ${action}ing request:`, err);
			setError(err.message);
		} finally {
			setActionLoading(false);
		}
	};

	const getStatusColor = (status) => {
		const colors = {
			pending: 'bg-yellow-500',
			approved: 'bg-blue-500',
			pickup_scheduled: 'bg-purple-500',
			out_for_pickup: 'bg-orange-500',
			pickup_completed: 'bg-green-500',
			rejected: 'bg-red-500',
			cancelled: 'bg-gray-500'
		};
		return colors[status] || 'bg-gray-500';
	};

	const getStatusLabel = (status) => {
		const labels = {
			pending: 'Pending Review',
			approved: 'Approved',
			pickup_scheduled: 'Pickup Scheduled',
			out_for_pickup: 'Out for Pickup',
			pickup_completed: 'Pickup Completed',
			rejected: 'Rejected',
			cancelled: 'Cancelled'
		};
		return labels[status] || status;
	};

	const formatDate = (dateString) => {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<Header title='E-Waste Management Dashboard' />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* Page Header */}
				<div className='mb-8'>
					<h1 className='text-3xl font-bold text-gray-100 mb-2'>Admin Dashboard</h1>
					<p className='text-gray-400'>Monitor disposal requests and coordinate with vendors</p>
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

				{/* STATS */}
				<motion.div
					className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1 }}
				>
					<StatCard 
						name='Total Requests' 
						icon={Package} 
						value={loading ? '...' : stats.total_requests} 
						color='#3B82F6' 
					/>
					<StatCard 
						name='Pending Review' 
						icon={Clock} 
						value={loading ? '...' : stats.pending_requests} 
						color='#F59E0B' 
					/>
					<StatCard 
						name='Scheduled Pickups' 
						icon={Truck} 
						value={loading ? '...' : stats.scheduled_pickups} 
						color='#8B5CF6' 
					/>
					<StatCard 
						name='Completed Pickups' 
						icon={CheckCircle} 
						value={loading ? '...' : stats.completed_pickups} 
						color='#10B981' 
					/>
				</motion.div>

				{/* Recent Disposal Requests */}
				<motion.div
					className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<div className='flex justify-between items-center mb-6'>
						<h2 className='text-xl font-semibold text-gray-100'>Recent Disposal Requests</h2>
						<button
							onClick={fetchDashboardData}
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
					) : recentRequests.length === 0 ? (
						<div className='text-center py-8'>
							<Package className='w-12 h-12 text-gray-400 mx-auto mb-4' />
							<p className='text-gray-400'>No disposal requests found</p>
						</div>
					) : (
						<div className='overflow-x-auto'>
							<table className='min-w-full divide-y divide-gray-700'>
								<thead>
									<tr>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Request ID
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Department
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Contact
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Items
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Created
										</th>
										<th className='px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Status
										</th>
										<th className='px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider'>
											Actions
										</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-700'>
									{recentRequests.map((request, index) => (
										<motion.tr
											key={request.request_id}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ duration: 0.3, delay: index * 0.1 }}
											className='hover:bg-gray-700/50'
										>
											<td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100'>
												{request.request_id}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
												{request.department}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
												<div>
													<div>{request.contact_name}</div>
													<div className='text-xs text-gray-500'>{request.contact_phone}</div>
												</div>
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
												{request.item_count || 'N/A'}
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
												{formatDate(request.created_at)}
											</td>
											<td className='px-6 py-4 whitespace-nowrap'>
												<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(request.status)}`}>
													{getStatusLabel(request.status)}
												</span>
											</td>
											<td className='px-6 py-4 whitespace-nowrap text-center text-sm font-medium'>
												<button
													onClick={() => handleViewDetails(request)}
													className='text-blue-400 hover:text-blue-300 transition-colors'
													title='View Details'
												>
													<Eye className='w-5 h-5' />
												</button>
											</td>
										</motion.tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</motion.div>

				{/* Request Details Modal */}
				{selectedRequest && (
					<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.3 }}
							className='bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto w-full border border-gray-700'
						>
							<div className='p-6'>
								<div className='flex justify-between items-center mb-6'>
									<h3 className='text-2xl font-bold text-gray-100'>
										Request Details - {selectedRequest.request_id}
									</h3>
									<button
										onClick={handleCloseDetails}
										className='text-gray-400 hover:text-gray-300 text-2xl'
									>
										×
									</button>
								</div>
								
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-6'>
									{/* Contact Information */}
									<div className='bg-gray-700/50 rounded-lg p-4'>
										<h4 className='font-semibold text-gray-100 mb-3 flex items-center'>
											<User className='w-5 h-5 mr-2' />
											Contact Information
										</h4>
										<div className='space-y-3'>
											<div className='flex items-center'>
												<User className='w-4 h-4 text-gray-400 mr-2' />
												<span className='text-gray-300'>{selectedRequest.contact_name}</span>
											</div>
											<div className='flex items-center'>
												<Phone className='w-4 h-4 text-gray-400 mr-2' />
												<span className='text-gray-300'>{selectedRequest.contact_phone}</span>
											</div>
											<div className='flex items-center'>
												<Mail className='w-4 h-4 text-gray-400 mr-2' />
												<span className='text-gray-300'>{selectedRequest.contact_email}</span>
											</div>
											<div className='flex items-center'>
												<Package className='w-4 h-4 text-gray-400 mr-2' />
												<span className='text-gray-300'>{selectedRequest.department}</span>
											</div>
										</div>
									</div>
									
									{/* Pickup Information */}
									<div className='bg-gray-700/50 rounded-lg p-4'>
										<h4 className='font-semibold text-gray-100 mb-3 flex items-center'>
											<MapPin className='w-5 h-5 mr-2' />
											Pickup Information
										</h4>
										<div className='space-y-3'>
											<div className='flex items-start'>
												<MapPin className='w-4 h-4 text-gray-400 mr-2 mt-1' />
												<span className='text-gray-300'>{selectedRequest.pickup_address}</span>
											</div>
											{selectedRequest.preferred_date && (
												<div className='flex items-center'>
													<Calendar className='w-4 h-4 text-gray-400 mr-2' />
													<span className='text-gray-300'>
														Preferred: {formatDate(selectedRequest.preferred_date)}
													</span>
												</div>
											)}
											{selectedRequest.preferred_time_slot && (
												<div className='flex items-center'>
													<Clock className='w-4 h-4 text-gray-400 mr-2' />
													<span className='text-gray-300'>{selectedRequest.preferred_time_slot}</span>
												</div>
											)}
										</div>
									</div>
								</div>

								{/* E-Waste Details */}
								<div className='bg-gray-700/50 rounded-lg p-4 mb-6'>
									<h4 className='font-semibold text-gray-100 mb-3 flex items-center'>
										<FileText className='w-5 h-5 mr-2' />
										E-Waste Details
									</h4>
									<p className='text-gray-300 mb-4'>{selectedRequest.e_waste_description}</p>
									<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
										<div>
											<span className='text-gray-400 text-sm'>Weight:</span>
											<p className='text-gray-100'>{selectedRequest.weight_kg ? `${selectedRequest.weight_kg} kg` : 'N/A'}</p>
										</div>
										<div>
											<span className='text-gray-400 text-sm'>Items:</span>
											<p className='text-gray-100'>{selectedRequest.item_count || 'N/A'}</p>
										</div>
										<div>
											<span className='text-gray-400 text-sm'>Estimated Value:</span>
											<p className='text-gray-100'>{selectedRequest.estimated_value ? `$${selectedRequest.estimated_value}` : 'N/A'}</p>
										</div>
										<div>
											<span className='text-gray-400 text-sm'>Status:</span>
											<p className='text-gray-100'>{getStatusLabel(selectedRequest.status)}</p>
										</div>
									</div>
								</div>

								{/* Additional Notes */}
								{selectedRequest.additional_notes && (
									<div className='bg-gray-700/50 rounded-lg p-4 mb-6'>
										<h4 className='font-semibold text-gray-100 mb-3'>Additional Notes</h4>
										<p className='text-gray-300'>{selectedRequest.additional_notes}</p>
									</div>
								)}

								{/* Vendor Notes */}
								{selectedRequest.vendor_notes && (
									<div className='bg-gray-700/50 rounded-lg p-4 mb-6'>
										<h4 className='font-semibold text-gray-100 mb-3'>Vendor Notes</h4>
										<p className='text-gray-300'>{selectedRequest.vendor_notes}</p>
									</div>
								)}

								{/* Action Buttons */}
								<div className='flex justify-end space-x-4'>
									<button
										onClick={handleCloseDetails}
										className='px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors'
										disabled={actionLoading}
									>
										Close
									</button>
									
									{selectedRequest.status === 'pending' && (
										<>
											<button
												onClick={() => handleRequestAction(selectedRequest.request_id, 'rejected', 'Request rejected by admin')}
												className='px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
												disabled={actionLoading}
											>
												{actionLoading ? 'Processing...' : 'Reject'}
											</button>
											<button
												onClick={() => handleRequestAction(selectedRequest.request_id, 'approved', 'Request approved by admin')}
												className='px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
												disabled={actionLoading}
											>
												{actionLoading ? 'Processing...' : 'Accept'}
											</button>
										</>
									)}
								</div>
							</div>
						</motion.div>
					</div>
				)}

				{/* Quick Actions */}
				<motion.div
					className='mt-8 grid grid-cols-1 md:grid-cols-2 gap-6'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.4 }}
				>
					<div className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'>
						<h3 className='text-lg font-semibold text-gray-100 mb-3'>User Management</h3>
						<p className='text-gray-400 mb-4'>Manage system users, roles, and permissions</p>
						<a
							href='/users'
							className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
						>
							Manage Users
						</a>
					</div>

					<div className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'>
						<h3 className='text-lg font-semibold text-gray-100 mb-3'>Products & Services</h3>
						<p className='text-gray-400 mb-4'>Configure disposal services and pricing</p>
						<a
							href='/products'
							className='inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
						>
							Manage Products
						</a>
					</div>
				</motion.div>
			</main>
		</div>
	);
};

export default OverviewPage;
