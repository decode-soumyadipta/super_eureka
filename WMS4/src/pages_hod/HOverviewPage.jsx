import { BarChart2, ShoppingBag, Users, Zap, AlertTriangle, TrendingUp, Clipboard, Calendar, Tag, BarChart } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import CategoryDistributionChart from "../components/overview/CategoryDistributionChart";
import SalesChannelChart from "../components/overview/SalesChannelChart";
import { deviceService } from "../services/deviceService.js";
import { authService } from "../services/authService.js";

const HOverviewPage = () => {
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [user, setUser] = useState(null);
	const [recentActivity, setRecentActivity] = useState([]);

	useEffect(() => {
		const currentUser = authService.getCurrentUser();
		setUser(currentUser);
		fetchStats();
	}, []);

	const fetchStats = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await deviceService.getDepartmentStats();
			
			if (response.success) {
				console.log('Stats data:', response.data);
				setStats(response.data);
				
				// Extract recent activity if available
				if (response.data.recent_activity && response.data.recent_activity.length > 0) {
					setRecentActivity(response.data.recent_activity);
				}
			} else {
				setError('Failed to fetch statistics');
			}
		} catch (err) {
			console.error('Stats fetch error:', err);
			setError(err.message || 'Failed to fetch statistics');
		} finally {
			setLoading(false);
		}
	};

	// Calculate derived stats from fetched data
	const getConditionPercentage = (condition) => {
		if (!stats || !stats.condition_breakdown) return 0;
		
		const conditionItem = stats.condition_breakdown.find(
			item => item.condition_status === condition
		);
		
		if (!conditionItem) return 0;
		
		const totalDevices = stats.total_devices || 1; // Avoid division by zero
		return ((conditionItem.count / totalDevices) * 100).toFixed(1);
	};

	const getRecentDevicesCount = () => {
		if (!stats) return 0;
		return stats.recent_registrations || 0;
	};

	const getNeedsAttentionCount = () => {
		if (!stats || !stats.condition_breakdown) return 0;
		
		const poorCondition = stats.condition_breakdown.find(
			item => item.condition_status === 'poor'
		);
		
		const damagedCondition = stats.condition_breakdown.find(
			item => item.condition_status === 'damaged'
		);
		
		const poor = poorCondition ? poorCondition.count : 0;
		const damaged = damagedCondition ? damagedCondition.count : 0;
		
		return poor + damaged;
	};
	
	// Calculate number of devices by condition
	const getConditionCount = (condition) => {
		if (!stats || !stats.condition_breakdown) return 0;
		
		const conditionItem = stats.condition_breakdown.find(
			item => item.condition_status === condition
		);
		
		return conditionItem ? conditionItem.count : 0;
	};

	// Get the number of unique device types
	const getUniqueDeviceTypesCount = () => {
		if (!stats || !stats.device_types) return 0;
		return stats.device_types.length;
	};

	if (loading) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title={`Dashboard - ${user?.department || 'Department'}`} />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
							<p className="mt-4 text-secondary-600">Loading dashboard...</p>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title={`Dashboard - ${user?.department || 'Department'}`} />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center text-red-600">
							<AlertTriangle size={48} className="mx-auto mb-4" />
							<p className="text-lg font-semibold">Error Loading Dashboard</p>
							<p className="text-sm mt-2">{error}</p>
							<button 
								onClick={fetchStats}
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
			<Header title={`Dashboard - ${user?.department || 'Department'}`} />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* WELCOME MESSAGE */}
				<motion.div
					className="mb-6 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200 p-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<h2 className="text-2xl font-bold text-primary-800 mb-2">
						Welcome back, {user?.name}!
					</h2>
					<p className="text-secondary-600">
						Here's an overview of your department's device management activity.
					</p>
				</motion.div>

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
						value={stats?.total_devices?.toLocaleString() || '0'} 
						color='#4caf50' 
					/>
					<StatCard 
						name='Excellent Condition' 
						icon={Zap} 
						value={`${getConditionCount('excellent')} (${getConditionPercentage('excellent')}%)`} 
						color='#45a049' 
					/>
					<StatCard 
						name='Needs Attention' 
						icon={AlertTriangle} 
						value={getNeedsAttentionCount()} 
						color='#f44336' 
					/>
					<StatCard 
						name='Recent (7 days)' 
						icon={TrendingUp} 
						value={getRecentDevicesCount()} 
						color='#2196f3' 
					/>
				</motion.div>

				{/* ADDITIONAL STATS ROW */}
				<motion.div
					className='grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1, delay: 0.2 }}
				>
					<StatCard 
						name='Good Condition' 
						icon={BarChart2} 
						value={`${getConditionCount('good')} (${getConditionPercentage('good')}%)`} 
						color='#2196f3' 
					/>
					<StatCard 
						name='Fair Condition' 
						icon={BarChart} 
						value={`${getConditionCount('fair')} (${getConditionPercentage('fair')}%)`} 
						color='#ff9800' 
					/>
					<StatCard 
						name='Device Types' 
						icon={Tag} 
						value={getUniqueDeviceTypesCount()} 
						color='#9c27b0' 
					/>
				</motion.div>

				{/* QUICK INSIGHTS */}
				<motion.div
					className="mb-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200 p-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
					<h3 className="text-lg font-semibold text-primary-800 mb-4">Quick Insights</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						<div className="bg-green-50 p-4 rounded-lg">
							<p className="text-green-800 font-medium">Device Health</p>
							<p className="text-sm text-green-600 mt-1">
								{getConditionPercentage('excellent')}% of devices are in excellent condition
							</p>
						</div>
						<div className="bg-blue-50 p-4 rounded-lg">
							<p className="text-blue-800 font-medium">Recent Activity</p>
							<p className="text-sm text-blue-600 mt-1">
								{getRecentDevicesCount()} devices registered this week
							</p>
						</div>
						<div className="bg-orange-50 p-4 rounded-lg">
							<p className="text-orange-800 font-medium">Maintenance Alert</p>
							<p className="text-sm text-orange-600 mt-1">
								{getNeedsAttentionCount()} devices need attention
							</p>
						</div>
					</div>
				</motion.div>

				{/* CHARTS */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
					<SalesOverviewChart monthlyTrend={stats?.monthly_trend} />
					<CategoryDistributionChart conditionData={stats?.condition_breakdown} />
				</div>
				
				{/* DEVICE TYPES DISTRIBUTION */}
				<div className='grid grid-cols-1 gap-8 mb-8'>
					<SalesChannelChart deviceTypes={stats?.device_types} />
				</div>
				
				{/* RECENT ACTIVITY */}
				{recentActivity && recentActivity.length > 0 && (
					<motion.div
						className='mt-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<h2 className='text-lg font-medium mb-4 text-primary-800'>Recent Activity</h2>
						<div className='space-y-3'>
							{recentActivity.slice(0, 5).map((activity, index) => (
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
export default HOverviewPage;
