import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";

import { AlertTriangle, Package, CheckCircle, Clock } from "lucide-react";
import ProductsTable from "../components/products/ProductsTable";

const ProductsPage = () => {
	const [stats, setStats] = useState({
		total_services: 0,
		active_services: 0,
		pending_requests: 0,
		completed_requests: 0
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchServicesData();
	}, []);

	const fetchServicesData = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const token = localStorage.getItem('token');
			if (!token) {
				setError('No authentication token found');
				return;
			}

			// Fetch products/services and disposal requests
			const [servicesResponse, requestsResponse] = await Promise.all([
				fetch('/api/products', {
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				}),
				fetch('/api/vendor/disposal-requests', {
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				})
			]);

			const servicesData = await servicesResponse.json();
			const requestsData = await requestsResponse.json();

			if (servicesData.success && requestsData.success) {
				const services = servicesData.data || [];
				const requests = requestsData.data.requests || [];

				const calculatedStats = {
					total_services: services.length,
					active_services: services.filter(s => s.is_active).length,
					pending_requests: requests.filter(r => r.status === 'pending').length,
					completed_requests: requests.filter(r => r.status === 'pickup_completed').length
				};

				setStats(calculatedStats);
			} else {
				throw new Error('Failed to fetch services data');
			}
		} catch (err) {
			console.error('Error fetching services data:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='flex-1 flex flex-col h-full bg-gray-900'>
			<Header title='E-Waste Disposal Services' />

			<main className='flex-1 py-6 px-6 overflow-auto'>
				{/* Page Header */}
				<div className='mb-8'>
					<h1 className='text-3xl font-bold text-gray-100 mb-2'>Disposal Services Management</h1>
					<p className='text-gray-400'>Configure and manage e-waste disposal services and pricing</p>
				</div>

				{/* Error Display */}
				{error && (
					<div className='mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4'>
						<div className='flex items-center'>
							<AlertTriangle className='w-5 h-5 text-red-400 mr-2' />
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
						name='Total Services' 
						icon={Package} 
						value={loading ? '...' : stats.total_services} 
						color='#6366F1' 
					/>
					<StatCard 
						name='Active Services' 
						icon={CheckCircle} 
						value={loading ? '...' : stats.active_services} 
						color='#10B981' 
					/>
					<StatCard 
						name='Pending Requests' 
						icon={Clock} 
						value={loading ? '...' : stats.pending_requests} 
						color='#F59E0B' 
					/>
					<StatCard 
						name='Completed Requests' 
						icon={CheckCircle} 
						value={loading ? '...' : stats.completed_requests} 
						color='#8B5CF6' 
					/>
				</motion.div>

				<ProductsTable />
			</main>
		</div>
	);
};
export default ProductsPage;
