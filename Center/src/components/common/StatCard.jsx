import { motion } from "framer-motion";

const StatCard = ({ name, icon: Icon, value, color }) => {
	// Check if this card should have white film overlay
	const hasWhiteFilm = [
		'Total Requests', 'Pending Review', 'Scheduled Pickups', 'Completed Pickups',
		'Total Users', 'Active Users', 'Admin Users', 'Vendor Users',
		'Total Services', 'Active Services', 'Completed Services', 'Pending Services',
		'Service Requests', 'Service Orders', 'Service Revenue', 'Service Rating',
		'Pending Requests', 'Completed Requests'
	].includes(name);

	return (
		<motion.div
			className='bg-gray-800 bg-opacity-50 backdrop-blur-md overflow-hidden shadow-lg rounded-xl border border-gray-700 relative'
			whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
		>
			{/* White film overlay for specified slabs */}
			{hasWhiteFilm && (
				<div className='absolute inset-0 bg-white bg-opacity-20 rounded-xl pointer-events-none'></div>
			)}
			<div className='px-4 py-5 sm:p-6 relative z-10'>
				<span className='flex items-center text-sm font-medium text-gray-400'>
					<Icon size={20} className='mr-2' style={{ color }} />
					{name}
				</span>
				<p className='mt-1 text-3xl font-semibold text-gray-100'>{value}</p>
			</div>
		</motion.div>
	);
};
export default StatCard;
