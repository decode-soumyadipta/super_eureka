import { BarChart2, ShoppingBag, Zap, AlertTriangle, TrendingUp, Tag, BarChart, Recycle, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import SalesOverviewChart from "../components/overview/SalesOverviewChart";
import CategoryDistributionChart from "../components/overview/CategoryDistributionChart";
import SalesChannelChart from "../components/overview/SalesChannelChart";
import DisposalAnalyticsChart from "../components/analytics/DisposalAnalyticsChart";
import CommunityIPFSChart from "../components/analytics/CommunityIPFSChart";
import { analyticsService } from "../services/analyticsService.js";
import { authService } from "../services/authService.js";

const HOverviewPage = () => {
	const [analytics, setAnalytics] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [user, setUser] = useState(null);

	useEffect(() => {
		const currentUser = authService.getCurrentUser();
		setUser(currentUser);
		fetchAnalytics();
	}, []);

	const fetchAnalytics = async () => {
		try {
			setLoading(true);
			setError(null);
			console.log('🔄 HOD Dashboard: Fetching comprehensive analytics...');
			
			const response = await analyticsService.getDashboardAnalytics();
			
			if (response.success) {
				console.log('✅ HOD Dashboard: Analytics loaded successfully:', response.data);
				setAnalytics(response.data);
			} else {
				setError('Failed to fetch analytics data');
			}
		} catch (err) {
			console.error('❌ HOD Dashboard: Analytics fetch error:', err);
			setError(err.message || 'Failed to fetch analytics data');
		} finally {
			setLoading(false);
		}
	};

	// Calculate derived metrics from analytics data
	const getConditionPercentage = (condition) => {
		if (!analytics || !analytics.condition_breakdown) return 0;
		
		const conditionItem = analytics.condition_breakdown.find(
			item => item.condition_status === condition
		);
		
		if (!conditionItem) return 0;
		
		const totalDevices = analytics.overview.total_devices || 1;
		return ((conditionItem.count / totalDevices) * 100).toFixed(1);
	};

	const getConditionCount = (condition) => {
		if (!analytics || !analytics.condition_breakdown) return 0;
		
		const conditionItem = analytics.condition_breakdown.find(
			item => item.condition_status === condition
		);
		
		return conditionItem ? conditionItem.count : 0;
	};

	const getUniqueDeviceTypesCount = () => {
		if (!analytics || !analytics.device_types) return 0;
		return analytics.device_types.length;
	};

	if (loading) {
		return (
			<div className='flex-1 overflow-auto relative z-10'>
				<Header title={`Dashboard - ${user?.department || 'Department'}`} />
				<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
					<div className="flex items-center justify-center h-64">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
							<p className="mt-4 text-secondary-600">Loading comprehensive dashboard...</p>
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
								onClick={fetchAnalytics}
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
			<Header title={`E-Waste Management Dashboard - ${analytics?.overview?.department || 'Department'}`} />

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
						Comprehensive overview of your department's device management and sustainability metrics.
					</p>
				</motion.div>

				{/* PRIMARY STATS */}
				<motion.div
					className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1 }}
				>
					<StatCard 
						name='Total Devices' 
						icon={ShoppingBag} 
						value={analyticsService.formatNumber(analytics?.overview?.total_devices || 0)} 
						color='#4caf50' 
					/>
					<StatCard 
						name='Excellent Condition' 
						icon={Zap} 
						value={`${getConditionCount('excellent')} (${getConditionPercentage('excellent')}%)`} 
						color='#45a049' 
					/>
					<StatCard 
						name='Maintenance Needed' 
						icon={AlertTriangle} 
						value={analytics?.overview?.maintenance_needed || 0} 
						color='#f44336' 
					/>
					<StatCard 
						name='Recent (7 days)' 
						icon={TrendingUp} 
						value={analytics?.overview?.recent_registrations || 0} 
						color='#2196f3' 
					/>
				</motion.div>

				{/* SECONDARY STATS */}
				<motion.div
					className='grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8'
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
					<StatCard 
						name='Disposal Efficiency' 
						icon={Recycle} 
						value={`${analytics?.overview?.disposal_efficiency || 0}%`} 
						color='#4caf50' 
					/>
				</motion.div>

				{/* SUSTAINABILITY INSIGHTS */}
				<motion.div
					className="mb-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200 p-6"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
					<h3 className="text-lg font-semibold text-primary-800 mb-4">📊 Sustainability Insights</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<div className="bg-green-50 p-4 rounded-lg">
							<div className="flex items-center mb-2">
								<Zap className="w-5 h-5 text-green-600 mr-2" />
								<p className="text-green-800 font-medium">Device Health</p>
							</div>
							<p className="text-sm text-green-600">
								{getConditionPercentage('excellent')}% of devices are in excellent condition
							</p>
						</div>
						<div className="bg-blue-50 p-4 rounded-lg">
							<div className="flex items-center mb-2">
								<TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
								<p className="text-blue-800 font-medium">Recent Activity</p>
							</div>
							<p className="text-sm text-blue-600">
								{analytics?.overview?.recent_registrations || 0} devices registered this week
							</p>
						</div>
						<div className="bg-orange-50 p-4 rounded-lg">
							<div className="flex items-center mb-2">
								<AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
								<p className="text-orange-800 font-medium">Maintenance Alert</p>
							</div>
							<p className="text-sm text-orange-600">
								{analytics?.overview?.maintenance_needed || 0} devices need attention
							</p>
						</div>
						<div className="bg-purple-50 p-4 rounded-lg">
							<div className="flex items-center mb-2">
								<Recycle className="w-5 h-5 text-purple-600 mr-2" />
								<p className="text-purple-800 font-medium">E-Waste Management</p>
							</div>
							<p className="text-sm text-purple-600">
								{analytics?.overview?.total_disposal_requests || 0} disposal requests processed
							</p>
						</div>
					</div>
				</motion.div>

				{/* CORE ANALYTICS CHARTS */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
					<SalesOverviewChart monthlyTrend={analytics?.monthly_trend} />
					<CategoryDistributionChart conditionData={analytics?.condition_breakdown} />
				</div>
				
				{/* DEVICE TYPES DISTRIBUTION */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8'>
					<SalesChannelChart deviceTypes={analytics?.device_types} />
					<DisposalAnalyticsChart disposalAnalytics={analytics?.disposal_analytics} />
				</div>

				{/* COMMUNITY AND IPFS ANALYTICS */}
				<div className='grid grid-cols-1 gap-8 mb-8'>
					<CommunityIPFSChart 
						communityAnalytics={analytics?.community_analytics} 
						ipfsAnalytics={analytics?.ipfs_analytics} 
					/>
				</div>
				
				{/* RECENT ACTIVITY */}
				{analytics?.recent_activity && analytics.recent_activity.length > 0 && (
					<motion.div
						className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<div className="flex items-center justify-between mb-4">
							<h2 className='text-lg font-medium text-primary-800'>🔄 Recent Activity</h2>
							<button
								onClick={fetchAnalytics}
								className="px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
							>
								Refresh
							</button>
						</div>
						<div className='space-y-3'>
							{analytics.recent_activity.slice(0, 8).map((activity, index) => (
								<div key={index} className='flex items-center justify-between p-3 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors'>
									<div className='flex-1'>
										<div className="flex items-center gap-2">
											<FileText className="w-4 h-4 text-primary-600" />
											<p className='text-sm font-medium text-primary-800'>
												{activity.device_name} ({activity.device_type})
											</p>
										</div>
										<p className='text-xs text-primary-600 mt-1'>
											{activity.action_description} by {activity.performed_by_name}
											{activity.performed_by_department && activity.performed_by_department !== analytics.overview.department && 
												` (${activity.performed_by_department})`
											}
										</p>
									</div>
									<div className='text-xs text-primary-500'>
										{new Date(activity.performed_at).toLocaleDateString()}
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
