import { motion } from "framer-motion";

const StatCard = ({ name, icon: Icon, value, color }) => {
	const isTotalDevices = name && name.toLowerCase().includes("device");
	const isNeedsAttention = name && name.toLowerCase().includes("attention");
	const isFairCondition = name && name.toLowerCase().includes("fair condition");
	const isGoodCondition = name && name.toLowerCase().includes("good condition");
	return (
		<motion.div
			className={`bg-white bg-opacity-90 backdrop-blur-md overflow-hidden shadow-lg rounded-xl border border-primary-200 ${isTotalDevices ? "statcard-green" : ""} ${isNeedsAttention ? "statcard-red" : ""} ${isFairCondition ? "statcard-orange" : ""} ${isGoodCondition ? "statcard-blue" : ""}`}
			whileHover={{ y: -5, boxShadow: "0 25px 50px -12px rgba(76, 175, 80, 0.2)" }}
		>
			<div className='px-4 py-5 sm:p-6'>
				<span className='flex items-center text-sm font-medium text-secondary-600'>
					<Icon size={20} className='mr-2' style={{ color }} />
					{name}
				</span>
				<p className='mt-1 text-3xl font-semibold text-secondary-900'>{value}</p>
			</div>
		</motion.div>
	);
};
export default StatCard;
