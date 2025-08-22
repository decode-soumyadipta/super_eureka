import React, { useState, useEffect } from "react";
import { UserCheck, UserPlus, UsersIcon, UserX, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import UsersTable from "../components/users/UsersTable";

const UsersPage = () => {
	const [userStats, setUserStats] = useState({
		totalUsers: 0,
		activeUsers: 0,
		adminUsers: 0,
		vendorUsers: 0
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		fetchUsersData();
	}, []);

	const fetchUsersData = async () => {
		try {
			setLoading(true);
			setError(null);
			
			const token = localStorage.getItem('token');
			if (!token) {
				setError('No authentication token found');
				return;
			}

			// Fetch users data
			const response = await fetch('/api/users', {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to fetch users data');
			}

			const data = await response.json();
			
			if (data.success) {
				const users = data.data.users || [];
				
				const calculatedStats = {
					totalUsers: users.length,
					activeUsers: users.filter(u => u.is_active).length,
					adminUsers: users.filter(u => u.role === 'admin').length,
					vendorUsers: users.filter(u => u.role === 'vendor').length
				};
				
				setUserStats(calculatedStats);
			} else {
				throw new Error(data.message || 'Failed to fetch users data');
			}
		} catch (err) {
			console.error('Error fetching users data:', err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<Header title='User Management' />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* Page Header */}
				<div className='mb-8'>
					<h1 className='text-3xl font-bold text-gray-100 mb-2'>User Management</h1>
					<p className='text-gray-400'>Manage system users, roles, and permissions for e-waste management</p>
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
						name='Total Users'
						icon={UsersIcon}
						value={loading ? '...' : userStats.totalUsers}
						color='#6366F1'
					/>
					<StatCard 
						name='Active Users' 
						icon={UserCheck} 
						value={loading ? '...' : userStats.activeUsers} 
						color='#10B981' 
					/>
					<StatCard
						name='Admin Users'
						icon={UserPlus}
						value={loading ? '...' : userStats.adminUsers}
						color='#F59E0B'
					/>
					<StatCard 
						name='Vendor Users' 
						icon={UserX} 
						value={loading ? '...' : userStats.vendorUsers} 
						color='#8B5CF6' 
					/>
				</motion.div>

				<UsersTable />
			</main>
		</div>
	);
};
export default UsersPage;
