import { motion } from "framer-motion";
import { AlertCircle, BarChart3, ShoppingBag, Users, Zap } from "lucide-react";
import { useState, useEffect } from "react";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import CategoryDistributionChart from "../components/overview/CategoryDistributionChart";
import SalesChannelChart from "../components/overview/SalesChannelChart";
import { deviceService } from "../services/deviceService.js";
import { authService } from "../services/authService.js";

const OverviewPage = () => {
	const [stats, setStats] = useState({
		total_devices: 0,
		recent_registrations: 0,
		devices_by_condition: [],
		recent_activity: []
	});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [user, setUser] = useState(null);

	useEffect(() => {
		const currentUser = authService.getCurrentUser();
		setUser(currentUser);
		fetchDashboardData();
	}, []);

	const fetchDashboardData = async () => {
		try {
			setLoading(true);
			const response = await deviceService.getDepartmentStats();
			
			if (response.success) {
				setStats(response.data);
			} else {
				setError('Failed to fetch dashboard data');
			}
		} catch (err) {
			console.error('Dashboard data fetch error:', err);
			setError(err.message || 'Failed to fetch dashboard data');
		} finally {
			setLoading(false);
		}
	};

	// Calculate condition-based stats
	const getConditionCount = (condition) => {
		const conditionData = stats.devices_by_condition.find(item => item.condition_status === condition);
		return conditionData ? conditionData.count : 0;
	};

	const excellentDevices = getConditionCount('excellent');
	const goodDevices = getConditionCount('good');
	const fairDevices = getConditionCount('fair');
	const poorDevices = getConditionCount('poor') + getConditionCount('damaged');

	if (loading) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title='E-Waste Management Overview' />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
							<p className="mt-4 text-secondary-600">Loading dashboard data...</p>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title='E-Waste Management Overview' />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center text-red-600">
							<AlertCircle size={48} className="mx-auto mb-4" />
							<p className="text-lg font-semibold">Error Loading Dashboard</p>
							<p className="text-sm mt-2">{error}</p>
							<button 
								onClick={fetchDashboardData}
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
			<Header title={`E-Waste Management Overview - ${user?.department || 'Admin'}`} />

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
						icon={ShoppingBag} 
						value={stats.total_devices.toLocaleString()} 
						color='#4caf50' 
					/>
					<StatCard 
						name='Recent Registrations' 
						icon={Zap} 
						value={stats.recent_registrations} 
						color='#45a049' 
					/>
					<StatCard 
						name='Excellent Condition' 
						icon={BarChart3} 
						value={excellentDevices.toLocaleString()} 
						color='#388e3c' 
					/>
					<StatCard 
						name='Needs Attention' 
						icon={AlertCircle} 
						value={poorDevices} 
						color='#2d5016' 
					/>
				</motion.div>

				{/* CHARTS */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
					<SalesOverviewChart />
					<CategoryDistributionChart conditionData={stats.devices_by_condition} />
				</div>

				<div className='grid grid-cols-1 lg:grid-cols-1 gap-8'>
					<SalesChannelChart conditionData={stats.devices_by_condition} />
				</div>

				{/* Recent Activity */}
				{stats.recent_activity && stats.recent_activity.length > 0 && (
					<motion.div
						className='mt-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<h2 className='text-lg font-medium mb-4 text-primary-800'>Recent Activity</h2>
						<div className='space-y-3'>
							{stats.recent_activity.slice(0, 5).map((activity, index) => (
								<div key={index} className='flex items-center justify-between p-3 bg-primary-50 rounded-lg'>
									<div className='flex-1'>
										<p className='text-sm font-medium text-primary-800'>
											{activity.device_name}
										</p>
										<p className='text-xs text-primary-600'>
											{activity.action_type} by {activity.performed_by_name}
										</p>
									</div>
									<div className='text-xs text-primary-500'>
										{new Date(activity.action_date).toLocaleDateString()}
									</div>
								</div>
							))}
						</div>
					</motion.div>
				)}
			</main>
		</div>
	);
};

export default OverviewPage;
