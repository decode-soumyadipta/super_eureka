import { UserCheck, UserPlus, UsersIcon, UserX } from "lucide-react";
import { motion } from "framer-motion";

import Header from "../components/common/Header";
import StatCard from "../components/common/StatCard";
import UsersTable from "../components/users/UsersTable";
import UserGrowthChart from "../components/users/UserGrowthChart";
import UserActivityHeatmap from "../components/users/UserActivityHeatmap";
import UserDemographicsChart from "../components/users/UserDemographicsChart";

const userStats = {
	totalUsers: 152845,
	newUsersToday: 243,
	activeUsers: 98520,
	churnRate: "2.4%",
};

const UsersPage = () => {
	return (
		<div className='flex-1 overflow-auto relative z-10'>
			<Header title='Repair Centers' />

			<main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
				{/* STATS */}
				<motion.div
					className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8'
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 1 }}
				>
					<StatCard
						name='Total Repair'
						icon={UsersIcon}
						value={userStats.totalUsers.toLocaleString()}
						color='#4caf50'
					/>
					<StatCard name='Approved Repair' icon={UserPlus} value={userStats.newUsersToday} color='#45a049' />
					<StatCard
						name='Hold Repair'
						icon={UserCheck}
						value={userStats.activeUsers.toLocaleString()}
						color='#388e3c'
					/>
					<StatCard name='Pending Repair' icon={UserX} value={userStats.churnRate} color='#2d5016' />
				</motion.div>

				<UsersTable />

				{/* USER CHARTS */}
				<div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>

				</div>
			</main>
		</div>
	);
};
export default UsersPage;
